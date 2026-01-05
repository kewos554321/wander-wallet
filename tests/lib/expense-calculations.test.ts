import { describe, it, expect } from "vitest"

/**
 * 費用計算相關的純函數測試
 * 這些測試驗證核心的數學計算邏輯
 */

// 模擬 roundToPrecision 函數（與 settle API 中的實現相同）
function roundToPrecision(value: number, precision: number): number {
  const factor = Math.pow(10, precision)
  return Math.round(value * factor) / factor
}

// 模擬匯率轉換函數
function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: Record<string, number>,
  precision: number
): number {
  if (fromCurrency === toCurrency) return amount
  const fromRate = rates[fromCurrency] || 1
  const toRate = rates[toCurrency] || 1
  const converted = amount * (toRate / fromRate)
  return roundToPrecision(converted, precision)
}

// 模擬計算每人應付金額
function calculateSharePerPerson(
  totalAmount: number,
  participantCount: number,
  precision: number
): number {
  const perPerson = totalAmount / participantCount
  return roundToPrecision(perPerson, precision)
}

// 模擬結算計算
interface Balance {
  memberId: string
  displayName: string
  balance: number
  totalPaid: number
  totalShare: number
}

interface Settlement {
  from: { memberId: string; displayName: string }
  to: { memberId: string; displayName: string }
  amount: number
}

function calculateOptimalSettlements(
  balances: Balance[],
  precision: number
): Settlement[] {
  const settlements: Settlement[] = []
  const debtors = balances
    .filter((b) => b.balance < -0.001)
    .map((b) => ({ ...b, balance: b.balance }))
    .sort((a, b) => a.balance - b.balance)
  const creditors = balances
    .filter((b) => b.balance > 0.001)
    .map((b) => ({ ...b, balance: b.balance }))
    .sort((a, b) => b.balance - a.balance)

  let i = 0,
    j = 0
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i]
    const creditor = creditors[j]
    const amount = Math.min(-debtor.balance, creditor.balance)

    if (amount > 0.001) {
      settlements.push({
        from: { memberId: debtor.memberId, displayName: debtor.displayName },
        to: { memberId: creditor.memberId, displayName: creditor.displayName },
        amount: roundToPrecision(amount, precision),
      })
    }

    debtor.balance += amount
    creditor.balance -= amount

    if (Math.abs(debtor.balance) < 0.001) i++
    if (Math.abs(creditor.balance) < 0.001) j++
  }

  return settlements
}

describe("roundToPrecision", () => {
  it("should round to 0 decimal places", () => {
    expect(roundToPrecision(123.456, 0)).toBe(123)
    expect(roundToPrecision(123.567, 0)).toBe(124)
    expect(roundToPrecision(123.5, 0)).toBe(124)
  })

  it("should round to 2 decimal places", () => {
    expect(roundToPrecision(123.456, 2)).toBe(123.46)
    expect(roundToPrecision(123.454, 2)).toBe(123.45)
    expect(roundToPrecision(123.455, 2)).toBe(123.46)
  })

  it("should round to 4 decimal places", () => {
    expect(roundToPrecision(0.123456, 4)).toBe(0.1235)
    expect(roundToPrecision(0.123454, 4)).toBe(0.1235)
  })

  it("should round to 8 decimal places", () => {
    expect(roundToPrecision(0.123456789, 8)).toBe(0.12345679)
  })

  it("should handle negative numbers", () => {
    expect(roundToPrecision(-123.456, 2)).toBe(-123.46)
    expect(roundToPrecision(-123.454, 2)).toBe(-123.45)
  })

  it("should handle zero", () => {
    expect(roundToPrecision(0, 2)).toBe(0)
    expect(roundToPrecision(0.001, 2)).toBe(0)
    expect(roundToPrecision(0.005, 2)).toBe(0.01)
  })
})

describe("convertCurrency", () => {
  const rates = {
    USD: 1,
    TWD: 32,
    JPY: 150,
    EUR: 0.92,
  }

  it("should return same amount when currencies match", () => {
    expect(convertCurrency(100, "USD", "USD", rates, 2)).toBe(100)
    expect(convertCurrency(1000, "TWD", "TWD", rates, 2)).toBe(1000)
  })

  it("should convert USD to TWD correctly", () => {
    // 100 USD * (32 / 1) = 3200 TWD
    expect(convertCurrency(100, "USD", "TWD", rates, 2)).toBe(3200)
  })

  it("should convert TWD to USD correctly", () => {
    // 3200 TWD * (1 / 32) = 100 USD
    expect(convertCurrency(3200, "TWD", "USD", rates, 2)).toBe(100)
  })

  it("should convert JPY to TWD correctly", () => {
    // 15000 JPY * (32 / 150) = 3200 TWD
    expect(convertCurrency(15000, "JPY", "TWD", rates, 2)).toBe(3200)
  })

  it("should apply precision correctly", () => {
    // 100 JPY * (32 / 150) = 21.3333...
    expect(convertCurrency(100, "JPY", "TWD", rates, 0)).toBe(21)
    expect(convertCurrency(100, "JPY", "TWD", rates, 2)).toBe(21.33)
    expect(convertCurrency(100, "JPY", "TWD", rates, 4)).toBe(21.3333)
  })

  it("should handle fractional amounts", () => {
    // 0.5 USD * 32 = 16 TWD
    expect(convertCurrency(0.5, "USD", "TWD", rates, 2)).toBe(16)
  })

  it("should handle very small amounts with high precision", () => {
    // 0.001 USD * 32 = 0.032 TWD
    expect(convertCurrency(0.001, "USD", "TWD", rates, 4)).toBe(0.032)
  })
})

describe("calculateSharePerPerson", () => {
  it("should split evenly when divisible", () => {
    expect(calculateSharePerPerson(1000, 2, 2)).toBe(500)
    expect(calculateSharePerPerson(900, 3, 2)).toBe(300)
    expect(calculateSharePerPerson(1200, 4, 2)).toBe(300)
  })

  it("should round correctly when not evenly divisible", () => {
    // 1000 / 3 = 333.333...
    expect(calculateSharePerPerson(1000, 3, 2)).toBe(333.33)
    expect(calculateSharePerPerson(1000, 3, 0)).toBe(333)
    expect(calculateSharePerPerson(1000, 3, 4)).toBe(333.3333)
  })

  it("should handle precision 0 for currencies like TWD, JPY", () => {
    // 1000 / 3 = 333.333... -> 333
    expect(calculateSharePerPerson(1000, 3, 0)).toBe(333)
    // 1001 / 3 = 333.666... -> 334
    expect(calculateSharePerPerson(1001, 3, 0)).toBe(334)
  })

  it("should handle single participant", () => {
    expect(calculateSharePerPerson(1000, 1, 2)).toBe(1000)
  })

  it("should handle large groups", () => {
    // 10000 / 7 = 1428.571...
    expect(calculateSharePerPerson(10000, 7, 2)).toBe(1428.57)
  })
})

describe("calculateOptimalSettlements", () => {
  it("should return empty array when no balances", () => {
    const settlements = calculateOptimalSettlements([], 2)
    expect(settlements).toEqual([])
  })

  it("should return empty array when all balanced", () => {
    const balances: Balance[] = [
      { memberId: "1", displayName: "A", balance: 0, totalPaid: 500, totalShare: 500 },
      { memberId: "2", displayName: "B", balance: 0, totalPaid: 500, totalShare: 500 },
    ]
    const settlements = calculateOptimalSettlements(balances, 2)
    expect(settlements).toEqual([])
  })

  it("should calculate simple two-person settlement", () => {
    const balances: Balance[] = [
      { memberId: "1", displayName: "Alice", balance: 500, totalPaid: 1000, totalShare: 500 },
      { memberId: "2", displayName: "Bob", balance: -500, totalPaid: 0, totalShare: 500 },
    ]
    const settlements = calculateOptimalSettlements(balances, 2)

    expect(settlements).toHaveLength(1)
    expect(settlements[0].from.memberId).toBe("2")
    expect(settlements[0].to.memberId).toBe("1")
    expect(settlements[0].amount).toBe(500)
  })

  it("should handle three-person settlement", () => {
    // A paid 1500, B paid 0, C paid 0
    // Each owes 500
    // A: +1000, B: -500, C: -500
    const balances: Balance[] = [
      { memberId: "1", displayName: "A", balance: 1000, totalPaid: 1500, totalShare: 500 },
      { memberId: "2", displayName: "B", balance: -500, totalPaid: 0, totalShare: 500 },
      { memberId: "3", displayName: "C", balance: -500, totalPaid: 0, totalShare: 500 },
    ]
    const settlements = calculateOptimalSettlements(balances, 2)

    expect(settlements).toHaveLength(2)
    // Total settlement should equal 1000
    const totalSettlement = settlements.reduce((sum, s) => sum + s.amount, 0)
    expect(totalSettlement).toBe(1000)
  })

  it("should minimize number of transactions", () => {
    // Complex scenario:
    // A: +300, B: +200, C: -250, D: -250
    const balances: Balance[] = [
      { memberId: "1", displayName: "A", balance: 300, totalPaid: 500, totalShare: 200 },
      { memberId: "2", displayName: "B", balance: 200, totalPaid: 400, totalShare: 200 },
      { memberId: "3", displayName: "C", balance: -250, totalPaid: 0, totalShare: 250 },
      { memberId: "4", displayName: "D", balance: -250, totalPaid: 0, totalShare: 250 },
    ]
    const settlements = calculateOptimalSettlements(balances, 2)

    // Should be optimized to minimize transactions
    expect(settlements.length).toBeLessThanOrEqual(3)

    // Total credits should equal total debts
    const totalCredits = balances.filter((b) => b.balance > 0).reduce((sum, b) => sum + b.balance, 0)
    const totalDebts = balances.filter((b) => b.balance < 0).reduce((sum, b) => sum + Math.abs(b.balance), 0)
    expect(totalCredits).toBe(totalDebts)
  })

  it("should apply precision to settlement amounts", () => {
    // Create scenario that results in fractional settlement
    const balances: Balance[] = [
      { memberId: "1", displayName: "A", balance: 333.33, totalPaid: 1000, totalShare: 666.67 },
      { memberId: "2", displayName: "B", balance: -333.33, totalPaid: 0, totalShare: 333.33 },
    ]
    const settlements = calculateOptimalSettlements(balances, 2)

    expect(settlements).toHaveLength(1)
    expect(settlements[0].amount).toBe(333.33)
  })

  it("should handle very small imbalances", () => {
    // Imbalance less than threshold should be ignored
    const balances: Balance[] = [
      { memberId: "1", displayName: "A", balance: 0.0001, totalPaid: 500, totalShare: 499.9999 },
      { memberId: "2", displayName: "B", balance: -0.0001, totalPaid: 500, totalShare: 500.0001 },
    ]
    const settlements = calculateOptimalSettlements(balances, 2)

    expect(settlements).toHaveLength(0)
  })
})

describe("expense calculation scenarios", () => {
  describe("equal split scenarios", () => {
    it("should calculate equal split for 2 people", () => {
      const amount = 1000
      const participants = 2
      const precision = 2

      const sharePerPerson = calculateSharePerPerson(amount, participants, precision)
      expect(sharePerPerson).toBe(500)

      // Total shares should equal original amount
      expect(sharePerPerson * participants).toBe(amount)
    })

    it("should handle rounding in equal split for 3 people", () => {
      const amount = 1000
      const participants = 3
      const precision = 2

      const sharePerPerson = calculateSharePerPerson(amount, participants, precision)
      expect(sharePerPerson).toBe(333.33)

      // Note: Total shares will be slightly less due to rounding
      const totalShares = sharePerPerson * participants
      expect(totalShares).toBe(999.99) // 333.33 * 3 = 999.99
    })

    it("should handle TWD (0 decimals) split for 3 people", () => {
      const amount = 1000
      const participants = 3
      const precision = 0

      const sharePerPerson = calculateSharePerPerson(amount, participants, precision)
      expect(sharePerPerson).toBe(333)

      // Total: 333 * 3 = 999 (1 TWD difference)
      const totalShares = sharePerPerson * participants
      expect(totalShares).toBe(999)
    })
  })

  describe("multi-currency scenarios", () => {
    const rates = {
      USD: 1,
      TWD: 32,
      JPY: 150,
    }

    it("should convert and settle mixed currency expenses", () => {
      // Expense 1: 100 USD paid by A, split between A and B
      // Expense 2: 3200 TWD paid by B, split between A and B
      const projectCurrency = "TWD"
      const precision = 2

      // Convert expense 1 to project currency
      const expense1InTWD = convertCurrency(100, "USD", projectCurrency, rates, precision)
      expect(expense1InTWD).toBe(3200)

      // Expense 2 is already in TWD
      const expense2InTWD = 3200

      // Total: 6400 TWD, each person's share: 3200 TWD
      const totalAmount = expense1InTWD + expense2InTWD
      const sharePerPerson = calculateSharePerPerson(totalAmount, 2, precision)
      expect(sharePerPerson).toBe(3200)

      // A paid 3200, owes 3200, balance = 0
      // B paid 3200, owes 3200, balance = 0
      // Everyone is balanced
    })

    it("should handle JPY to TWD conversion with precision", () => {
      // 10000 JPY expense split between 3 people
      const projectCurrency = "TWD"

      // Test with different precisions
      const amountInTWD_p0 = convertCurrency(10000, "JPY", projectCurrency, rates, 0)
      const amountInTWD_p2 = convertCurrency(10000, "JPY", projectCurrency, rates, 2)
      const amountInTWD_p4 = convertCurrency(10000, "JPY", projectCurrency, rates, 4)

      // 10000 * (32/150) = 2133.333...
      expect(amountInTWD_p0).toBe(2133)
      expect(amountInTWD_p2).toBe(2133.33)
      expect(amountInTWD_p4).toBe(2133.3333)

      // Split between 3 people
      const shareP0 = calculateSharePerPerson(amountInTWD_p0, 3, 0)
      const shareP2 = calculateSharePerPerson(amountInTWD_p2, 3, 2)
      const shareP4 = calculateSharePerPerson(amountInTWD_p4, 3, 4)

      // 2133 / 3 = 711
      expect(shareP0).toBe(711)
      // 2133.33 / 3 = 711.11
      expect(shareP2).toBe(711.11)
      // 2133.3333 / 3 = 711.1111
      expect(shareP4).toBe(711.1111)
    })
  })

  describe("complex settlement scenarios", () => {
    it("should settle multi-expense multi-payer scenario", () => {
      // Scenario: Trip with 3 people (A, B, C)
      // Expense 1: A pays 900, split equally (300 each)
      // Expense 2: B pays 600, split equally (200 each)
      // Expense 3: C pays 300, split equally (100 each)
      // Total: 1800, each owes 600

      const precision = 2

      // Calculate balances
      // A: paid 900, owes 600, balance = +300
      // B: paid 600, owes 600, balance = 0
      // C: paid 300, owes 600, balance = -300

      const balances: Balance[] = [
        { memberId: "A", displayName: "Alice", balance: 300, totalPaid: 900, totalShare: 600 },
        { memberId: "B", displayName: "Bob", balance: 0, totalPaid: 600, totalShare: 600 },
        { memberId: "C", displayName: "Charlie", balance: -300, totalPaid: 300, totalShare: 600 },
      ]

      const settlements = calculateOptimalSettlements(balances, precision)

      expect(settlements).toHaveLength(1)
      expect(settlements[0].from.memberId).toBe("C")
      expect(settlements[0].to.memberId).toBe("A")
      expect(settlements[0].amount).toBe(300)
    })

    it("should handle everyone-owes-one-person scenario", () => {
      // One person paid everything
      // A pays 3000, B and C paid nothing
      // Split equally: 1000 each
      // A: +2000, B: -1000, C: -1000

      const balances: Balance[] = [
        { memberId: "A", displayName: "Alice", balance: 2000, totalPaid: 3000, totalShare: 1000 },
        { memberId: "B", displayName: "Bob", balance: -1000, totalPaid: 0, totalShare: 1000 },
        { memberId: "C", displayName: "Charlie", balance: -1000, totalPaid: 0, totalShare: 1000 },
      ]

      const settlements = calculateOptimalSettlements(balances, 2)

      expect(settlements).toHaveLength(2)

      // B and C should pay A
      const totalToA = settlements
        .filter((s) => s.to.memberId === "A")
        .reduce((sum, s) => sum + s.amount, 0)
      expect(totalToA).toBe(2000)
    })

    it("should handle chain settlement (A owes B owes C)", () => {
      // A: -500, B: +200, C: +300
      const balances: Balance[] = [
        { memberId: "A", displayName: "Alice", balance: -500, totalPaid: 0, totalShare: 500 },
        { memberId: "B", displayName: "Bob", balance: 200, totalPaid: 600, totalShare: 400 },
        { memberId: "C", displayName: "Charlie", balance: 300, totalPaid: 400, totalShare: 100 },
      ]

      const settlements = calculateOptimalSettlements(balances, 2)

      // Should optimize to minimize transactions
      const totalSettled = settlements.reduce((sum, s) => sum + s.amount, 0)
      expect(totalSettled).toBe(500) // Total debt = 500
    })
  })
})
