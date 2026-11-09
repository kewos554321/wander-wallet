import { StrictMode } from "react"
import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from "vitest"
import { render, fireEvent, act } from "@testing-library/react"

import { useDialogHistory } from "@/components/v2/use-dialog-history"

function Harness({ open, onClose, id = "test-dialog" }: { open: boolean; onClose: () => void; id?: string }) {
  useDialogHistory(open, onClose, id)
  return open ? <button onClick={onClose}>關閉</button> : null
}

let backMock: MockInstance

beforeEach(() => {
  window.history.replaceState(null, "")
  backMock = vi.spyOn(window.history, "back").mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("useDialogHistory", () => {
  it("pushes one history entry when the dialog opens", () => {
    const before = window.history.length
    render(<Harness open onClose={vi.fn()} />)

    expect(window.history.state?.__v2Dialog).toBe("__v2Dialog:test-dialog")
    expect(window.history.length).toBe(before + 1)
  })

  it("does not touch history when it starts closed", () => {
    render(<Harness open={false} onClose={vi.fn()} />)

    expect(window.history.state).toBeNull()
    expect(backMock).not.toHaveBeenCalled()
  })

  it("closes the dialog instead of navigating when the phone back button is pressed", () => {
    const onClose = vi.fn()
    render(<Harness open onClose={onClose} />)

    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate", { state: null }))
    })

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("stays open when a deeper layer pops back onto its own entry", () => {
    const onClose = vi.fn()
    const before = window.history.length
    render(<Harness open onClose={onClose} />)
    expect(window.history.length).toBe(before + 1)

    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate", { state: { __v2Dialog: "__v2Dialog:test-dialog" } }))
    })

    expect(onClose).not.toHaveBeenCalled()
  })

  it("pushes only one entry under StrictMode", () => {
    const before = window.history.length
    render(
      <StrictMode>
        <Harness open onClose={vi.fn()} />
      </StrictMode>
    )

    expect(window.history.length).toBe(before + 1)
    expect(backMock).not.toHaveBeenCalled()
  })

  it("pops its history entry when the dialog is closed programmatically", () => {
    const onClose = vi.fn()
    const { rerender } = render(<Harness open onClose={onClose} />)

    fireEvent.click(document.querySelector("button")!)
    rerender(<Harness open={false} onClose={onClose} />)

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(backMock).toHaveBeenCalledTimes(1)
  })

  it("does not pop an entry it never pushed", () => {
    const { rerender } = render(<Harness open={false} onClose={vi.fn()} />)
    rerender(<Harness open={false} onClose={vi.fn()} />)

    expect(backMock).not.toHaveBeenCalled()
  })
})
