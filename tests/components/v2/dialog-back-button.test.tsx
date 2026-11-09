import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from "vitest"
import { act, render } from "@testing-library/react"

vi.mock("next/font/google", () => ({
  Noto_Serif_TC: () => ({ variable: "font-var-serif" }),
  Noto_Sans_TC: () => ({ variable: "font-var-sans" }),
}))
vi.mock("@/components/auth/liff-provider", () => ({ useAuthFetch: () => vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }) }))

import { DEMO_MEMBERS } from "@/app/demo/_data/fixtures"
import { useExpenseDraft, type DraftExpense } from "@/components/v2/expense-form/use-expense-draft"
import type { SettleData } from "@/lib/hooks/useSettlement"
import { SettlementCalcDialog } from "@/components/v2/settle/settle-calc-dialog"
import { SettleShareDialog } from "@/components/v2/settle/settle-share-dialog"
import { CurrencySourceSheet } from "@/components/v2/currency/currency-source-sheet"
import { ProfileV2View } from "@/components/v2/settings/profile-v2-view"
import { RateSheet } from "@/components/v2/expense-form/rate-sheet"
import { AmountSheet } from "@/components/v2/expense-form/amount-sheet"
import { SplitDetailSheet } from "@/components/v2/expense-form/split-detail-sheet"
import { PersonalItemsSheet } from "@/components/v2/expense-form/personal-items-sheet"

const SEED: DraftExpense = {
  amount: 1280,
  currency: "JPY",
  exchangeRate: null,
  rateKind: null,
  rateDate: null,
  description: "拉麵",
  category: "food",
  payers: [{ memberId: "me", amount: 1280 }],
  expenseDate: "2026-10-11",
  location: null,
  latitude: null,
  longitude: null,
  image: null,
  participants: DEMO_MEMBERS.map((member) => ({ memberId: member.id, shareAmount: 320 })),
  splitDetail: null,
}

function useDraft() {
  return useExpenseDraft(
    { members: DEMO_MEMBERS, currency: "JPY", projectCurrency: "TWD", paidBy: "me", expense: SEED },
    () => ({ rate: 0.215, source: "live" }),
  )
}

function DraftSheet({
  Sheet,
  onClose,
}: {
  Sheet: typeof AmountSheet | typeof SplitDetailSheet | typeof PersonalItemsSheet
  onClose: () => void
}) {
  const draft = useDraft()
  return <Sheet open onClose={onClose} members={DEMO_MEMBERS} draft={draft} memberId="me" />
}

function settleData(): SettleData {
  return {
    balances: [],
    settlements: [],
    expenseDetails: [],
    summary: { totalExpenses: 0, totalAmount: 0, totalShared: 0, isBalanced: true, currency: "TWD" },
  }
}

function pressBack() {
  act(() => {
    window.dispatchEvent(new PopStateEvent("popstate", { state: null }))
  })
}

let backMock: MockInstance

beforeEach(() => {
  window.history.replaceState(null, "")
  backMock = vi.spyOn(window.history, "back").mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("dialogs close on the phone back button", () => {
  it("SettlementCalcDialog", () => {
    const onOpenChange = vi.fn()
    render(<SettlementCalcDialog open onOpenChange={onOpenChange} data={settleData()} />)
    pressBack()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("SettleShareDialog", () => {
    const onOpenChange = vi.fn()
    render(<SettleShareDialog open onOpenChange={onOpenChange} shareText="結算結果" />)
    pressBack()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("CurrencySourceSheet", () => {
    const onClose = vi.fn()
    render(
      <CurrencySourceSheet
        open
        onClose={onClose}
        dataDate={null}
        usingFallback={false}
        ratesError={null}
        loading={false}
        onRefresh={vi.fn()}
      />
    )
    pressBack()
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("ProfileV2View logout dialog", () => {
    const onLogoutOpenChange = vi.fn()
    render(
      <ProfileV2View
        name="小雨"
        image={null}
        logoutOpen
        onLogoutOpenChange={onLogoutOpenChange}
        onLogout={vi.fn()}
      />
    )
    pressBack()
    expect(onLogoutOpenChange).toHaveBeenCalledWith(false)
  })

  it("RateSheet", () => {
    const onClose = vi.fn()
    render(
      <RateSheet
        open
        onClose={onClose}
        fromCurrency="JPY"
        toCurrency="TWD"
        rate={null}
        customRate={false}
        liveRate={0.215}
        recentRates={[]}
        onUseRate={vi.fn()}
        onReset={vi.fn()}
      />
    )
    pressBack()
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("AmountSheet", () => {
    const onClose = vi.fn()
    render(<DraftSheet Sheet={AmountSheet} onClose={onClose} />)
    pressBack()
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("SplitDetailSheet", () => {
    const onClose = vi.fn()
    render(<DraftSheet Sheet={SplitDetailSheet} onClose={onClose} />)
    pressBack()
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("PersonalItemsSheet", () => {
    const onClose = vi.fn()
    render(<DraftSheet Sheet={PersonalItemsSheet} onClose={onClose} />)
    pressBack()
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("pops the pushed entry when the parent closes the dialog", () => {
    const onOpenChange = vi.fn()
    const { rerender } = render(<SettleShareDialog open onOpenChange={onOpenChange} shareText="x" />)
    rerender(<SettleShareDialog open={false} onOpenChange={onOpenChange} shareText="x" />)
    expect(backMock).toHaveBeenCalledTimes(1)
  })
})
