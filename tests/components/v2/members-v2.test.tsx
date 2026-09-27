import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent, within } from "@testing-library/react"
import { MembersV2View } from "@/components/v2/members/members-v2-view"
import type { MembersProject } from "@/lib/hooks/useProjectMembers"

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
    batchMode: false,
    selected: new Set<string>(),
    onInvite: vi.fn(),
    onAdd: vi.fn(),
    onRemove: vi.fn(),
    onToggleBatch: vi.fn(),
    onToggleSelect: vi.fn(),
    onRequestBatchRemove: vi.fn(),
    ...overrides,
  }
  render(<MembersV2View {...props} />)
  return props
}

describe("MembersV2View", () => {
  it("shows the count, badges and emails", () => {
    renderView()
    expect(screen.getByText("3 位旅伴")).toBeInTheDocument()
    const me = screen.getByTestId("member-m1")
    expect(within(me).getByText("建立者")).toBeInTheDocument()
    expect(within(me).getByText("你")).toBeInTheDocument()
    expect(within(me).getByText("emma@example.com")).toBeInTheDocument()
    const kai = screen.getByTestId("member-m3")
    expect(within(kai).getByText("佔位成員")).toBeInTheDocument()
    expect(within(kai).getByText("尚未加入")).toBeInTheDocument()
  })

  it("lets the owner remove others but not themselves", () => {
    const props = renderView()
    expect(within(screen.getByTestId("member-m1")).queryByRole("button", { name: /移除/ })).not.toBeInTheDocument()
    fireEvent.click(within(screen.getByTestId("member-m2")).getByRole("button", { name: "移除小美" }))
    expect(props.onRemove).toHaveBeenCalledWith("m2")
  })

  it("hides remove and batch for non-owners", () => {
    renderView({ isOwner: false, currentUserId: "u2" })
    expect(screen.queryAllByRole("button", { name: /^移除/ })).toHaveLength(0)
    expect(screen.queryByRole("button", { name: "批次" })).not.toBeInTheDocument()
  })

  it("wires invite and add", () => {
    const props = renderView()
    fireEvent.click(screen.getByRole("button", { name: "邀請成員" }))
    fireEvent.click(screen.getByRole("button", { name: "手動新增成員" }))
    expect(props.onInvite).toHaveBeenCalled()
    expect(props.onAdd).toHaveBeenCalled()
  })

  it("uses checkboxes in batch mode, never for yourself", () => {
    const props = renderView({ batchMode: true, selected: new Set(["m2"]) })
    expect(within(screen.getByTestId("member-m1")).queryByRole("checkbox")).not.toBeInTheDocument()
    expect(within(screen.getByTestId("member-m2")).getByRole("checkbox")).toBeChecked()
    fireEvent.click(within(screen.getByTestId("member-m3")).getByRole("checkbox"))
    expect(props.onToggleSelect).toHaveBeenCalledWith("m3")
    fireEvent.click(screen.getByRole("button", { name: "移除 1 位" }))
    expect(props.onRequestBatchRemove).toHaveBeenCalled()
  })
})
