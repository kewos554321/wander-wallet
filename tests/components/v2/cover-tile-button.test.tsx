import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
vi.mock("next/image", () => ({ default: (p: { src: string; alt: string }) => <img src={p.src} alt={p.alt} /> }))
import { CoverTileButton } from "@/components/v2/cover/cover-tile-button"

describe("CoverTileButton", () => {
  it("opens a cover picker whose content scrolls inside the phone viewport", () => {
    render(<CoverTileButton cover={null} onChange={vi.fn()} />)
    fireEvent.click(screen.getByRole("button", { name: "更換封面" }))

    expect(screen.getByRole("dialog", { name: "更換封面" })).toBeInTheDocument()
    const scroll = screen.getByTestId("cover-picker-scroll")
    expect(scroll).toHaveClass("min-h-0", "flex-1", "overflow-y-auto", "overscroll-contain")
    expect(screen.getByRole("button", { name: "完成" })).toBeInTheDocument()
  })
})
