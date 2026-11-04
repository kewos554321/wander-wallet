import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { V2Avatar, avatarSeed } from "@/components/v2/ui/v2-avatar"

function root(container: HTMLElement): HTMLElement {
  const el = container.querySelector('[aria-hidden="true"]')
  if (!el) throw new Error("avatar root not found")
  return el as HTMLElement
}

describe("V2Avatar", () => {
  it("renders an external image URL and hides the whole avatar from AT", () => {
    const { container } = render(<V2Avatar image="https://x/a.png" name="小明" className="h-9 w-9" />)
    expect(container.querySelector("img")).toHaveAttribute("src", "https://x/a.png")
    expect(root(container).getAttribute("aria-hidden")).toBe("true")
    expect(root(container).className).toContain("h-9 w-9")
  })

  it("accepts data URLs and root-relative paths as images", () => {
    const data = render(<V2Avatar image="data:image/png;base64,abc" name="小明" />)
    expect(data.container.querySelector("img")).not.toBeNull()
    const relative = render(<V2Avatar image="/avatars/a.png" name="小明" />)
    expect(relative.container.querySelector("img")).not.toBeNull()
  })

  it("treats a legacy avatar: string as no image and shows the initial", () => {
    const { container } = render(<V2Avatar image="avatar:coffee:teal" name="小明" />)
    expect(container.querySelector("img")).toBeNull()
    expect(container.querySelector("svg")).toBeNull()
    expect(container.textContent).toContain("小")
  })

  it("falls back to the first character of the name", () => {
    const { container } = render(<V2Avatar image={null} name="小明" />)
    expect(container.textContent).toContain("小")
    expect(root(container).getAttribute("aria-hidden")).toBe("true")
  })

  it('falls back to "?" when there is no name', () => {
    const { container } = render(<V2Avatar image={null} name={null} />)
    expect(container.textContent).toContain("?")
  })

  it("renders a placeholder as a sand initial with the placeholder test id", () => {
    const { container } = render(<V2Avatar image={null} name="阿凱" placeholder />)
    const el = root(container)
    expect(el).toHaveAttribute("data-testid", "placeholder-avatar")
    expect(el.className).toContain("bg-v2-sand")
    expect(el.textContent).toContain("阿")
  })

  it('shows "?" for a nameless placeholder', () => {
    const { container } = render(<V2Avatar image={null} name={null} placeholder />)
    expect(container.textContent).toContain("?")
  })

  it("uses the seed so the same member keeps the same colour", () => {
    const first = render(<V2Avatar image={null} name="小明" seed="m1" />)
    const second = render(<V2Avatar image={null} name="小美" seed="m1" />)
    expect(root(first.container).className).toBe(root(second.container).className)
  })

  it("uses different tones for different seeds", () => {
    const first = render(<V2Avatar image={null} name="A" seed="m1" />)
    const second = render(<V2Avatar image={null} name="A" seed="m2" />)
    expect(root(first.container).className).not.toBe(root(second.container).className)
  })

  it("uses the linked user id as the seed and only falls back to the member id", () => {
    expect(avatarSeed("u1", "m1")).toBe("u1")
    expect(avatarSeed("u1", "m2")).toBe("u1")
    expect(avatarSeed(null, "m1")).toBe("m1")
    expect(avatarSeed(undefined, undefined)).toBeUndefined()
  })

  it("uses the on-lake variant on dark surfaces", () => {
    const { container } = render(<V2Avatar image={null} name="小明" variant="on-lake" />)
    expect(root(container).className).toContain("bg-v2-paper/15")
  })

  it("uses the lake brand colour for the brand variant", () => {
    const { container } = render(<V2Avatar image={null} name="小明" variant="brand" />)
    expect(root(container)).toHaveClass("bg-v2-lake")
    expect(root(container)).toHaveClass("text-v2-on-lake")
  })
})
