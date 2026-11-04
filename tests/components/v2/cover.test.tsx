import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
vi.mock("next/image", () => ({ default: (p: { src: string; alt: string }) => <img src={p.src} alt={p.alt} /> }))
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
  it("renders the brand logo for the first classic cover", () => {
    render(<CoverArt cover="preset:1" />)
    expect(screen.getByRole("img")).toHaveAttribute("src", "/icons/logo.svg")
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
  it("expands and collapses the extra icons", () => {
    render(<CoverPickerV2 value={null} onChange={vi.fn()} />)
    const more = screen.getByRole("button", { name: "更多圖示" })
    expect(more).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByRole("button", { name: "飛機" })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "相機" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "亮點" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "顏色 red" })).not.toBeInTheDocument()

    fireEvent.click(more)
    expect(more).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByRole("button", { name: "飛機" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "地標" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "行李" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "森林" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "計程車" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "日落" })).toBeInTheDocument()

    fireEvent.click(more)
    expect(more).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByRole("button", { name: "飛機" })).not.toBeInTheDocument()
  })
  it("keeps the classic covers collapsed until expanded", () => {
    render(<CoverPickerV2 value={null} onChange={vi.fn()} />)
    const toggle = screen.getByRole("button", { name: "展開經典封面" })
    expect(toggle).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByRole("button", { name: "經典封面 海灘度假" })).not.toBeInTheDocument()

    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute("aria-expanded", "true")
    expect(screen.getAllByRole("button", { name: /^經典封面/ })).toHaveLength(9)

    fireEvent.click(screen.getByRole("button", { name: "收起經典封面" }))
    expect(screen.queryByRole("button", { name: "經典封面 海灘度假" })).not.toBeInTheDocument()
  })
  it("lists the nine v1 classic covers and selects one", () => {
    const onChange = vi.fn()
    const { rerender } = render(<CoverPickerV2 value={null} onChange={onChange} />)
    fireEvent.click(screen.getByRole("button", { name: "展開經典封面" }))
    expect(screen.getAllByRole("button", { name: /^經典封面/ })).toHaveLength(9)
    fireEvent.click(screen.getByRole("button", { name: "經典封面 海灘度假" }))
    expect(onChange).toHaveBeenLastCalledWith("preset:2")
    rerender(<CoverPickerV2 value="preset:2" onChange={onChange} />)
    expect(screen.getByRole("button", { name: "經典封面 海灘度假" })).toHaveAttribute("aria-pressed", "true")
  })
  it("does not mark an icon color when a classic cover is selected", () => {
    render(<CoverPickerV2 value="preset:2" onChange={vi.fn()} />)
    expect(screen.getByRole("button", { name: "顏色 lake" })).toHaveAttribute("aria-pressed", "false")
  })
  it("offers no upload but can remove a custom image", () => {
    const onChange = vi.fn()
    const { container } = render(<CoverPickerV2 value="data:image/webp;base64,AAAA" onChange={onChange} />)
    expect(screen.queryByText("或上傳自訂圖片")).not.toBeInTheDocument()
    expect(container.querySelector('input[type="file"]')).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "移除自訂圖片" }))
    expect(onChange).toHaveBeenLastCalledWith("icon:leaf;color:lake")
  })
  it("marks the selected color tile", () => {
    render(<CoverPickerV2 value="icon:car;color:gold" onChange={vi.fn()} />)
    expect(screen.getByRole("button", { name: "顏色 gold" })).toHaveAttribute("aria-pressed", "true")
  })
  it("shows fourteen cover colors", () => {
    render(<CoverPickerV2 value={null} onChange={vi.fn()} />)
    expect(screen.getAllByRole("button", { name: /^顏色/ })).toHaveLength(14)
    expect(screen.getByRole("button", { name: "顏色 mint" })).toBeInTheDocument()
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
    expect(screen.getByRole("button", { name: "汽車" })).toHaveAttribute("aria-pressed", "true")
  })
})
