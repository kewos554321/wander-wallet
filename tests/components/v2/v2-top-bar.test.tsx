import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { V2TopBar } from "@/components/v2/layout/v2-top-bar"

describe("V2TopBar title classes", () => {
  it("uses the default size and weight when titleClassName is omitted", () => {
    render(<V2TopBar title="結算" backHref="/projects" />)
    const h1 = screen.getByRole("heading", { level: 1, name: "結算" })
    expect(h1.className).toContain("text-base")
    expect(h1.className).toContain("font-medium")
  })

  it("replaces the default size and weight with titleClassName", () => {
    render(<V2TopBar title="成員" backHref="/projects" titleClassName="text-[17px] font-semibold" />)
    const h1 = screen.getByRole("heading", { level: 1, name: "成員" })
    expect(h1.className).toContain("text-[17px]")
    expect(h1.className).toContain("font-semibold")
    expect(h1.className).not.toContain("font-medium")
    expect(h1.className).not.toContain("text-base")
  })

  it("keeps the serif font and back link", () => {
    render(<V2TopBar title="結算" backHref="/projects/p1" titleClassName="font-bold" />)
    expect(screen.getByRole("heading", { level: 1 }).className).toContain("font-v2-serif")
    expect(screen.getByRole("link", { name: "返回" })).toHaveAttribute("href", "/projects/p1")
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
