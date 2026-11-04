import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
vi.mock("next/font/google", () => ({
  Noto_Serif_TC: () => ({ variable: "font-var-serif" }),
  Noto_Sans_TC: () => ({ variable: "font-var-sans" }),
}))
vi.mock("next/image", () => ({ default: (p: { src: string; alt: string }) => <img src={p.src} alt={p.alt} /> }))
import DemoProfilePage from "@/app/demo/profile/page"

describe("demo profile page", () => {
  it("shows the user name", () => {
    render(<DemoProfilePage />)
    expect(screen.getByRole("heading", { name: "個人資料" })).toBeInTheDocument()
    expect(screen.getAllByText("我").length).toBeGreaterThan(0)
  })
})
