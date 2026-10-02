import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { JoinModePicker } from "@/components/v2/project/join-mode-picker"

describe("JoinModePicker", () => {
  it("renders the create variant with its own title and lake-mid radios", () => {
    const onChange = vi.fn()
    render(<JoinModePicker value="both" onChange={onChange} />)
    expect(screen.getByText("成員加入方式")).toBeInTheDocument()
    const selected = screen.getByLabelText("兩者皆可").closest("label")!
    expect(selected.className).toContain("border-v2-lake-mid")
    const unselected = screen.getByLabelText("僅建立新成員").closest("label")!
    expect(unselected.className).toContain("bg-v2-paper")
    fireEvent.click(screen.getByLabelText("僅建立新成員"))
    expect(onChange).toHaveBeenCalledWith("create_only")
  })

  it("renders the settings variant without a duplicated title", () => {
    render(<JoinModePicker value="both" onChange={vi.fn()} variant="settings" />)
    expect(screen.queryByText("成員加入方式")).not.toBeInTheDocument()
    const selected = screen.getByLabelText("兩者皆可").closest("label")!
    expect(selected.className).toContain("rounded-[14px]")
    expect(selected.className).toContain("border-v2-lake")
    const unselected = screen.getByLabelText("僅取代佔位成員").closest("label")!
    expect(unselected.className).toContain("bg-v2-surface")
  })
})
