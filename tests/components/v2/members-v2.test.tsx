import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, within, waitFor } from "@testing-library/react"
import { MembersV2View } from "@/components/v2/members/members-v2-view"
import type { MembersProject } from "@/lib/hooks/useProjectMembers"

vi.mock("next/font/google", () => ({
  Noto_Serif_TC: () => ({ variable: "font-var-serif" }),
  Noto_Sans_TC: () => ({ variable: "font-var-sans" }),
}))
vi.mock("@/components/auth/liff-provider", () => ({
  useLiff: () => ({ user: { id: "u1" } }),
  useAuthFetch: () => vi.fn(),
}))
vi.mock("@/components/members/add-member-dialog", () => ({ AddMemberDialog: () => null }))
vi.mock("@/components/project/invite-dialog", () => ({ InviteDialog: () => null }))
vi.mock("@/components/ui/confirm-delete-dialog", async () => {
  const React = await import("react")
  return {
    ConfirmDeleteDialog: (props: { open: boolean; onConfirm: () => void; confirmText?: string }) =>
      props.open ? React.createElement("button", { onClick: props.onConfirm }, props.confirmText ?? "confirm") : null,
  }
})

const mockProjectMembers = vi.fn()
vi.mock("@/lib/hooks/useProjectMembers", () => ({ useProjectMembers: () => mockProjectMembers() }))

import { MembersV2 } from "@/components/v2/members/members-v2"

const project: MembersProject = {
  id: "p1",
  name: "東京",
  createdBy: "u1",
  creator: { id: "u1", name: "Emma", email: "emma@example.com" },
  members: [
    { id: "m1", userId: "u1", role: "owner", displayName: "Emma", claimedAt: null, user: { id: "u1", name: "Emma", email: "emma@example.com", image: null } },
    { id: "m2", userId: "u2", role: "member", displayName: "小美", claimedAt: null, user: { id: "u2", name: "小美", email: "meimei@example.com", image: null } },
    { id: "m3", userId: null, role: "member", displayName: "阿凱", claimedAt: null, user: null },
  ],
}

function renderView(overrides: Partial<Parameters<typeof MembersV2View>[0]> = {}) {
  const props: Parameters<typeof MembersV2View>[0] = {
    project,
    currentUserId: "u1",
    isOwner: true,
    removing: null,
    onInvite: vi.fn(),
    onAdd: vi.fn(),
    onRemove: vi.fn(),
    ...overrides,
  }
  render(<MembersV2View {...props} />)
  return props
}

describe("MembersV2View", () => {
  it("shows the heading, count, badges and emails", () => {
    renderView()
    expect(screen.getByText("成員列表")).toBeInTheDocument()
    expect(screen.getByText("成員組成 · 3 位旅伴")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "前往專案設定修改加入方式" })).toHaveAttribute("href", "/projects/p1/settings")
    const me = screen.getByTestId("member-m1")
    expect(within(me).getByText("建立者")).toBeInTheDocument()
    expect(within(me).getByText("你")).toBeInTheDocument()
    expect(within(me).getByText("emma@example.com")).toBeInTheDocument()
    const kai = screen.getByTestId("member-m3")
    expect(within(kai).getByText("佔位成員")).toBeInTheDocument()
    expect(within(kai).getByText("尚未加入")).toBeInTheDocument()
  })

  it("moves the join-method link into its own row outside the members card", () => {
    renderView()
    const link = screen.getByRole("link", { name: /前往專案設定修改加入方式/ })
    const card = screen.getByText("成員列表").closest("div.rounded-2xl")!
    expect(card.contains(link)).toBe(false)
  })

  it("renders the labelled share and add buttons", () => {
    renderView()
    expect(screen.getByRole("button", { name: "邀請成員" })).toHaveTextContent("分享")
    expect(screen.getByRole("button", { name: "手動新增成員" })).toHaveTextContent("增加成員")
  })

  it("lets the owner remove others but not themselves", () => {
    const props = renderView()
    expect(within(screen.getByTestId("member-m1")).queryByRole("button", { name: /移除/ })).not.toBeInTheDocument()
    fireEvent.click(within(screen.getByTestId("member-m2")).getByRole("button", { name: "移除小美" }))
    expect(props.onRemove).toHaveBeenCalledWith("m2")
  })

  it("hides remove for non-owners", () => {
    renderView({ isOwner: false, currentUserId: "u2" })
    expect(screen.queryAllByRole("button", { name: /^移除/ })).toHaveLength(0)
  })

  it("wires invite and add", () => {
    const props = renderView()
    fireEvent.click(screen.getByRole("button", { name: "邀請成員" }))
    fireEvent.click(screen.getByRole("button", { name: "手動新增成員" }))
    expect(props.onInvite).toHaveBeenCalled()
    expect(props.onAdd).toHaveBeenCalled()
  })

  it("renders the member image when present, else the initial", () => {
    const withImage = {
      ...project,
      members: [
        { ...project.members[0], user: { ...project.members[0].user!, image: "https://cdn.example/emma.jpg" } },
        project.members[1],
        project.members[2],
      ],
    }
    renderView({ project: withImage })
    const emma = screen.getByTestId("member-m1")
    expect(emma.querySelector('img[src="https://cdn.example/emma.jpg"]')).toBeInTheDocument()
    const mei = screen.getByTestId("member-m2")
    expect(within(mei).getByText("小")).toBeInTheDocument()
  })
})

describe("MembersV2 container", () => {
  beforeEach(() => {
    mockProjectMembers.mockReset()
    vi.stubGlobal("confirm", vi.fn(() => true))
  })
  afterEach(() => vi.unstubAllGlobals())

  it("shows a back link when the project is not found", () => {
    mockProjectMembers.mockReturnValue({
      project: null,
      loading: false,
      isOwner: false,
      currentUserId: "u1",
      removing: null,
      refetch: vi.fn(),
      addMember: vi.fn(),
      removeMember: vi.fn(),
      batchRemove: vi.fn(),
    })
    render(<MembersV2 projectId="p1" />)
    expect(screen.getByText("成員")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "返回" })).toHaveAttribute("href", "/projects/p1")
    expect(screen.getByText("專案不存在")).toBeInTheDocument()
  })

  it("shows a back link while loading", () => {
    mockProjectMembers.mockReturnValue({
      project: null,
      loading: true,
      isOwner: false,
      currentUserId: "u1",
      removing: null,
      refetch: vi.fn(),
      addMember: vi.fn(),
      removeMember: vi.fn(),
      batchRemove: vi.fn(),
    })
    render(<MembersV2 projectId="p1" />)
    expect(screen.getByRole("link", { name: "返回" })).toHaveAttribute("href", "/projects/p1")
    expect(screen.getByTestId("v2-members-skeleton")).toBeInTheDocument()
  })

  it("renders the member list", () => {
    mockProjectMembers.mockReturnValue({
      project,
      loading: false,
      isOwner: true,
      currentUserId: "u1",
      removing: null,
      refetch: vi.fn(),
      addMember: vi.fn(),
      removeMember: vi.fn(),
      batchRemove: vi.fn(),
    })
    render(<MembersV2 projectId="p1" />)
    expect(screen.getByText("成員組成 · 3 位旅伴")).toBeInTheDocument()
  })

  it("opens the invite and add dialogs", () => {
    mockProjectMembers.mockReturnValue({
      project,
      loading: false,
      isOwner: true,
      currentUserId: "u1",
      removing: null,
      refetch: vi.fn(),
      addMember: vi.fn(),
      removeMember: vi.fn(),
      batchRemove: vi.fn(),
    })
    render(<MembersV2 projectId="p1" />)
    fireEvent.click(screen.getByRole("button", { name: "邀請成員" }))
    fireEvent.click(screen.getByRole("button", { name: "手動新增成員" }))
    expect(screen.getByTestId("member-m1")).toBeInTheDocument()
  })

  it("removes a single member after confirm", async () => {
    const removeMember = vi.fn().mockResolvedValue(undefined)
    mockProjectMembers.mockReturnValue({
      project,
      loading: false,
      isOwner: true,
      currentUserId: "u1",
      removing: null,
      refetch: vi.fn(),
      addMember: vi.fn(),
      removeMember,
      batchRemove: vi.fn(),
    })
    render(<MembersV2 projectId="p1" />)
    fireEvent.click(within(screen.getByTestId("member-m2")).getByRole("button", { name: "移除小美" }))
    await waitFor(() => expect(removeMember).toHaveBeenCalledWith("m2"))
  })

  it("skips removal when cancelled", async () => {
    const removeMember = vi.fn().mockResolvedValue(undefined)
    mockProjectMembers.mockReturnValue({
      project,
      loading: false,
      isOwner: true,
      currentUserId: "u1",
      removing: null,
      refetch: vi.fn(),
      addMember: vi.fn(),
      removeMember,
      batchRemove: vi.fn(),
    })
    vi.stubGlobal("confirm", vi.fn(() => false))
    render(<MembersV2 projectId="p1" />)
    fireEvent.click(within(screen.getByTestId("member-m2")).getByRole("button", { name: "移除小美" }))
    expect(removeMember).not.toHaveBeenCalled()
  })
})
