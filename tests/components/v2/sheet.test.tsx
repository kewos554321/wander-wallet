import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from "vitest"
import { render, act, fireEvent } from "@testing-library/react"

import { Sheet } from "@/components/v2/ui/sheet"

let backMock: MockInstance

beforeEach(() => {
  window.history.replaceState(null, "")
  backMock = vi.spyOn(window.history, "back").mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

function Harness({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} label="測試彈層">
      <button>內容</button>
    </Sheet>
  )
}

describe("Sheet history", () => {
  it("closes instead of navigating away when the phone back button is pressed", () => {
    const onClose = vi.fn()
    render(<Harness open onClose={onClose} />)
    expect(window.history.state?.__v2Dialog).toBe("__v2Dialog:測試彈層")

    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate", { state: null }))
    })

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("pops its history entry when closed with the backdrop", () => {
    const onClose = vi.fn()
    const { rerender } = render(<Harness open onClose={onClose} />)

    fireEvent.click(document.querySelector(".fixed.inset-0")!)
    rerender(<Harness open={false} onClose={onClose} />)

    expect(backMock).toHaveBeenCalledTimes(1)
  })
})
