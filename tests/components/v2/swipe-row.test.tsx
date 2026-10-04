import { describe, it, expect, vi, beforeAll } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { SwipeRow } from "@/components/v2/expenses/swipe-row"

beforeAll(() => {
  if (typeof window.PointerEvent === "undefined") {
    // jsdom has no PointerEvent; MouseEvent carries clientX/clientY.
    ;(window as unknown as { PointerEvent: typeof MouseEvent }).PointerEvent = class PointerEvent extends MouseEvent {}
  }
})

function renderRow(props: Partial<Parameters<typeof SwipeRow>[0]> = {}) {
  const onDelete = vi.fn()
  render(
    <SwipeRow onDelete={onDelete} {...props}>
      <div>card body</div>
    </SwipeRow>
  )
  return { onDelete }
}

describe("SwipeRow", () => {
  it("always renders the delete button and keeps it focusable", () => {
    renderRow()
    const buttons = screen.getAllByRole("button", { name: "刪除" })
    expect(buttons.length).toBeGreaterThan(0)
    buttons.forEach((b) => {
      expect(b).not.toHaveAttribute("aria-hidden", "true")
      expect(b).not.toHaveAttribute("tabindex", "-1")
      expect(b).not.toHaveStyle({ display: "none" })
    })
  })

  it("expands when the delete button receives focus and collapses on blur", () => {
    renderRow()
    const button = screen.getAllByRole("button", { name: "刪除" })[0]
    const layer = screen.getByText("card body").parentElement!
    fireEvent.focus(button)
    expect(layer).toHaveStyle({ transform: "translateX(72px)" })
    fireEvent.blur(button)
    expect(layer).toHaveStyle({ transform: "translateX(0px)" })
  })

  it("disables the delete button and swipe when disabled", () => {
    renderRow({ disabled: true })
    screen.getAllByRole("button", { name: "刪除" }).forEach((b) => expect(b).toBeDisabled())
  })

  it("calls onDelete when the delete button is clicked", () => {
    const { onDelete } = renderRow()
    fireEvent.click(screen.getAllByRole("button", { name: "刪除" })[0])
    expect(onDelete).toHaveBeenCalled()
  })

  it("opens the right action after a left swipe past the threshold", () => {
    renderRow()
    const layer = screen.getByText("card body").parentElement!
    fireEvent.pointerDown(layer, { clientX: 200, clientY: 100 })
    fireEvent.pointerMove(layer, { clientX: 100, clientY: 110 })
    fireEvent.pointerUp(layer, { clientX: 100, clientY: 110 })
    expect(layer).toHaveStyle({ transform: "translateX(-72px)" })
  })

  it("opens the left action after a right swipe past the threshold", () => {
    renderRow()
    const layer = screen.getByText("card body").parentElement!
    fireEvent.pointerDown(layer, { clientX: 100, clientY: 100 })
    fireEvent.pointerMove(layer, { clientX: 200, clientY: 110 })
    fireEvent.pointerUp(layer, { clientX: 200, clientY: 110 })
    expect(layer).toHaveStyle({ transform: "translateX(72px)" })
  })

  it("ignores vertical drags", () => {
    renderRow()
    const layer = screen.getByText("card body").parentElement!
    fireEvent.pointerDown(layer, { clientX: 200, clientY: 100 })
    fireEvent.pointerMove(layer, { clientX: 210, clientY: 400 })
    fireEvent.pointerUp(layer, { clientX: 210, clientY: 400 })
    expect(layer).toHaveStyle({ transform: "translateX(0px)" })
  })
})
