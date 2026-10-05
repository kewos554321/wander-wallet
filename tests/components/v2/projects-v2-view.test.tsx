import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, within } from "@testing-library/react"
import { ProjectsV2View } from "@/components/v2/projects/projects-v2-view"
import type { ProjectListItem } from "@/lib/hooks/useProjects"

vi.mock("next/font/google", () => ({
  Noto_Serif_TC: () => ({ variable: "font-var-serif" }),
  Noto_Sans_TC: () => ({ variable: "font-var-sans" }),
}))

const mocks = vi.hoisted(() => ({
  useLiff: vi.fn(),
  useProjects: vi.fn(),
}))

vi.mock("@/components/auth/liff-provider", () => ({
  useLiff: () => mocks.useLiff(),
  useAuthFetch: () => vi.fn(),
}))

vi.mock("@/components/ads/ad-container", () => ({
  AdContainer: ({ placement, variant }: { placement: string; variant?: string }) => (
    <div data-testid="ad-container" data-placement={placement} data-variant={variant} />
  ),
}))

vi.mock("@/lib/hooks/useProjects", () => ({ useProjects: () => mocks.useProjects() }))

import { ProjectsV2 } from "@/components/v2/projects/projects-v2"

const local = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12).toISOString()
const now = new Date(2026, 10, 14, 9) // 2026-11-14 09:00

function project(overrides: Partial<ProjectListItem>): ProjectListItem {
  return {
    id: "p",
    name: "旅程",
    description: null,
    cover: null,
    startDate: null,
    endDate: null,
    currency: "TWD",
    createdAt: local(2026, 1, 1),
    updatedAt: local(2026, 1, 1),
    creator: { id: "u1", name: "Emma", email: "e@x.com" },
    members: [],
    totalAmount: 0,
    _count: { expenses: 0, members: 0 },
    ...overrides,
  }
}

const member = (id: string, displayName: string) => ({ id, displayName, user: null, role: "member" })

const projects: ProjectListItem[] = [
  project({
    id: "tokyo",
    name: "東京賞楓 5 日",
    startDate: local(2026, 11, 12),
    endDate: local(2026, 11, 16),
    totalAmount: 48600,
    members: [member("m1", "小美"), member("m2", "志明"), member("m3", "阿凱"), member("m4", "我"), member("m5", "婷")],
    _count: { expenses: 12, members: 5 },
  }),
  project({
    id: "seoul",
    name: "首爾血拼週末",
    startDate: local(2026, 8, 1),
    endDate: local(2026, 8, 3),
    totalAmount: 15900,
    members: [member("m6", "婷")],
    _count: { expenses: 3, members: 1 },
  }),
  project({ id: "chiangmai", name: "清邁數位遊牧", totalAmount: 2300 }),
]

describe("ProjectsV2View", () => {
  it("renders greeting, title and cards", () => {
    render(<ProjectsV2View projects={projects} loading={false} userName="Emma" now={now} />)
    expect(screen.getByText("早安，Emma")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "你的旅程" })).toBeInTheDocument()
    expect(screen.getByText("每一趟旅程，都值得被好好記住")).toBeInTheDocument()

    const tokyo = screen.getByRole("link", { name: /東京賞楓 5 日/ })
    expect(tokyo).toHaveAttribute("href", "/projects/tokyo")
    expect(within(tokyo).getByText("5 天")).toBeInTheDocument()
    expect(within(tokyo).getByText("11/12 – 11/16 · 5 位旅伴")).toBeInTheDocument()
    expect(within(tokyo).getByText("TWD 48,600")).toBeInTheDocument()
    expect(within(tokyo).getByText("+2")).toBeInTheDocument()
  })

  it("shows placeholder date text and no day badge without dates", () => {
    render(<ProjectsV2View projects={projects} loading={false} userName="Emma" now={now} />)
    const card = screen.getByRole("link", { name: /清邁數位遊牧/ })
    expect(within(card).getByText("尚未設定日期")).toBeInTheDocument()
    expect(within(card).queryByText(/天$/)).not.toBeInTheDocument()
  })

  it("filters by status", () => {
    render(<ProjectsV2View projects={projects} loading={false} userName="Emma" now={now} />)

    fireEvent.click(screen.getByRole("button", { name: "已完成" }))
    expect(screen.getByText("首爾血拼週末")).toBeInTheDocument()
    expect(screen.queryByText("東京賞楓 5 日")).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "進行中" }))
    expect(screen.getByText("東京賞楓 5 日")).toBeInTheDocument()
    expect(screen.getByText("清邁數位遊牧")).toBeInTheDocument()
    expect(screen.queryByText("首爾血拼週末")).not.toBeInTheDocument()
  })

  it("links to settings and new trip", () => {
    render(<ProjectsV2View projects={projects} loading={false} userName="Emma" now={now} />)
    expect(screen.getByRole("link", { name: "通用設定" })).toHaveAttribute("href", "/settings")
    expect(screen.getByRole("link", { name: "建立新旅程" })).toHaveAttribute("href", "/projects/new")
  })

  it("renders the signed-in user's avatar in the settings link", () => {
    render(
      <ProjectsV2View
        projects={projects}
        loading={false}
        userName="小明"
        userImage="https://x/a.png"
        now={now}
      />
    )
    const link = screen.getByRole("link", { name: "通用設定" })
    expect(link).toHaveAttribute("href", "/settings")
    expect(link.querySelector("img")).toHaveAttribute("src", "https://x/a.png")
  })

  it("shows an empty state", () => {
    render(<ProjectsV2View projects={[]} loading={false} userName={null} now={now} />)
    expect(screen.getByText("還沒有旅程")).toBeInTheDocument()
    expect(screen.getByText("你好")).toBeInTheDocument()
  })

  it("shows an empty-filter message", () => {
    render(<ProjectsV2View projects={[projects[0]]} loading={false} userName="Emma" now={now} />)
    fireEvent.click(screen.getByRole("button", { name: "已完成" }))
    expect(screen.getByText("沒有符合的旅程")).toBeInTheDocument()
  })

  it("renders skeletons while loading", () => {
    render(<ProjectsV2View projects={[]} loading={true} userName="Emma" now={now} />)
    expect(screen.getAllByTestId("v2-project-skeleton")).toHaveLength(3)
  })

  it("renders the v2 brand mark beside the app name", () => {
    render(<ProjectsV2View projects={projects} loading={false} userName="Emma" now={now} />)
    const mark = screen.getByTestId("v2-brand-mark")
    expect(mark).toBeInTheDocument()
    // The mark is an icon-only element; its decorative svg carries the brand.
    expect(mark.querySelector("svg")).not.toBeNull()
    expect(screen.getByText("Wander Wallet")).toBeInTheDocument()
  })
})

describe("ProjectsV2 container", () => {
  beforeEach(() => {
    mocks.useLiff.mockReset()
    mocks.useProjects.mockReset()
  })

  it("renders the view with hook projects and the signed-in user's name", () => {
    mocks.useLiff.mockReturnValue({ user: { name: "Emma" } })
    mocks.useProjects.mockReturnValue({ projects, loading: false })

    render(<ProjectsV2 />)

    expect(screen.getByRole("heading", { name: "你的旅程" })).toBeInTheDocument()
    expect(screen.getByText(/，Emma$/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /東京賞楓 5 日/ })).toHaveAttribute("href", "/projects/tokyo")
  })

  it("passes the signed-in user's image to the view avatar", () => {
    mocks.useLiff.mockReturnValue({ user: { name: "Emma", image: "https://x/e.png" } })
    mocks.useProjects.mockReturnValue({ projects, loading: false })

    render(<ProjectsV2 />)

    const link = screen.getByRole("link", { name: "通用設定" })
    expect(link.querySelector("img")).toHaveAttribute("src", "https://x/e.png")
  })

  it("falls back to the anonymous greeting and empty state without a user", () => {
    mocks.useLiff.mockReturnValue({ user: null })
    mocks.useProjects.mockReturnValue({ projects: [], loading: false })

    render(<ProjectsV2 />)

    expect(screen.getByText("你好")).toBeInTheDocument()
    expect(screen.getByText("還沒有旅程")).toBeInTheDocument()
    expect(screen.queryByText("Emma")).not.toBeInTheDocument()
  })

  it("renders skeletons while the hook is loading", () => {
    mocks.useLiff.mockReturnValue({ user: { name: "Emma" } })
    mocks.useProjects.mockReturnValue({ projects: [], loading: true })

    render(<ProjectsV2 />)

    expect(screen.getAllByTestId("v2-project-skeleton")).toHaveLength(3)
    expect(screen.queryByText("還沒有旅程")).not.toBeInTheDocument()
  })

  it("mounts the ad container with the project-list banner placement", () => {
    mocks.useLiff.mockReturnValue({ user: { name: "Emma" } })
    mocks.useProjects.mockReturnValue({ projects, loading: false })

    render(<ProjectsV2 />)

    const ad = screen.getByTestId("ad-container")
    expect(ad).toHaveAttribute("data-placement", "project-list")
    expect(ad).toHaveAttribute("data-variant", "banner")
  })

  it("wraps the content in the v2 scope", () => {
    mocks.useLiff.mockReturnValue({ user: null })
    mocks.useProjects.mockReturnValue({ projects: [], loading: false })

    render(<ProjectsV2 />)

    expect(document.querySelector('[data-ui="v2"]')).not.toBeNull()
  })
})
