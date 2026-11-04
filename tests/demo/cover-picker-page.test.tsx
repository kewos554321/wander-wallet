import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"

vi.mock("next/font/google", () => ({
  Noto_Serif_TC: () => ({ variable: "font-var-serif" }),
  Noto_Sans_TC: () => ({ variable: "font-var-sans" }),
}))
vi.mock("next/image", () => ({ default: (p: { src: string; alt: string }) => <img src={p.src} alt={p.alt} /> }))
import CoverPickerDemoPage from "@/app/demo/cover-picker/page"

describe("demo cover-picker page", () => {
  it("previews the selected classic cover and updates live", () => {
    render(<CoverPickerDemoPage />)
    expect(screen.getByText("目前封面")).toBeInTheDocument()
    expect(screen.getByText("preset:2")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "展開經典封面" }))
    expect(screen.getByRole("button", { name: "經典封面 海灘度假" })).toHaveAttribute("aria-pressed", "true")

    fireEvent.click(screen.getByRole("button", { name: "汽車" }))
    expect(screen.getByText("icon:car;color:lake")).toBeInTheDocument()
  })
})
