import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { JoinModePicker } from "@/components/v2/project/join-mode-picker"

describe("JoinModePicker", () => {
  it("renders the create variant with its legend and reflects the selected radio", () => {
    const onChange = vi.fn()
    render(<JoinModePicker value="both" onChange={onChange} />)
    expect(screen.getByText("成員加入方式")).toBeInTheDocument()
    expect(screen.getByRole("radio", { name: "兩者皆可" })).toBeChecked()
    const unselected = screen.getByRole("radio", { name: "僅建立新成員" })
    expect(unselected).not.toBeChecked()
    fireEvent.click(unselected)
    expect(onChange).toHaveBeenCalledWith("create_only")
  })

  it("renders the settings variant without a duplicated title", () => {
    render(<JoinModePicker value="both" onChange={vi.fn()} variant="settings" />)
    expect(screen.queryByText("成員加入方式")).not.toBeInTheDocument()
    expect(screen.getByRole("radio", { name: "兩者皆可" })).toBeChecked()
    expect(screen.getByRole("radio", { name: "僅取代佔位成員" })).not.toBeChecked()
  })

  it("disables every option when disabled", () => {
    render(<JoinModePicker value="both" onChange={vi.fn()} disabled />)
    for (const radio of screen.getAllByRole("radio")) {
      expect(radio).toBeDisabled()
    }
  })
})
