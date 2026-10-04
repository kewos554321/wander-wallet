import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import type { DateRange } from "react-day-picker"

// Capture the props DateRangeField passes to the shared Calendar and drive its
// onSelect callback directly. The Calendar itself is an external, excluded UI
// primitive; this keeps the test focused on DateRangeField's own display and
// onChange wiring for full-range / from-only / cleared selections.
const calendarProps = vi.hoisted(() => ({ current: null as Record<string, unknown> | null }))

vi.mock("@/components/ui/calendar", () => ({
  Calendar: (props: Record<string, unknown>) => {
    calendarProps.current = props
    const onSelect = props.onSelect as (range: DateRange | undefined) => void
    return (
      <div data-testid="calendar-stub">
        <button
          type="button"
          onClick={() => onSelect({ from: new Date(2026, 10, 12), to: new Date(2026, 10, 16) })}
        >
          stub-full-range
        </button>
        <button type="button" onClick={() => onSelect({ from: new Date(2026, 10, 12) })}>
          stub-from-only
        </button>
        <button type="button" onClick={() => onSelect(undefined)}>
          stub-clear
        </button>
      </div>
    )
  },
}))

import { DateRangeField } from "@/components/v2/project/date-range-field"

function openPopover(name = "選擇日期") {
  fireEvent.click(screen.getByRole("button", { name }))
  return screen.getByTestId("calendar-stub")
}

describe("DateRangeField", () => {
  it("shows the placeholder with subtle ink when no dates are selected", () => {
    render(<DateRangeField label="日期" startDate={null} endDate={null} onChange={vi.fn()} />)
    const display = screen.getByText("選擇日期")
    expect(display).toBeInTheDocument()
    expect(display.className).toContain("text-v2-ink-subtle")
  })

  it("shows an in-progress range when only the start date is set", () => {
    render(<DateRangeField label="日期" startDate="2026-11-12" endDate={null} onChange={vi.fn()} />)
    const display = screen.getByText("2026/11/12 – ...")
    expect(display).toBeInTheDocument()
    // A set start date switches the text from subtle to full ink.
    expect(display.className).toContain("text-v2-ink")
  })

  it("shows the complete range when both dates are set", () => {
    render(<DateRangeField label="日期" startDate="2026-11-12" endDate="2026-11-16" onChange={vi.fn()} />)
    expect(screen.getByText("2026/11/12 – 2026/11/16")).toBeInTheDocument()
  })

  it("passes the parsed range, selected days and default month to the calendar", () => {
    render(<DateRangeField label="日期" startDate="2026-11-12" endDate="2026-11-16" onChange={vi.fn()} />)
    openPopover("2026/11/12 – 2026/11/16")

    expect(calendarProps.current).not.toBeNull()
    const selected = calendarProps.current!.selected as DateRange
    expect(selected.from).toEqual(new Date(2026, 10, 12))
    expect(selected.to).toEqual(new Date(2026, 10, 16))
    expect(calendarProps.current!.defaultMonth).toEqual(new Date(2026, 10, 12))
  })

  it("reports a complete range, then a start-only range, then a cleared range", () => {
    const onChange = vi.fn()
    render(<DateRangeField label="日期" startDate={null} endDate={null} onChange={onChange} />)
    openPopover()

    fireEvent.click(screen.getByRole("button", { name: "stub-full-range" }))
    expect(onChange).toHaveBeenLastCalledWith("2026-11-12", "2026-11-16")

    fireEvent.click(screen.getByRole("button", { name: "stub-from-only" }))
    expect(onChange).toHaveBeenLastCalledWith("2026-11-12", null)

    fireEvent.click(screen.getByRole("button", { name: "stub-clear" }))
    expect(onChange).toHaveBeenLastCalledWith(null, null)

    expect(onChange).toHaveBeenCalledTimes(3)
  })

  it("honours the disabled state and extra trigger classes", () => {
    render(
      <DateRangeField
        label="入住日期"
        startDate={null}
        endDate={null}
        onChange={vi.fn()}
        disabled
        triggerClassName="custom-trigger"
      />
    )
    const trigger = screen.getByRole("button", { name: "選擇日期" })
    expect(trigger).toBeDisabled()
    expect(trigger.className).toContain("custom-trigger")
    expect(screen.getByText("入住日期")).toBeInTheDocument()
  })
})
