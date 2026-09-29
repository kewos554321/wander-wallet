import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, within } from "@testing-library/react"
import type { OverviewProject, ProjectSummary } from "@/lib/project-overview"

vi.mock("next/font/google", () => ({
  Noto_Serif_TC: () => ({ variable: "font-var-serif" }),
  Noto_Sans_TC: () => ({ variable: "font-var-sans" }),
}))
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock("@/components/auth/liff-provider", () => ({
  useLiff: () => ({ user: { id: "u1" } }),
  useAuthFetch: () => vi.fn(),
}))
vi.mock("@/components/v2/quick-expense/quick-expense-v2", () => ({ QuickExpenseV2: () => null }))

const mockOverview = vi.fn()
vi.mock("@/lib/hooks/useProjectOverview", () => ({ useProjectOverview: () => mockOverview() }))

import { ProjectOverviewV2View } from "@/components/v2/project/project-overview-v2-view"
import { ProjectOverviewV2 } from "@/components/v2/project/project-overview-v2"

const local = (m: number, d: number) => new Date(2026, m - 1, d, 12).toISOString()

const project: OverviewProject = {
  id: "p1",
  name: "東京賞楓 5 日",
  description: null,
  budget: "76000",
  currency: "TWD",
  exchangeRatePrecision: 2,
  startDate: local(11, 12),
  endDate: local(11, 16),
  customRates: null,
  creator: { id: "u1", name: "Emma", email: "e@x.com" },
  members: [
    { id: "me", role: "owner", displayName: "Emma", user: { id: "u1", name: "Emma", email: "e@x.com", image: null } },
    { id: "chi", role: "member", displayName: "志明", user: null },
  ],
  expenses: [
    {
      id: "e1",
      amount: 1280,
      currency: "TWD",
      description: "一蘭拉麵晚餐",
      category: "food",
      createdAt: local(11, 16),
      payer: { id: "chi", displayName: "志明", user: null },
      participants: [
        { id: "p1", memberId: "me", shareAmount: 640 },
        { id: "p2", memberId: "chi", shareAmount: 640 },
      ],
    },
    {
      id: "e2",
      amount: 320,
      currency: "TWD",
      description: null,
      category: "shopping",
      createdAt: local(11, 15),
      payer: { id: "me", displayName: "Emma", user: null },
      participants: [{ id: "p3", memberId: "me", shareAmount: 320 }],
    },
  ],
}

const summary: ProjectSummary = {
  totalAmount: 48600,
  perPerson: 24300,
  budget: 76000,
  budgetProgress: 63.9,
  budgetRemaining: 27400,
  userBalance: 4820,
  hasMixedCurrencies: false,
  currentMemberId: "me",
}

describe("ProjectOverviewV2View", () => {
  it("renders header, totals, budget and balance", () => {
    render(<ProjectOverviewV2View project={project} summary={summary} onShare={vi.fn()} onVoice={vi.fn()} onCamera={vi.fn()} />)
    expect(screen.getByRole("heading", { name: "東京賞楓 5 日" })).toBeInTheDocument()
    expect(screen.getByText("11/12 – 11/16 · 2 位旅伴")).toBeInTheDocument()
    expect(screen.getByText("TWD 48,600")).toBeInTheDocument()
    expect(screen.getByText("平均每人 TWD 24,300")).toBeInTheDocument()
    expect(screen.getByText("64%")).toBeInTheDocument()
    expect(screen.getByText("TWD 48,600 ／ TWD 76,000（剩餘 TWD 27,400）")).toBeInTheDocument()
    expect(screen.getByText("+TWD 4,820")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /查看結算明細/ })).toHaveAttribute("href", "/projects/p1/settle")
  })

  it("shows overspending instead of a negative remainder", () => {
    render(
      <ProjectOverviewV2View
        project={project}
        summary={{ ...summary, totalAmount: 80000, budgetProgress: 100, budgetRemaining: -4000 }}
        onShare={vi.fn()}
        onVoice={vi.fn()}
        onCamera={vi.fn()}
      />
    )
    expect(screen.getByText("100%")).toBeInTheDocument()
    expect(screen.getByText("TWD 80,000 ／ TWD 76,000（超支 TWD 4,000）")).toBeInTheDocument()
  })

  it("hides the budget bar without a budget and formats negative balances", () => {
    render(
      <ProjectOverviewV2View
        project={{ ...project, budget: null }}
        summary={{ ...summary, budget: null, budgetProgress: 0, budgetRemaining: null, userBalance: -1200.4 }}
        onShare={vi.fn()}
        onVoice={vi.fn()}
        onCamera={vi.fn()}
      />
    )
    expect(screen.queryByText(/％|%/)).not.toBeInTheDocument()
    expect(screen.getByText("−TWD 1,200")).toBeInTheDocument()
  })

  it("toggles the balance explanation", () => {
    render(<ProjectOverviewV2View project={project} summary={summary} onShare={vi.fn()} onVoice={vi.fn()} onCamera={vi.fn()} />)
    const info = "＝你付的錢－你應付的錢，正數代表有旅伴欠你款項"
    expect(screen.queryByText(info)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "說明餘額計算方式" }))
    expect(screen.getByText(info)).toBeInTheDocument()
  })

  it("links all 11 features", () => {
    render(<ProjectOverviewV2View project={project} summary={summary} onShare={vi.fn()} onVoice={vi.fn()} onCamera={vi.fn()} />)
    const grid = screen.getByRole("navigation", { name: "功能" })
    const expected: [string, string][] = [
      ["結算", "settle"],
      ["成員", "members"],
      ["統計", "stats"],
      ["匯出", "export"],
      ["設定", "settings"],
      ["歷史", "activity-logs"],
      ["里程", "mileage"],
      ["匯率", "currency"],
      ["筆記", "notes"],
      ["地圖", "map"],
      ["照片", "photos"],
    ]
    for (const [label, path] of expected) {
      expect(within(grid).getByRole("link", { name: label })).toHaveAttribute("href", `/projects/p1/${path}`)
    }
  })

  it("lists recent expenses with payer and split count", () => {
    render(<ProjectOverviewV2View project={project} summary={summary} onShare={vi.fn()} onVoice={vi.fn()} onCamera={vi.fn()} />)
    expect(screen.getByText("一蘭拉麵晚餐")).toBeInTheDocument()
    expect(screen.getByText("志明 付款 · 2 人分攤")).toBeInTheDocument()
    expect(screen.getByText("我 付款 · 1 人分攤")).toBeInTheDocument()
    expect(screen.getByText("購物")).toBeInTheDocument() // description fallback to category label
    expect(screen.getByRole("link", { name: "查看全部" })).toHaveAttribute("href", "/projects/p1/expenses")
  })

  it("shows an empty state without expenses", () => {
    render(<ProjectOverviewV2View project={{ ...project, expenses: [] }} summary={summary} onShare={vi.fn()} onVoice={vi.fn()} onCamera={vi.fn()} />)
    expect(screen.getByText("還沒有支出，點右下角開始記帳")).toBeInTheDocument()
  })

  it("wires share, voice, camera and add actions", () => {
    const onShare = vi.fn()
    const onVoice = vi.fn()
    const onCamera = vi.fn()
    render(<ProjectOverviewV2View project={project} summary={summary} onShare={onShare} onVoice={onVoice} onCamera={onCamera} />)
    fireEvent.click(screen.getByRole("button", { name: "分享" }))
    fireEvent.click(screen.getByRole("button", { name: /AI 快速記帳/ }))
    fireEvent.click(screen.getByRole("button", { name: /拍照記帳/ }))
    expect(onShare).toHaveBeenCalled()
    expect(onVoice).toHaveBeenCalled()
    expect(onCamera).toHaveBeenCalled()
    expect(screen.getByRole("link", { name: "手動新增支出" })).toHaveAttribute("href", "/projects/p1/expenses/new")
  })
})

describe("ProjectOverviewV2 container", () => {
  beforeEach(() => mockOverview.mockReset())

  it("shows the join dialog for non-members", () => {
    mockOverview.mockReturnValue({
      project: null,
      loading: false,
      joinInfo: { name: "東京", description: null, joinMode: "create_only", unclaimedMembers: [] },
      joining: false,
      joinProject: vi.fn(),
      claimMember: vi.fn(),
      refetch: vi.fn(),
      summary: null,
    })
    render(<ProjectOverviewV2 projectId="p1" />)
    expect(screen.getByText("加入「東京」")).toBeInTheDocument()
  })

  it("shows not-found when there is no project", () => {
    mockOverview.mockReturnValue({
      project: null,
      loading: false,
      joinInfo: null,
      joining: false,
      joinProject: vi.fn(),
      claimMember: vi.fn(),
      refetch: vi.fn(),
      summary: null,
    })
    render(<ProjectOverviewV2 projectId="p1" />)
    expect(screen.getByText("專案不存在")).toBeInTheDocument()
  })

  it("shows a skeleton while loading", () => {
    mockOverview.mockReturnValue({
      project: null,
      loading: true,
      joinInfo: null,
      joining: false,
      joinProject: vi.fn(),
      claimMember: vi.fn(),
      refetch: vi.fn(),
      summary: null,
    })
    render(<ProjectOverviewV2 projectId="p1" />)
    expect(screen.getByTestId("v2-overview-skeleton")).toBeInTheDocument()
  })
})
