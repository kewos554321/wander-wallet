import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { V2Avatar } from "@/components/v2/ui/v2-avatar"

function root(container: HTMLElement): HTMLElement {
  const el = container.querySelector('[aria-hidden="true"]')
  if (!el) throw new Error("avatar root not found")
  return el as HTMLElement
}

describe("V2Avatar", () => {
  it("renders an external image URL and hides the whole avatar from AT", () => {
    const { container } = render(
      <V2Avatar image="https://x/a.png" name="小明" className="h-9 w-9" />
    )
    const img = container.querySelector("img")
    expect(img).not.toBeNull()
    expect(img!.getAttribute("src")).toBe("https://x/a.png")
    expect(root(container).getAttribute("aria-hidden")).toBe("true")
    expect(root(container).className).toContain("h-9 w-9")
  })

  it("renders the custom avatar icon and no fallback initial", () => {
    const { container } = render(<V2Avatar image="avatar:coffee:teal" name="小明" />)
    expect(container.querySelector("img")).toBeNull()
    expect(container.querySelector("svg")).not.toBeNull()
    expect(container.textContent).not.toContain("小")
    expect(root(container).getAttribute("aria-hidden")).toBe("true")
    expect(root(container).style.backgroundColor).toBe("rgb(94, 180, 176)")
  })

  it("falls back to the first character of the name", () => {
    const { container } = render(<V2Avatar image={null} name="小明" />)
    expect(container.querySelector("img")).toBeNull()
    expect(container.textContent).toContain("小")
    expect(root(container).getAttribute("aria-hidden")).toBe("true")
  })

  it('falls back to "?" when there is no name', () => {
    const { container } = render(<V2Avatar image={null} name={null} />)
    expect(container.querySelector("img")).toBeNull()
    expect(container.textContent).toContain("?")
    expect(root(container).getAttribute("aria-hidden")).toBe("true")
  })
})
