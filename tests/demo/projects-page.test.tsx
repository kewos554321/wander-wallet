import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
vi.mock("next/font/google", () => ({
  Noto_Serif_TC: () => ({ variable: "font-var-serif" }),
  Noto_Sans_TC: () => ({ variable: "font-var-sans" }),
}))
import DemoProjectsPage from "@/app/demo/projects/page"

describe("demo projects page", () => {
  it("lists the demo trip", () => {
    render(<DemoProjectsPage />)
    expect(screen.getByRole("link", { name: /東京之旅/ })).toBeInTheDocument()
  })
})
