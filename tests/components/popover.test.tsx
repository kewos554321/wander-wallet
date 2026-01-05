import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverAnchor,
} from "@/components/ui/popover"

describe("Popover Components", () => {
  describe("Popover", () => {
    it("should render trigger", () => {
      render(
        <Popover>
          <PopoverTrigger>Open Popover</PopoverTrigger>
          <PopoverContent>Popover content</PopoverContent>
        </Popover>
      )

      expect(screen.getByText("Open Popover")).toBeInTheDocument()
    })

    it("should not show content when controlled as closed", () => {
      render(
        <Popover open={false}>
          <PopoverTrigger>Trigger</PopoverTrigger>
          <PopoverContent>Hidden content</PopoverContent>
        </Popover>
      )

      expect(screen.queryByText("Hidden content")).not.toBeInTheDocument()
    })
  })

  describe("PopoverTrigger", () => {
    it("should have data-slot attribute", () => {
      render(
        <Popover>
          <PopoverTrigger data-testid="trigger">Trigger</PopoverTrigger>
          <PopoverContent>Content</PopoverContent>
        </Popover>
      )

      expect(screen.getByTestId("trigger")).toHaveAttribute("data-slot", "popover-trigger")
    })

    it("should support asChild", () => {
      render(
        <Popover>
          <PopoverTrigger asChild>
            <button type="button">Custom Button</button>
          </PopoverTrigger>
          <PopoverContent>Content</PopoverContent>
        </Popover>
      )

      expect(screen.getByRole("button", { name: "Custom Button" })).toBeInTheDocument()
    })
  })

  describe("PopoverAnchor", () => {
    it("should have data-slot attribute", () => {
      render(
        <Popover>
          <PopoverAnchor data-testid="anchor">Anchor Element</PopoverAnchor>
          <PopoverTrigger>Trigger</PopoverTrigger>
          <PopoverContent>Content</PopoverContent>
        </Popover>
      )

      expect(screen.getByTestId("anchor")).toHaveAttribute("data-slot", "popover-anchor")
    })
  })

  // Note: PopoverContent with open state causes JSDOM issues with ResizeObserver
  // Content styling and data-slot are tested through integration testing
})
