import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu"

// Note: Full interaction tests with content are limited due to JSDOM issues with ResizeObserver
// These tests focus on basic rendering and exported components

describe("DropdownMenu Components", () => {
  describe("DropdownMenu", () => {
    it("should render children", () => {
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        </DropdownMenu>
      )

      expect(screen.getByText("Open")).toBeInTheDocument()
    })

    it("should accept open prop", () => {
      render(
        <DropdownMenu open={false}>
          <DropdownMenuTrigger>Closed Menu</DropdownMenuTrigger>
        </DropdownMenu>
      )

      expect(screen.getByText("Closed Menu")).toBeInTheDocument()
    })

    it("should accept onOpenChange callback", () => {
      const onOpenChange = vi.fn()
      render(
        <DropdownMenu onOpenChange={onOpenChange}>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        </DropdownMenu>
      )

      expect(screen.getByText("Open")).toBeInTheDocument()
    })
  })

  describe("DropdownMenuTrigger", () => {
    it("should render trigger button", () => {
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
        </DropdownMenu>
      )

      expect(screen.getByText("Open Menu")).toBeInTheDocument()
    })

    it("should have data-slot attribute", () => {
      const { container } = render(
        <DropdownMenu>
          <DropdownMenuTrigger>Trigger</DropdownMenuTrigger>
        </DropdownMenu>
      )

      const trigger = container.querySelector('[data-slot="dropdown-menu-trigger"]')
      expect(trigger).toBeInTheDocument()
    })

    it("should accept custom className", () => {
      render(
        <DropdownMenu>
          <DropdownMenuTrigger className="custom-trigger-class">
            Trigger
          </DropdownMenuTrigger>
        </DropdownMenu>
      )

      expect(screen.getByText("Trigger")).toHaveClass("custom-trigger-class")
    })

    it("should render with asChild prop", () => {
      render(
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="custom-button">Custom Button</button>
          </DropdownMenuTrigger>
        </DropdownMenu>
      )

      expect(screen.getByText("Custom Button")).toHaveClass("custom-button")
    })
  })

  describe("DropdownMenuShortcut", () => {
    it("should render shortcut span", () => {
      render(<DropdownMenuShortcut>⌘C</DropdownMenuShortcut>)

      expect(screen.getByText("⌘C")).toBeInTheDocument()
    })

    it("should have data-slot attribute", () => {
      const { container } = render(<DropdownMenuShortcut>⌘V</DropdownMenuShortcut>)

      const shortcut = container.querySelector('[data-slot="dropdown-menu-shortcut"]')
      expect(shortcut).toBeInTheDocument()
    })

    it("should accept custom className", () => {
      render(<DropdownMenuShortcut className="custom-shortcut">⌘X</DropdownMenuShortcut>)

      expect(screen.getByText("⌘X")).toHaveClass("custom-shortcut")
    })
  })

  describe("export verification", () => {
    it("should export all main components", () => {
      expect(DropdownMenu).toBeDefined()
      expect(typeof DropdownMenu).toBe("function")
    })

    it("should export DropdownMenuPortal", () => {
      expect(DropdownMenuPortal).toBeDefined()
      expect(typeof DropdownMenuPortal).toBe("function")
    })

    it("should export DropdownMenuTrigger", () => {
      expect(DropdownMenuTrigger).toBeDefined()
      expect(typeof DropdownMenuTrigger).toBe("function")
    })

    it("should export DropdownMenuContent", () => {
      expect(DropdownMenuContent).toBeDefined()
      expect(typeof DropdownMenuContent).toBe("function")
    })

    it("should export DropdownMenuGroup", () => {
      expect(DropdownMenuGroup).toBeDefined()
      expect(typeof DropdownMenuGroup).toBe("function")
    })

    it("should export DropdownMenuLabel", () => {
      expect(DropdownMenuLabel).toBeDefined()
      expect(typeof DropdownMenuLabel).toBe("function")
    })

    it("should export DropdownMenuItem", () => {
      expect(DropdownMenuItem).toBeDefined()
      expect(typeof DropdownMenuItem).toBe("function")
    })

    it("should export DropdownMenuCheckboxItem", () => {
      expect(DropdownMenuCheckboxItem).toBeDefined()
      expect(typeof DropdownMenuCheckboxItem).toBe("function")
    })

    it("should export DropdownMenuRadioGroup", () => {
      expect(DropdownMenuRadioGroup).toBeDefined()
      expect(typeof DropdownMenuRadioGroup).toBe("function")
    })

    it("should export DropdownMenuRadioItem", () => {
      expect(DropdownMenuRadioItem).toBeDefined()
      expect(typeof DropdownMenuRadioItem).toBe("function")
    })

    it("should export DropdownMenuSeparator", () => {
      expect(DropdownMenuSeparator).toBeDefined()
      expect(typeof DropdownMenuSeparator).toBe("function")
    })

    it("should export DropdownMenuShortcut", () => {
      expect(DropdownMenuShortcut).toBeDefined()
      expect(typeof DropdownMenuShortcut).toBe("function")
    })

    it("should export DropdownMenuSub", () => {
      expect(DropdownMenuSub).toBeDefined()
      expect(typeof DropdownMenuSub).toBe("function")
    })

    it("should export DropdownMenuSubTrigger", () => {
      expect(DropdownMenuSubTrigger).toBeDefined()
      expect(typeof DropdownMenuSubTrigger).toBe("function")
    })

    it("should export DropdownMenuSubContent", () => {
      expect(DropdownMenuSubContent).toBeDefined()
      expect(typeof DropdownMenuSubContent).toBe("function")
    })
  })

  describe("component types", () => {
    it("should accept valid props for DropdownMenu", () => {
      // Type checking - these should compile without error
      render(
        <DropdownMenu modal={false} dir="ltr">
          <DropdownMenuTrigger>Menu</DropdownMenuTrigger>
        </DropdownMenu>
      )

      expect(screen.getByText("Menu")).toBeInTheDocument()
    })

    it("should accept defaultOpen prop", () => {
      render(
        <DropdownMenu defaultOpen={false}>
          <DropdownMenuTrigger>Menu</DropdownMenuTrigger>
        </DropdownMenu>
      )

      expect(screen.getByText("Menu")).toBeInTheDocument()
    })
  })

  // Note: Tests with defaultOpen={true} are skipped due to JSDOM/ResizeObserver limitations
  // Components that render with DropdownMenuContent when open require ResizeObserver
  // which is not available in the test environment
})
