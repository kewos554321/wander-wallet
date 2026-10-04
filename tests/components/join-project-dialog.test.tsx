import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { JoinProjectDialog } from "@/components/project/join-project-dialog"

const base = { name: "東京", description: null, unclaimedMembers: [{ id: "m1", displayName: "阿凱" }] }

describe("JoinProjectDialog", () => {
  it("offers both claim and create when joinMode is both", () => {
    const onJoin = vi.fn()
    const onClaim = vi.fn()
    render(<JoinProjectDialog info={{ ...base, joinMode: "both" }} joining={false} onJoin={onJoin} onClaim={onClaim} onCancel={vi.fn()} />)

    expect(screen.getByText("加入「東京」")).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText("阿凱"))
    fireEvent.click(screen.getByRole("button", { name: "確認認領" }))
    expect(onClaim).toHaveBeenCalledWith("m1")

    fireEvent.click(screen.getByRole("button", { name: "以新成員加入" }))
    expect(onJoin).toHaveBeenCalled()
  })

  it("explains when nothing can be joined", () => {
    render(
      <JoinProjectDialog
        info={{ ...base, joinMode: "claim_only", unclaimedMembers: [] }}
        joining={false}
        onJoin={vi.fn()}
        onClaim={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(screen.getByText("此專案目前沒有可認領的佔位成員，請聯繫專案創建者")).toBeInTheDocument()
  })

  it("calls onCancel from the cancel button", () => {
    const onCancel = vi.fn()
    render(<JoinProjectDialog info={{ ...base, joinMode: "create_only" }} joining={false} onJoin={vi.fn()} onClaim={vi.fn()} onCancel={onCancel} />)
    fireEvent.click(screen.getByRole("button", { name: "取消" }))
    expect(onCancel).toHaveBeenCalled()
  })
})
