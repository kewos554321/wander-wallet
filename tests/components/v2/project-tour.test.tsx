import { describe, it, expect, vi, beforeEach } from "vitest"
import { render } from "@testing-library/react"

const driverSpy = vi.hoisted(() => ({ config: null as Record<string, unknown> | null, calls: 0 }))
const driverInstance = vi.hoisted(() => ({
  drive: vi.fn(),
  destroy: vi.fn(),
  hasNextStep: vi.fn(() => false),
}))

vi.mock("driver.js", () => ({
  driver: (config: Record<string, unknown>) => {
    driverSpy.config = config
    driverSpy.calls += 1
    return driverInstance
  },
}))

import {
  PROJECT_TOUR_STEPS,
  PROJECT_TOUR_POPOVER_CLASS,
  ProjectTour,
} from "@/components/v2/onboarding/project-tour"

describe("ProjectTour", () => {
  beforeEach(() => {
    driverSpy.config = null
    driverSpy.calls = 0
    driverInstance.drive.mockClear()
    driverInstance.destroy.mockClear()
    driverInstance.hasNextStep.mockReset()
    driverInstance.hasNextStep.mockReturnValue(false)
  })

  it("targets the v2 overview anchors in order", () => {
    expect(PROJECT_TOUR_STEPS.map((step) => step.element ?? null)).toEqual([
      null,
      "[data-tour='trip-summary']",
      "[data-tour='feature-grid']",
      "[data-tour='share']",
      "[data-tour='add-expense-area']",
      null,
    ])
  })

  it("starts driver with the v2 popover class", () => {
    render(<ProjectTour onComplete={vi.fn()} />)

    expect(driverSpy.config?.popoverClass).toBe(PROJECT_TOUR_POPOVER_CLASS)
    expect(driverInstance.drive).toHaveBeenCalledOnce()
  })

  it("completes onboarding when the tour is dismissed on the last step", () => {
    const onComplete = vi.fn()
    const onSkip = vi.fn()
    render(<ProjectTour onComplete={onComplete} onSkip={onSkip} />)

    driverInstance.hasNextStep.mockReturnValue(false)
    ;(driverSpy.config?.onDestroyStarted as () => void)()

    expect(onSkip).not.toHaveBeenCalled()
    expect(onComplete).toHaveBeenCalledOnce()
  })

  it("counts an early close as a skip instead of a completion", () => {
    const onComplete = vi.fn()
    const onSkip = vi.fn()
    render(<ProjectTour onComplete={onComplete} onSkip={onSkip} />)

    driverInstance.hasNextStep.mockReturnValue(true)
    ;(driverSpy.config?.onDestroyStarted as () => void)()

    expect(onSkip).toHaveBeenCalledOnce()
    expect(onComplete).not.toHaveBeenCalled()
  })

  it("does not restart the tour when the callbacks change", () => {
    const { rerender } = render(<ProjectTour onComplete={vi.fn()} />)
    rerender(<ProjectTour onComplete={vi.fn()} />)

    expect(driverSpy.calls).toBe(1)
  })

  it("destroys the tour on unmount", () => {
    const { unmount } = render(<ProjectTour onComplete={vi.fn()} />)

    unmount()

    expect(driverInstance.destroy).toHaveBeenCalled()
  })
})
