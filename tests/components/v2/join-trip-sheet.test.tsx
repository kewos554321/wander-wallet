import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { JoinTripSheet } from "@/components/v2/project/join-trip-sheet"

const base = { name: "東京", description: null, unclaimedMembers: [{ id: "m1", displayName: "阿凱" }] }

describe("JoinTripSheet", () => {
  it("offers both claiming a companion and joining as a new one", () => {
    const onJoin = vi.fn()
    const onClaim = vi.fn()
    render(<JoinTripSheet info={{ ...base, joinMode: "both" }} joining={false} onJoin={onJoin} onClaim={onClaim} onCancel={vi.fn()} />)

    expect(screen.getByRole("dialog", { name: "加入「東京」" })).toBeInTheDocument()
    expect(screen.getByText("選擇你要認領的旅伴，或以新旅伴加入這趟旅程。")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("radio", { name: "阿凱" }))
    fireEvent.click(screen.getByRole("button", { name: "確認認領" }))
    expect(onClaim).toHaveBeenCalledWith("m1")

    fireEvent.click(screen.getByRole("button", { name: "以新旅伴加入" }))
    expect(onJoin).toHaveBeenCalled()
  })

  it("explains when there is nothing to claim", () => {
    render(
      <JoinTripSheet
        info={{ ...base, joinMode: "claim_only", unclaimedMembers: [] }}
        joining={false}
        onJoin={vi.fn()}
        onClaim={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(screen.getByText("此旅程目前沒有可認領的佔位旅伴，請聯繫旅程建立者")).toBeInTheDocument()
  })

  it("calls onCancel from the cancel button", () => {
    const onCancel = vi.fn()
    render(<JoinTripSheet info={{ ...base, joinMode: "create_only" }} joining={false} onJoin={vi.fn()} onClaim={vi.fn()} onCancel={onCancel} />)
    fireEvent.click(screen.getByRole("button", { name: "取消" }))
    expect(onCancel).toHaveBeenCalled()
  })
})
