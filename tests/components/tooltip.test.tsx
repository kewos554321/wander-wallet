import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip"

describe("Tooltip Components", () => {
  describe("TooltipTrigger", () => {
    it("should render trigger element", () => {
      render(
        <Tooltip>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent>Tooltip text</TooltipContent>
        </Tooltip>
      )

      expect(screen.getByText("Hover me")).toBeInTheDocument()
    })

    it("should render children", () => {
      render(
        <Tooltip>
          <TooltipTrigger asChild>
            <button>Button Trigger</button>
          </TooltipTrigger>
          <TooltipContent>Tooltip</TooltipContent>
        </Tooltip>
      )

      // With asChild, only one button is rendered
      expect(screen.getByRole("button", { name: "Button Trigger" })).toBeInTheDocument()
    })

    it("should have data-slot attribute", () => {
      render(
        <Tooltip>
          <TooltipTrigger data-testid="trigger">Trigger</TooltipTrigger>
          <TooltipContent>Tooltip</TooltipContent>
        </Tooltip>
      )

      expect(screen.getByTestId("trigger")).toHaveAttribute("data-slot", "tooltip-trigger")
    })
  })

  describe("TooltipProvider", () => {
    it("should provide tooltip context", () => {
      render(
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>Trigger</TooltipTrigger>
            <TooltipContent>Content</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )

      expect(screen.getByText("Trigger")).toBeInTheDocument()
    })
  })

  describe("Multiple Tooltips", () => {
    it("should render multiple tooltip triggers", () => {
      render(
        <>
          <Tooltip>
            <TooltipTrigger>First</TooltipTrigger>
            <TooltipContent>First tooltip</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger>Second</TooltipTrigger>
            <TooltipContent>Second tooltip</TooltipContent>
          </Tooltip>
        </>
      )

      expect(screen.getByText("First")).toBeInTheDocument()
      expect(screen.getByText("Second")).toBeInTheDocument()
    })
  })
})
