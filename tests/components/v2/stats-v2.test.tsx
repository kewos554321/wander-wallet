import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, within } from "@testing-library/react"
import { StatsV2View } from "@/components/v2/stats/stats-v2-view"

vi.mock("next/font/google", () => ({
  Noto_Serif_TC: () => ({ variable: "font-var-serif" }),
  Noto_Sans_TC: () => ({ variable: "font-var-sans" }),
}))
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock("@/components/project/join-project-dialog", () => ({ JoinProjectDialog: () => null }))

const mockProjectOverview = vi.fn()
vi.mock("@/lib/hooks/useProjectOverview", () => ({ useProjectOverview: () => mockProjectOverview() }))

import { StatsV2 } from "@/components/v2/stats/stats-v2"

const stats = {
  total: 48600,
  categories: [
    { category: "food", amount: 19440, percent: 40 },
    { category: "accommodation", amount: 14000, percent: 28.8 },
    { category: "transport", amount: 6400, percent: 13.2 },
    { category: "other", amount: 8760, percent: 18 },
  ],
  members: [
    { id: "chi", name: "志明", paid: 9800, share: 9800, balance: 0 },
    { id: "me", name: "Emma", paid: 18200, share: 18200, balance: 0 },
  ],
  daily: [
    { date: "11/12", amount: 12000 },
    { date: "11/13", amount: 20000 },
  ],
}

describe("StatsV2View", () => {
  it("renders the category legend with rounded percentages", () => {
    render(<StatsV2View projectId="p1" currency="TWD" stats={stats} currentMemberId="me" />)
    const legend = screen.getByRole("list", { name: "類別佔比" })
    expect(within(legend).getByText("餐飲")).toBeInTheDocument()
    expect(within(legend).getByText("40%")).toBeInTheDocument()
    expect(within(legend).getByText("29%")).toBeInTheDocument()
    expect(within(legend).getByText("TWD 19,440")).toBeInTheDocument()
  })

  it("ranks members by share with 我 for the current member", () => {
    render(<StatsV2View projectId="p1" currency="TWD" stats={stats} currentMemberId="me" />)
    const rows = within(screen.getByRole("list", { name: "成員排行" })).getAllByRole("listitem")
    expect(rows[0]).toHaveTextContent("我")
    expect(rows[0]).toHaveTextContent("TWD 18,200")
    expect(rows[1]).toHaveTextContent("志")
    expect(within(rows[0]).getByRole("meter")).toHaveAttribute("aria-valuenow", "100")
    expect(within(rows[1]).getByRole("meter")).toHaveAttribute("aria-valuenow", "54")
  })

  it("labels the daily trend", () => {
    render(<StatsV2View projectId="p1" currency="TWD" stats={stats} currentMemberId="me" />)
    const trend = screen.getByRole("figure", { name: "每日趨勢" })
    expect(within(trend).getByText("11/12")).toBeInTheDocument()
    expect(within(trend).getByText("11/13")).toBeInTheDocument()
  })

  it("uses a DOM-safe gradient id for the daily trend fill", () => {
    render(<StatsV2View projectId="p1" currency="TWD" stats={stats} currentMemberId="me" />)
    const trend = screen.getByRole("figure", { name: "每日趨勢" })
    const gradient = trend.querySelector("linearGradient")
    expect(gradient).not.toBeNull()
    const gradientId = gradient!.getAttribute("id")!
    expect(gradientId).toMatch(/^[a-zA-Z0-9_-]+$/)
    const areaPath = trend.querySelector(`path[fill="url(#${gradientId})"]`)
    expect(areaPath).not.toBeNull()
  })

  it("places each section heading inside its own labelled card", () => {
    render(<StatsV2View projectId="p1" currency="TWD" stats={stats} currentMemberId="me" />)
    const categoryCard = screen.getByRole("region", { name: "類別佔比" })
    expect(within(categoryCard).getByRole("list", { name: "類別佔比" })).toBeInTheDocument()
    const memberCard = screen.getByRole("region", { name: "成員排行" })
    expect(within(memberCard).getByRole("list", { name: "成員排行" })).toBeInTheDocument()
    const trendCard = screen.getByRole("region", { name: "每日趨勢" })
    expect(within(trendCard).getByRole("figure", { name: "每日趨勢" })).toBeInTheDocument()
    expect(within(trendCard).getByText("每日趨勢")).toBeInTheDocument()
  })

  it("links to the settle screen from the bottom of the page", () => {
    render(<StatsV2View projectId="p1" currency="TWD" stats={stats} currentMemberId="me" />)
    expect(screen.getByRole("link", { name: /查看結算/ })).toHaveAttribute("href", "/projects/p1/settle")
  })

  it("renders the page title and a back link", () => {
    render(<StatsV2View projectId="p1" currency="TWD" stats={stats} currentMemberId="me" />)
    expect(screen.getByRole("heading", { level: 1, name: "統計" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "返回" })).toHaveAttribute("href", "/projects/p1")
  })

  it("shows empty states without NaN", () => {
    const { container } = render(
      <StatsV2View
        projectId="p1"
        currency="TWD"
        stats={{ total: 0, categories: [], members: [{ id: "me", name: "Emma", paid: 0, share: 0, balance: 0 }], daily: [] }}
        currentMemberId="me"
      />
    )
    expect(screen.getAllByText("尚無支出")).toHaveLength(3)
    expect(container.textContent).not.toContain("NaN")
  })
})

describe("StatsV2 container", () => {
  beforeEach(() => mockProjectOverview.mockReset())

  it("shows a back link when the project is not found", () => {
    mockProjectOverview.mockReturnValue({
      project: null,
      loading: false,
      joinInfo: null,
      joining: false,
      joinProject: vi.fn(),
      claimMember: vi.fn(),
      summary: null,
      convert: (n: number) => n,
    })
    render(<StatsV2 projectId="p1" />)
    expect(screen.getByRole("link", { name: "返回" })).toHaveAttribute("href", "/projects/p1")
    expect(screen.getByText("專案不存在")).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 1, name: "統計" })).toBeInTheDocument()
  })

  it("shows a back link while loading", () => {
    mockProjectOverview.mockReturnValue({
      project: null,
      loading: true,
      joinInfo: null,
      joining: false,
      joinProject: vi.fn(),
      claimMember: vi.fn(),
      summary: null,
      convert: (n: number) => n,
    })
    render(<StatsV2 projectId="p1" />)
    expect(screen.getByRole("link", { name: "返回" })).toHaveAttribute("href", "/projects/p1")
    expect(screen.getByTestId("v2-stats-skeleton")).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 1, name: "統計" })).toBeInTheDocument()
  })
})
