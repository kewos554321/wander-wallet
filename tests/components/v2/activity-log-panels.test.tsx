import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { ActionPanel, NameListPanel } from "@/components/v2/activity-logs/filter-panels"

describe("ActionPanel", () => {
  it("renders the three actions and toggles them", () => {
    const onToggle = vi.fn()
    render(<ActionPanel selected={new Set(["create"])} onToggle={onToggle} onClear={vi.fn()} />)
    expect(screen.getByRole("checkbox", { name: "新增" })).toHaveAttribute("aria-checked", "true")
    fireEvent.click(screen.getByRole("checkbox", { name: "刪除" }))
    expect(onToggle).toHaveBeenCalledWith("delete")
  })

  it("clears when a selection exists", () => {
    const onClear = vi.fn()
    render(<ActionPanel selected={new Set(["create"])} onToggle={vi.fn()} onClear={onClear} />)
    fireEvent.click(screen.getByRole("button", { name: /清除/ }))
    expect(onClear).toHaveBeenCalled()
  })
})

describe("NameListPanel", () => {
  const options = [
    { key: "a", label: "志明" },
    { key: "b", label: "小美" },
  ]

  it("renders options and toggles", () => {
    const onToggle = vi.fn()
    render(<NameListPanel title="操作者" options={options} selected={new Set()} onToggle={onToggle} onClear={vi.fn()} emptyText="無操作者" />)
    expect(screen.getByRole("checkbox", { name: "志明" })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("checkbox", { name: "小美" }))
    expect(onToggle).toHaveBeenCalledWith("b")
  })

  it("shows the empty text", () => {
    render(<NameListPanel title="操作者" options={[]} selected={new Set()} onToggle={vi.fn()} onClear={vi.fn()} emptyText="無操作者" />)
    expect(screen.getByText("無操作者")).toBeInTheDocument()
  })
})
