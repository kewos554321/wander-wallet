import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"

vi.mock("next/font/google", () => ({
  Noto_Serif_TC: () => ({ variable: "font-var-serif" }),
  Noto_Sans_TC: () => ({ variable: "font-var-sans" }),
}))

import DemoIndexPage from "@/app/demo/page"

const ROUTES = [
  "/demo/expenses", "/demo/add-expense", "/demo/quick-expense", "/demo/rate-sheet",
  "/demo/projects", "/demo/new-project", "/demo/overview", "/demo/project-settings",
  "/demo/settle", "/demo/profile", "/demo/export", "/demo/login",
]

describe("demo index", () => {
  it("links to all 12 screens", () => {
    render(<DemoIndexPage />)
    for (const href of ROUTES) {
      expect(screen.getByRole("link", { name: new RegExp(href) })).toHaveAttribute("href", href)
    }
  })
})
