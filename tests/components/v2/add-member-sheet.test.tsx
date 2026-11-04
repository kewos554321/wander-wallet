import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { AddMemberSheet } from "@/components/v2/members/add-member-sheet"

describe("AddMemberSheet", () => {
  it("adds a placeholder companion and closes on success", async () => {
    const onAdd = vi.fn().mockResolvedValue(null)
    const onOpenChange = vi.fn()
    render(<AddMemberSheet open onOpenChange={onOpenChange} onAdd={onAdd} />)

    expect(screen.getByRole("dialog", { name: "新增旅伴" })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText("名稱"), { target: { value: "小明" } })
    fireEvent.click(screen.getByRole("button", { name: "新增旅伴" }))

    await waitFor(() => expect(onAdd).toHaveBeenCalledWith("小明"))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("surfaces the API error without closing", async () => {
    const onAdd = vi.fn().mockResolvedValue("名稱重複")
    const onOpenChange = vi.fn()
    render(<AddMemberSheet open onOpenChange={onOpenChange} onAdd={onAdd} />)

    fireEvent.change(screen.getByLabelText("名稱"), { target: { value: "小明" } })
    fireEvent.click(screen.getByRole("button", { name: "新增旅伴" }))

    expect(await screen.findByRole("alert")).toHaveTextContent("名稱重複")
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
  })

  it("cancels from the secondary action", () => {
    const onOpenChange = vi.fn()
    render(<AddMemberSheet open onOpenChange={onOpenChange} onAdd={vi.fn()} />)
    fireEvent.click(screen.getByRole("button", { name: "取消" }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
