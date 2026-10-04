import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { V2TopBar } from "@/components/v2/layout/v2-top-bar"

describe("V2TopBar", () => {
  it("renders the title as a level-1 heading with a back link", () => {
    render(<V2TopBar title="結算" backHref="/projects" />)
    expect(screen.getByRole("heading", { level: 1, name: "結算" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "返回" })).toHaveAttribute("href", "/projects")
  })

  it("renders supplied actions next to the title", () => {
    render(<V2TopBar title="成員" backHref="/projects/p1" actions={<button>儲存</button>} />)
    expect(screen.getByRole("heading", { level: 1, name: "成員" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "儲存" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "返回" })).toHaveAttribute("href", "/projects/p1")
  })

  it("applies the v2 serif font token to the title", () => {
    render(<V2TopBar title="結算" backHref="/projects" titleClassName="text-[17px] font-semibold" />)
    // Intentional token check: the v2 serif typeface is a design contract
    // retained while titleClassName customises the size/weight.
    expect(screen.getByRole("heading", { level: 1, name: "結算" }).className).toContain("font-v2-serif")
  })

  it("overrides the back control classes when backClassName is given", () => {
    render(<V2TopBar title="旅程總覽" backHref="/projects" backClassName="flex items-center justify-center" />)
    expect(screen.getByRole("link", { name: "返回" }).className).toBe("flex items-center justify-center")
  })

  it("ignores history and uses backHref when fixedBack is set", () => {
    const back = vi.spyOn(window.history, "back").mockImplementation(() => {})
    Object.defineProperty(window.history, "length", { configurable: true, get: () => 2 })
    try {
      render(<V2TopBar title="旅程總覽" backHref="/projects" fixedBack backAriaLabel="回旅程列表" />)
      const link = screen.getByRole("link", { name: "回旅程列表" })
      expect(link).toHaveAttribute("href", "/projects")
      fireEvent.click(link)
      expect(back).not.toHaveBeenCalled()
    } finally {
      back.mockRestore()
      delete (window.history as unknown as { length?: unknown }).length
    }
  })

  it("goes back in history when a previous entry exists", () => {
    const back = vi.spyOn(window.history, "back").mockImplementation(() => {})
    Object.defineProperty(window.history, "length", { configurable: true, get: () => 2 })
    try {
      render(<V2TopBar title="結算" backHref="/projects" />)
      fireEvent.click(screen.getByRole("link", { name: "返回" }))
      expect(back).toHaveBeenCalledTimes(1)
    } finally {
      back.mockRestore()
      delete (window.history as unknown as { length?: unknown }).length
    }
  })
})
