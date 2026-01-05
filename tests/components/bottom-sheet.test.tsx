import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { BottomSheet } from "@/components/ui/bottom-sheet"

describe("BottomSheet Component", () => {
  describe("rendering", () => {
    it("should not render when open is false", () => {
      render(
        <BottomSheet open={false} onClose={vi.fn()}>
          <div>Content</div>
        </BottomSheet>
      )

      expect(screen.queryByText("Content")).not.toBeInTheDocument()
    })

    it("should render when open is true", () => {
      render(
        <BottomSheet open={true} onClose={vi.fn()}>
          <div>Sheet Content</div>
        </BottomSheet>
      )

      expect(screen.getByText("Sheet Content")).toBeInTheDocument()
    })

    it("should render title when provided", () => {
      render(
        <BottomSheet open={true} onClose={vi.fn()} title="My Title">
          <div>Content</div>
        </BottomSheet>
      )

      expect(screen.getByText("My Title")).toBeInTheDocument()
    })

    it("should not render title when not provided", () => {
      render(
        <BottomSheet open={true} onClose={vi.fn()}>
          <div>Just content</div>
        </BottomSheet>
      )

      expect(screen.queryByText("取消")).not.toBeInTheDocument()
    })

    it("should render cancel button with title", () => {
      render(
        <BottomSheet open={true} onClose={vi.fn()} title="Title">
          <div>Content</div>
        </BottomSheet>
      )

      expect(screen.getByText("取消")).toBeInTheDocument()
    })
  })

  describe("interactions", () => {
    it("should call onClose when backdrop is clicked", async () => {
      const onClose = vi.fn()
      const user = userEvent.setup()

      const { container } = render(
        <BottomSheet open={true} onClose={onClose}>
          <div>Content</div>
        </BottomSheet>
      )

      // Click backdrop (the element with bg-black/40)
      const backdrop = container.querySelector(".bg-black\\/40")
      if (backdrop) {
        await user.click(backdrop)
      }

      expect(onClose).toHaveBeenCalled()
    })

    it("should call onClose when cancel button is clicked", async () => {
      const onClose = vi.fn()
      const user = userEvent.setup()

      render(
        <BottomSheet open={true} onClose={onClose} title="Title">
          <div>Content</div>
        </BottomSheet>
      )

      await user.click(screen.getByText("取消"))

      expect(onClose).toHaveBeenCalled()
    })
  })

  describe("body scroll behavior", () => {
    it("should set overflow hidden when open", () => {
      render(
        <BottomSheet open={true} onClose={vi.fn()}>
          <div>Content</div>
        </BottomSheet>
      )

      expect(document.body.style.overflow).toBe("hidden")
    })

    it("should reset overflow when closed", () => {
      const { rerender } = render(
        <BottomSheet open={true} onClose={vi.fn()}>
          <div>Content</div>
        </BottomSheet>
      )

      expect(document.body.style.overflow).toBe("hidden")

      rerender(
        <BottomSheet open={false} onClose={vi.fn()}>
          <div>Content</div>
        </BottomSheet>
      )

      expect(document.body.style.overflow).toBe("")
    })

    it("should reset overflow on unmount", () => {
      const { unmount } = render(
        <BottomSheet open={true} onClose={vi.fn()}>
          <div>Content</div>
        </BottomSheet>
      )

      expect(document.body.style.overflow).toBe("hidden")

      unmount()

      expect(document.body.style.overflow).toBe("")
    })
  })

  describe("structure", () => {
    it("should render handle bar", () => {
      const { container } = render(
        <BottomSheet open={true} onClose={vi.fn()}>
          <div>Content</div>
        </BottomSheet>
      )

      // Check for handle bar styling
      const handle = container.querySelector(".w-10.h-1.rounded-full")
      expect(handle).toBeInTheDocument()
    })

    it("should render children in content area", () => {
      render(
        <BottomSheet open={true} onClose={vi.fn()}>
          <button>Action Button</button>
          <p>Some text</p>
        </BottomSheet>
      )

      expect(screen.getByRole("button", { name: "Action Button" })).toBeInTheDocument()
      expect(screen.getByText("Some text")).toBeInTheDocument()
    })
  })
})
