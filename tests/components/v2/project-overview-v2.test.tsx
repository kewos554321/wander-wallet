import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, within } from "@testing-library/react"
import type { OverviewProject, ProjectSummary } from "@/lib/project-overview"

vi.mock("next/font/google", () => ({
  Noto_Serif_TC: () => ({ variable: "font-var-serif" }),
  Noto_Sans_TC: () => ({ variable: "font-var-sans" }),
}))
const routerPush = vi.hoisted(() => vi.fn())
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: routerPush }) }))
const liff = vi.hoisted(() => ({
  user: { id: "u1" } as { id: string; name?: string | null; image?: string | null },
}))
vi.mock("@/components/auth/liff-provider", () => ({
  useLiff: () => ({ user: liff.user }),
  useAuthFetch: () => vi.fn(),
}))
const quickExpenseProps = vi.hoisted(() => ({ current: null as Record<string, unknown> | null }))
vi.mock("@/components/v2/quick-expense/quick-expense-v2", () => ({
  QuickExpenseV2: (props: Record<string, unknown>) => {
    quickExpenseProps.current = props
    return (
      <div data-testid="quick-expense-stub">
        <span data-testid="qe-open">{String(props.open)}</span>
        <span data-testid="qe-initial-step">{String(props.initialStep)}</span>
        <button type="button" onClick={() => (props.onOpenChange as (open: boolean) => void)(false)}>
          stub-qe-close
        </button>
        <button type="button" onClick={() => (props.onSuccess as () => void)?.()}>
          stub-qe-success
        </button>
      </div>
    )
  },
}))

const mockOverview = vi.fn()
vi.mock("@/lib/hooks/useProjectOverview", () => ({ useProjectOverview: () => mockOverview() }))

import { ProjectOverviewV2View } from "@/components/v2/project/project-overview-v2-view"
import { ProjectOverviewV2 } from "@/components/v2/project/project-overview-v2"

const local = (m: number, d: number) => new Date(2026, m - 1, d, 12).toISOString()

const project: OverviewProject = {
  id: "p1",
  name: "東京賞楓 5 日",
  description: null,
  cover: "icon:camera;color:lake",
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
      payers: [{ memberId: "chi", amount: 1280 }],
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
      payers: [{ memberId: "me", amount: 320 }],
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
    render(<ProjectOverviewV2View project={project} summary={summary} onShare={vi.fn()} onVoice={vi.fn()} />)
    expect(screen.getByRole("heading", { name: "東京賞楓 5 日" })).toBeInTheDocument()
    expect(screen.getByText("11/12 – 11/16 · 2 位旅伴")).toBeInTheDocument()
    expect(screen.getByText("TWD 48,600")).toBeInTheDocument()
    expect(screen.getByText("平均每人 TWD 24,300")).toBeInTheDocument()
    expect(screen.getByText("64%")).toBeInTheDocument()
    expect(screen.getByText("TWD 48,600 ／ TWD 76,000（剩餘 TWD 27,400）")).toBeInTheDocument()
    expect(screen.getByText("+TWD 4,820")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /查看結算明細/ })).toHaveAttribute("href", "/projects/p1/settle")
  })

  it("uses the project cover icon on the trip summary card", () => {
    render(<ProjectOverviewV2View project={project} summary={summary} onShare={vi.fn()} onVoice={vi.fn()} />)
    const card = screen.getByTestId("v2-trip-summary-card")
    expect(within(card).getByTestId("trip-summary-decoration")).toHaveAttribute("data-cover", "camera")
  })

  it("falls back to the sparkle decoration without an icon cover", () => {
    render(
      <ProjectOverviewV2View
        project={{ ...project, cover: null }}
        summary={summary}
        onShare={vi.fn()}
        onVoice={vi.fn()}
      />
    )
    const card = screen.getByTestId("v2-trip-summary-card")
    expect(within(card).getByTestId("trip-summary-decoration")).toHaveAttribute("data-cover", "sparkles")
  })

  it("shows overspending instead of a negative remainder", () => {
    render(
      <ProjectOverviewV2View
        project={project}
        summary={{ ...summary, totalAmount: 80000, budgetProgress: 100, budgetRemaining: -4000 }}
        onShare={vi.fn()}
        onVoice={vi.fn()}
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
      />
    )
    expect(screen.queryByText(/％|%/)).not.toBeInTheDocument()
    expect(screen.getByText("−TWD 1,200")).toBeInTheDocument()
  })

  it("toggles the balance explanation", () => {
    render(<ProjectOverviewV2View project={project} summary={summary} onShare={vi.fn()} onVoice={vi.fn()} />)
    const info = "＝你付的錢－你應付的錢，正數代表有旅伴欠你款項"
    expect(screen.queryByText(info)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "說明餘額計算方式" }))
    expect(screen.getByText(info)).toBeInTheDocument()
  })

  it("links all ten features", () => {
    render(<ProjectOverviewV2View project={project} summary={summary} onShare={vi.fn()} onVoice={vi.fn()} />)
    const grid = screen.getByRole("navigation", { name: "功能" })
    const primary: [string, string][] = [
      ["結算", "settle"],
      ["成員", "members"],
      ["統計", "stats"],
      ["匯率", "currency"],
    ]
    for (const [label, path] of primary) {
      expect(within(grid).getByRole("link", { name: label })).toHaveAttribute("href", `/projects/p1/${path}`)
    }

    fireEvent.click(within(grid).getByRole("button", { name: "更多功能" }))
    const secondary: [string, string][] = [
      ["歷史", "activity-logs"],
      ["里程", "mileage"],
      ["匯出", "export"],
      ["筆記", "notes"],
      ["地圖", "map"],
      ["照片", "photos"],
    ]
    for (const [label, path] of secondary) {
      expect(within(grid).getByRole("link", { name: label })).toHaveAttribute("href", `/projects/p1/${path}`)
    }
    expect(within(grid).queryByRole("link", { name: "設定" })).not.toBeInTheDocument()
  })

  it("lists recent expenses with payer and split avatars", () => {
    render(<ProjectOverviewV2View project={project} summary={summary} onShare={vi.fn()} onVoice={vi.fn()} />)
    const card = screen.getByTestId("v2-recent-expenses-card")
    expect(within(card).getByText("最近支出")).toBeInTheDocument()
    expect(within(card).getByRole("link", { name: "查看全部" })).toHaveAttribute("href", "/projects/p1/expenses")
    expect(screen.getByText("一蘭拉麵晚餐")).toBeInTheDocument()
    expect(screen.getByText("志明付款")).toBeInTheDocument()
    expect(screen.getByText("我付款")).toBeInTheDocument()
    expect(screen.getByText("共2人分攤")).toBeInTheDocument()
    expect(screen.getByText("共1人分攤")).toBeInTheDocument()
    expect(screen.getByText("購物")).toBeInTheDocument() // description fallback to category label
  })

  it("shows a compact multi-payer label with the primary payer and payer count", () => {
    const multiPayer: OverviewProject["expenses"][number] = {
      id: "e3",
      amount: 1280,
      currency: "TWD",
      description: "共同出資",
      category: "food",
      createdAt: local(11, 16),
      payers: [
        { memberId: "me", amount: 280 },
        { memberId: "chi", amount: 1000 },
      ],
      participants: [
        { id: "r1", memberId: "me", shareAmount: 640 },
        { id: "r2", memberId: "chi", shareAmount: 640 },
      ],
    }
    render(
      <ProjectOverviewV2View
        project={{ ...project, expenses: [multiPayer] }}
        summary={summary}
        onShare={vi.fn()}
        onVoice={vi.fn()}
      />
    )
    expect(screen.getByText("志明等 2 人付款")).toBeInTheDocument()
  })

  it("caps the participant avatars and shows the overflow count", () => {
    const fourMembers: OverviewProject["members"] = [
      { id: "me", role: "owner", displayName: "Emma", user: { id: "u1", name: "Emma", email: "e@x.com", image: null } },
      { id: "m2", role: "member", displayName: "志明", user: { id: "u2", name: "志明", email: "m2@x.com", image: null } },
      { id: "m3", role: "member", displayName: "美玲", user: { id: "u3", name: "美玲", email: "m3@x.com", image: null } },
      { id: "m4", role: "member", displayName: "大雄", user: { id: "u4", name: "大雄", email: "m4@x.com", image: null } },
    ]
    const expense: OverviewProject["expenses"][number] = {
      id: "e9",
      amount: 1000,
      currency: "TWD",
      description: "合菜",
      category: "food",
      createdAt: local(11, 16),
      payers: [{ memberId: "me", amount: 1000 }],
      participants: [
        { id: "q1", memberId: "me", shareAmount: 250 },
        { id: "q2", memberId: "m2", shareAmount: 250 },
        { id: "q3", memberId: "m3", shareAmount: 250 },
        { id: "q4", memberId: "m4", shareAmount: 250 },
      ],
    }
    render(
      <ProjectOverviewV2View
        project={{ ...project, members: fourMembers, expenses: [expense] }}
        summary={summary}
        onShare={vi.fn()}
        onVoice={vi.fn()}
      />
    )
    const card = screen.getByTestId("v2-recent-expenses-card")
    expect(within(card).getByText("共4人分攤")).toBeInTheDocument()
    expect(within(card).getByText("+1")).toBeInTheDocument()
  })

  it("uses a neutral tint for members without a real avatar and keeps chosen avatar colors", () => {
    const withAvatars: OverviewProject = {
      ...project,
      members: [
        { id: "me", role: "owner", displayName: "Emma", user: { id: "u1", name: "Emma", email: "e@x.com", image: null } },
        { id: "chi", role: "member", displayName: "志明", user: { id: "u2", name: "志明", email: "zhi@x.com", image: "avatar:cat:red" } },
      ],
      expenses: [
        {
          id: "e1",
          amount: 1280,
          currency: "TWD",
          description: "拉麵",
          category: "food",
          createdAt: local(11, 16),
          payers: [{ memberId: "me", amount: 1280 }],
          participants: [
            { id: "p1", memberId: "me", shareAmount: 640 },
            { id: "p2", memberId: "chi", shareAmount: 640 },
          ],
        },
      ],
    }
    render(<ProjectOverviewV2View project={withAvatars} summary={summary} onShare={vi.fn()} onVoice={vi.fn()} />)
    const card = screen.getByTestId("v2-recent-expenses-card")
    // "我" is the fallback initial for the current user (no real avatar) appearing
    // as both payer and participant; those must not get an auto color.
    const fallbacks = within(card).getAllByText("我", { exact: true })
    expect(fallbacks.length).toBeGreaterThan(0)
    for (const el of fallbacks) {
      expect(el.className).toContain("bg-v2-sand")
      expect(el.className).not.toMatch(/bg-v2-(lake|coral|plum)/)
    }
    // A member with a chosen avatar keeps its own color, not the neutral tint.
    const chosen = card.querySelectorAll('[style*="background-color"]')
    expect(chosen.length).toBeGreaterThan(0)
    chosen.forEach((el) => expect(el.className).not.toContain("bg-v2-sand"))
  })

  it("lets the payer name truncate instead of clipping the split count", () => {
    render(<ProjectOverviewV2View project={project} summary={summary} onShare={vi.fn()} onVoice={vi.fn()} />)
    const card = screen.getByTestId("v2-recent-expenses-card")
    const name = within(card).getByText("志明付款")
    expect(name.className).toContain("truncate")
    expect(name.className).toContain("min-w-0")
  })

  it("aligns the amount with the title so the split detail spans the full row", () => {
    render(<ProjectOverviewV2View project={project} summary={summary} onShare={vi.fn()} onVoice={vi.fn()} />)
    const card = screen.getByTestId("v2-recent-expenses-card")
    const titleRow = within(card).getByText("一蘭拉麵晚餐").parentElement
    // The amount shares the title's row, freeing the width below it for the
    // payer/participant detail to extend.
    expect(titleRow).toContainElement(within(card).getByText("TWD 1,280"))
    expect(titleRow).not.toContainElement(within(card).getByText("志明付款"))
  })

  it("shows an empty state without expenses", () => {
    render(<ProjectOverviewV2View project={{ ...project, expenses: [] }} summary={summary} onShare={vi.fn()} onVoice={vi.fn()} />)
    const card = screen.getByTestId("v2-recent-expenses-card")
    expect(within(card).getByText("還沒有支出，點右下角開始記帳")).toBeInTheDocument()
  })

  it("uses ink for a non-negative balance, danger for a negative one and a lake label", () => {
    const { rerender } = render(
      <ProjectOverviewV2View project={project} summary={summary} onShare={vi.fn()} onVoice={vi.fn()} />
    )
    expect(screen.getByText("+TWD 4,820").className).toContain("text-v2-ink")
    expect(screen.getByText("我的餘額").className).toContain("text-v2-lake")
    expect(screen.getByText("我的餘額").className).toContain("text-[13px]")

    rerender(
      <ProjectOverviewV2View
        project={project}
        summary={{ ...summary, userBalance: -1200.4 }}
        onShare={vi.fn()}
        onVoice={vi.fn()}
      />
    )
    expect(screen.getByText("−TWD 1,200").className).toContain("text-v2-danger")
  })

  it("wires share, voice and add actions without a camera FAB", () => {
    const onShare = vi.fn()
    const onVoice = vi.fn()
    render(<ProjectOverviewV2View project={project} summary={summary} onShare={onShare} onVoice={onVoice} />)
    fireEvent.click(screen.getByRole("button", { name: "分享" }))
    fireEvent.click(screen.getByRole("button", { name: /AI 快速記帳/ }))
    expect(onShare).toHaveBeenCalledTimes(1)
    expect(onShare).toHaveBeenCalledWith(expect.objectContaining({ type: "click" }))
    expect(onVoice).toHaveBeenCalledTimes(1)
    expect(onVoice).toHaveBeenCalledWith(expect.objectContaining({ type: "click" }))
    expect(screen.queryByRole("button", { name: /拍照記帳/ })).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: "手動新增支出" })).toHaveAttribute("href", "/projects/p1/expenses/new")
  })

  it("renders the settings avatar and the edit pill and links them to settings", () => {
    render(<ProjectOverviewV2View project={project} summary={summary} onShare={vi.fn()} onVoice={vi.fn()} />)
    expect(screen.getByRole("link", { name: "通用設定" })).toHaveAttribute("href", "/settings")
    expect(screen.getByRole("link", { name: "修改" })).toHaveAttribute("href", "/projects/p1/settings")
    expect(screen.getByRole("link", { name: "回旅程列表" })).toHaveAttribute("href", "/projects")
    expect(screen.getByRole("button", { name: "分享" })).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "專案設定" })).not.toBeInTheDocument()
  })

  it("uses the brand mark as the back control to the trip list", () => {
    render(<ProjectOverviewV2View project={project} summary={summary} onShare={vi.fn()} onVoice={vi.fn()} />)
    const back = screen.getByRole("link", { name: "回旅程列表" })
    expect(within(back).getByTestId("v2-brand-mark")).toBeInTheDocument()
  })

  it("shows the current user's avatar instead of the project creator's initial", () => {
    render(
      <ProjectOverviewV2View
        project={project}
        summary={summary}
        onShare={vi.fn()}
        onVoice={vi.fn()}
        currentUserName="小明"
        currentUserImage="https://x/b.png"
      />
    )
    const link = screen.getByRole("link", { name: "通用設定" })
    expect(link.querySelector("img")).toHaveAttribute("src", "https://x/b.png")
    expect(link.textContent).not.toContain("E")
  })

  it("renders the description only when present", () => {
    const description = "跟著楓葉季節走訪京都嵐山與東京近郊，中間安排一晚溫泉旅館放鬆，行程盡量不要太趕，留點時間走走。"
    const { rerender } = render(
      <ProjectOverviewV2View project={project} summary={summary} onShare={vi.fn()} onVoice={vi.fn()} />
    )
    expect(screen.queryByText(description)).not.toBeInTheDocument()

    rerender(
      <ProjectOverviewV2View project={{ ...project, description }} summary={summary} onShare={vi.fn()} onVoice={vi.fn()} />
    )
    const desc = screen.getByText(description)
    expect(desc).toBeInTheDocument()
    // The description must sit on its own full-width row, not squeezed next to
    // the share/edit buttons, so a full-length description can wrap to two lines.
    expect(within(screen.getByTestId("v2-overview-header")).queryByText(description)).not.toBeInTheDocument()
  })

  it("renders an undated, unbudgeted, description-less trip with an empty expenses state", () => {
    render(
      <ProjectOverviewV2View
        project={{ ...project, description: null, budget: null, startDate: null, endDate: null, expenses: [] }}
        summary={{ ...summary, totalAmount: 0, perPerson: 0, budget: null, budgetProgress: 0, budgetRemaining: null, userBalance: 0 }}
        onShare={vi.fn()}
        onVoice={vi.fn()}
      />
    )
    expect(screen.getByText(/尚未設定日期/)).toBeInTheDocument()
    expect(screen.queryByText(/%|％/)).not.toBeInTheDocument()
    const card = screen.getByTestId("v2-recent-expenses-card")
    expect(within(card).getByText("還沒有支出，點右下角開始記帳")).toBeInTheDocument()
    expect(screen.queryByText("＋TWD 0")).not.toBeInTheDocument()
  })
})

describe("ProjectOverviewV2 container", () => {
  beforeEach(() => {
    mockOverview.mockReset()
    liff.user = { id: "u1" }
  })

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

  it("renders the overview view with the share and quick-expense wiring for a member", () => {
    const refetch = vi.fn()
    mockOverview.mockReturnValue({
      project,
      loading: false,
      joinInfo: null,
      joining: false,
      joinProject: vi.fn(),
      claimMember: vi.fn(),
      refetch,
      summary,
    })
    render(<ProjectOverviewV2 projectId="p1" />)
    expect(screen.getByRole("heading", { name: "東京賞楓 5 日" })).toBeInTheDocument()
    expect(screen.getByText("TWD 48,600")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "分享" }))
    expect(screen.getByText("邀請成員加入")).toBeInTheDocument()
  })

  it("passes the signed-in user to the overview avatar", () => {
    liff.user = { id: "u1", name: "小明", image: "https://x/b.png" }
    mockOverview.mockReturnValue({
      project,
      loading: false,
      joinInfo: null,
      joining: false,
      joinProject: vi.fn(),
      claimMember: vi.fn(),
      refetch: vi.fn(),
      summary,
    })
    render(<ProjectOverviewV2 projectId="p1" />)
    const link = screen.getByRole("link", { name: "通用設定" })
    expect(link.querySelector("img")).toHaveAttribute("src", "https://x/b.png")
  })

  it("opens the quick-expense overlay from the voice action and closes it without refetching", () => {
    const refetch = vi.fn()
    mockOverview.mockReturnValue({
      project,
      loading: false,
      joinInfo: null,
      joining: false,
      joinProject: vi.fn(),
      claimMember: vi.fn(),
      refetch,
      summary,
    })
    render(<ProjectOverviewV2 projectId="p1" />)

    expect(screen.getByTestId("qe-open")).toHaveTextContent("false")

    fireEvent.click(screen.getByRole("button", { name: /AI 快速記帳/ }))
    expect(screen.getByTestId("qe-open")).toHaveTextContent("true")
    expect(screen.getByTestId("qe-initial-step")).toHaveTextContent("input")
    expect(quickExpenseProps.current?.projectName).toBe("東京賞楓 5 日")

    fireEvent.click(screen.getByRole("button", { name: "stub-qe-close" }))
    expect(screen.getByTestId("qe-open")).toHaveTextContent("false")
    expect(refetch).not.toHaveBeenCalled()
  })

  it("refetches the overview after a successful quick expense", () => {
    const refetch = vi.fn()
    mockOverview.mockReturnValue({
      project,
      loading: false,
      joinInfo: null,
      joining: false,
      joinProject: vi.fn(),
      claimMember: vi.fn(),
      refetch,
      summary,
    })
    render(<ProjectOverviewV2 projectId="p1" />)
    fireEvent.click(screen.getByRole("button", { name: "stub-qe-success" }))
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it("returns to the project list when the join dialog is cancelled", () => {
    routerPush.mockClear()
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
    fireEvent.click(screen.getByRole("button", { name: "取消" }))
    expect(routerPush).toHaveBeenCalledWith("/projects")
  })
})
