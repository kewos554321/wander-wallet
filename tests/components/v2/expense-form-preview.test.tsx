import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react"

vi.mock("next/font/google", () => ({
  Noto_Serif_TC: () => ({ variable: "font-var-serif" }),
  Noto_Sans_TC: () => ({ variable: "font-var-sans" }),
}))
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }))

const mockAuthFetch = vi.fn()
vi.mock("@/components/auth/liff-provider", () => ({
  useAuthFetch: () => mockAuthFetch,
  useLiff: () => ({ user: { id: "u1", preferences: null }, isDevMode: false, canSendMessages: false }),
}))

vi.mock("@/lib/hooks", async (orig) => ({
  ...(await orig()),
  useProjectData: () => ({
    project: { id: "p1", name: "東京", currency: "USD", customRates: null },
    members: [
      { id: "a", displayName: "小雨", userId: "u1", user: { id: "u1" } },
      { id: "b", displayName: "志明", userId: null, user: null },
    ],
    loading: false,
    projectCurrency: "USD",
  }),
}))

vi.mock("@/lib/hooks/useSaveExpense", () => ({
  useSaveExpense: () => ({
    save: vi.fn(),
    remove: vi.fn(),
    saving: false,
    uploadingImage: false,
    deleting: false,
    canNotifyLine: false,
  }),
}))

vi.mock("@/components/v2/expense-form/location-picker-v2", () => ({ LocationPickerV2: () => null }))
vi.mock("@/components/v2/expense-form/v2-image-picker", () => ({ V2ImagePicker: () => null }))
vi.mock("@/lib/geolocation", () => ({ getCurrentLocation: () => Promise.resolve(null) }))

// Native stub so the test can programmatically change the currency.
vi.mock("@/components/ui/currency-select", () => ({
  CurrencySelect: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <select aria-label="幣別" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="USD">USD</option>
      <option value="TWD">TWD</option>
      <option value="JPY">JPY</option>
    </select>
  ),
}))

// Radix Select is replaced above; the V2CurrencyField (settings) isn't used here.
import { ExpenseFormV2 } from "@/components/v2/expense-form/expense-form-v2"

describe("ExpenseFormV2 conversion preview", () => {
  beforeEach(() => {
    mockAuthFetch.mockReset()
    mockAuthFetch.mockImplementation(async (url: string) =>
      url.includes("/api/exchange-rates")
        ? { ok: true, json: async () => ({ rates: { USD: 1, TWD: 31.5, JPY: 150 } }) }
        : { ok: true, json: async () => ({}) },
    )
  })

  it("shows the ≈ settlement preview when a non-settlement currency is chosen", async () => {
    render(<ExpenseFormV2 projectId="p1" mode="create" />)
    fireEvent.change(await screen.findByLabelText("金額"), { target: { value: "1000" } })
    fireEvent.change(screen.getByLabelText("幣別"), { target: { value: "TWD" } })

    const conv = await screen.findByTestId("amount-conversion")
    // 1000 TWD / 31.5 = 31.746 → 31.75 USD
    expect(conv).toHaveTextContent("≈ USD 31.75")
  })

  it("does not show a preview while the currency equals the settlement currency", async () => {
    render(<ExpenseFormV2 projectId="p1" mode="create" />)
    fireEvent.change(await screen.findByLabelText("金額"), { target: { value: "1000" } })
    expect(screen.queryByTestId("amount-conversion")).not.toBeInTheDocument()
  })

  it("lets you override the per-expense rate (方案 A) and flags it 自訂", async () => {
    render(<ExpenseFormV2 projectId="p1" mode="create" />)
    fireEvent.change(await screen.findByLabelText("金額"), { target: { value: "1000" } })
    fireEvent.change(screen.getByLabelText("幣別"), { target: { value: "TWD" } })
    fireEvent.change(await screen.findByLabelText("匯率"), { target: { value: "0.05" } })
    await waitFor(() => expect(screen.getByTestId("amount-conversion")).toHaveTextContent("≈ USD 50.00"))
    expect(screen.getByText("自訂")).toBeInTheDocument()
  })

  it("shows a per-payer ≈ settlement estimate in the payer section", async () => {
    render(<ExpenseFormV2 projectId="p1" mode="create" />)
    fireEvent.change(await screen.findByLabelText("金額"), { target: { value: "1000" } })
    fireEvent.change(screen.getByLabelText("幣別"), { target: { value: "TWD" } })
    const group = await screen.findByRole("group", { name: "付款成員" })
    await waitFor(() => expect(within(group).getByText("≈ USD 31.75")).toBeInTheDocument())
  })
})
