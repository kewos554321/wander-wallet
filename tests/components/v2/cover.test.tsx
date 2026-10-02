import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
vi.mock("next/image", () => ({ default: (p: { src: string; alt: string }) => <img src={p.src} alt={p.alt} /> }))
vi.mock("@/lib/image-utils", () => ({ compressImage: vi.fn().mockResolvedValue("data:image/webp;base64,AAAA") }))
import { CoverArt } from "@/components/v2/cover/cover-art"
import { CoverPickerV2 } from "@/components/v2/cover/cover-picker-v2"

describe("CoverArt", () => {
  it("renders icon covers with their color", () => {
    render(<CoverArt cover="icon:car;color:gold" />)
    const box = screen.getByTestId("cover-art")
    expect(box).toHaveAttribute("data-cover", "icon:car")
    expect(box.style.getPropertyValue("--cover-bg")).toBe("#F6ECCF")
    expect(box.style.getPropertyValue("--cover-fg")).toBe("#9C7A28")
    expect(box.style.getPropertyValue("--cover-bg-dark")).toBe("#332A16")
    expect(box.style.getPropertyValue("--cover-fg-dark")).toBe("#D4AE55")
  })
  it("falls back to the default leaf", () => {
    render(<CoverArt cover="icon:rocket;color:lake" />)
    expect(screen.getByTestId("cover-art")).toHaveAttribute("data-cover", "icon:leaf")
  })
  it("renders custom images and presets", () => {
    const { rerender } = render(<CoverArt cover="https://x.com/a.jpg" />)
    expect(screen.getByRole("img")).toHaveAttribute("src", "https://x.com/a.jpg")
    rerender(<CoverArt cover="preset:1" />)
    expect(screen.getByTestId("cover-art")).toHaveAttribute("data-cover", "preset:1")
  })
  it("renders an existing red cover for old data", () => {
    render(<CoverArt cover="icon:compass;color:red" />)
    const box = screen.getByTestId("cover-art")
    expect(box).toHaveAttribute("data-cover", "icon:compass")
    expect(box.style.getPropertyValue("--cover-fg")).toBe("#C4472F")
  })
  it("renders a solid icon cover with the on-lake icon color", () => {
    render(<CoverArt cover="icon:car;color:gold" variant="solid" />)
    const box = screen.getByTestId("cover-art")
    expect(box).toHaveAttribute("data-cover-art-solid", "")
    expect(box.style.getPropertyValue("--cover-bg")).toBe("#9C7A28")
    expect(box.style.getPropertyValue("--cover-bg-dark")).toBe("#D4AE55")
    expect(box.style.getPropertyValue("--cover-fg")).toBe("var(--v2-on-lake)")
    expect(box.style.getPropertyValue("--cover-fg-dark")).toBe("var(--v2-on-lake)")
  })
})

describe("CoverPickerV2", () => {
  it("picks icon then color, keeping the other part", () => {
    const onChange = vi.fn()
    const { rerender } = render(<CoverPickerV2 value={null} onChange={onChange} />)
    fireEvent.click(screen.getByRole("button", { name: "汽車" }))
    expect(onChange).toHaveBeenLastCalledWith("icon:car;color:lake")
    rerender(<CoverPickerV2 value="icon:car;color:lake" onChange={onChange} />)
    expect(screen.getByRole("button", { name: "汽車" })).toHaveAttribute("aria-pressed", "true")
    fireEvent.click(screen.getByRole("button", { name: "顏色 gold" }))
    expect(onChange).toHaveBeenLastCalledWith("icon:car;color:gold")
  })
  it("uploads a custom image as base64 and can remove it", async () => {
    const onChange = vi.fn()
    const { container, rerender } = render(<CoverPickerV2 value={null} onChange={onChange} />)
    fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [new File(["a"], "a.png", { type: "image/png" })] } })
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith("data:image/webp;base64,AAAA"))
    rerender(<CoverPickerV2 value="data:image/webp;base64,AAAA" onChange={onChange} />)
    fireEvent.click(screen.getByRole("button", { name: "移除自訂圖片" }))
    expect(onChange).toHaveBeenLastCalledWith("icon:leaf;color:lake")
  })
  it("does not submit form when clicking icon or color buttons", () => {
    const onChange = vi.fn()
    const submit = vi.fn()
    const { rerender } = render(
      <form onSubmit={submit}>
        <CoverPickerV2 value={null} onChange={onChange} />
      </form>
    )
    fireEvent.click(screen.getByRole("button", { name: "汽車" }))
    expect(submit).not.toHaveBeenCalled()
    rerender(
      <form onSubmit={submit}>
        <CoverPickerV2 value="icon:car;color:lake" onChange={onChange} />
      </form>
    )
    fireEvent.click(screen.getByRole("button", { name: "顏色 gold" }))
    expect(submit).not.toHaveBeenCalled()
    expect(screen.getByRole("button", { name: "汽車" })).toHaveClass("ring-2")
  })
})
