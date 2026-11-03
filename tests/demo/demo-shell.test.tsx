import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { usePathname } from "next/navigation"

vi.mock("next/font/google", () => ({
  Noto_Serif_TC: () => ({ variable: "font-var-serif" }),
  Noto_Sans_TC: () => ({ variable: "font-var-sans" }),
}))
vi.mock("next/navigation", () => ({ usePathname: vi.fn() }))

import { DemoShell } from "@/components/demo/demo-shell"

describe("DemoShell", () => {
  it("shows the back link on a screen page", () => {
    vi.mocked(usePathname).mockReturnValue("/demo/settle")
    render(<DemoShell><p>content</p></DemoShell>)
    expect(screen.getByRole("link", { name: "回 Demo 目錄" })).toHaveAttribute("href", "/demo")
  })
  it("hides the back link on the index page", () => {
    vi.mocked(usePathname).mockReturnValue("/demo")
    render(<DemoShell><p>content</p></DemoShell>)
    expect(screen.queryByRole("link", { name: "回 Demo 目錄" })).toBeNull()
  })
})
