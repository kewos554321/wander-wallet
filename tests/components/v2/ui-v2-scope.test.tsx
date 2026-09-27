import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"

vi.mock("next/font/google", () => ({
  Noto_Serif_TC: () => ({ variable: "font-var-serif" }),
  Noto_Sans_TC: () => ({ variable: "font-var-sans" }),
}))

import { UiV2Scope } from "@/components/v2/ui-v2-scope"
import { V2TopBar } from "@/components/v2/layout/v2-top-bar"

describe("UiV2Scope", () => {
  it("marks its subtree as v2 and applies font variables", () => {
    render(
      <UiV2Scope>
        <p>content</p>
      </UiV2Scope>
    )
    const scope = screen.getByText("content").parentElement!
    expect(scope).toHaveAttribute("data-ui", "v2")
    expect(scope.className).toContain("font-var-serif")
    expect(scope.className).toContain("font-var-sans")
  })
})

describe("V2TopBar", () => {
  it("renders title, back link and actions", () => {
    render(<V2TopBar title="旅程總覽" backHref="/projects" actions={<button>分享</button>} />)
    expect(screen.getByRole("heading", { name: "旅程總覽" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "返回" })).toHaveAttribute("href", "/projects")
    expect(screen.getByRole("button", { name: "分享" })).toBeInTheDocument()
  })
})
