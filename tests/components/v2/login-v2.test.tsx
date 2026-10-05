import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { LoginV2 } from "@/components/v2/auth/login-v2"

vi.mock("next/font/google", () => ({
  Noto_Serif_TC: () => ({ variable: "font-var-serif" }),
  Noto_Sans_TC: () => ({ variable: "font-var-sans" }),
}))

describe("LoginV2", () => {
  it("renders the brand card and calls onLogin", () => {
    const onLogin = vi.fn()
    render(<LoginV2 isDevMode={false} onLogin={onLogin} />)
    expect(screen.getByTestId("login-v2")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Wander Wallet" })).toBeInTheDocument()
    expect(screen.getByText("旅行分帳好幫手")).toBeInTheDocument()
    expect(screen.getByText("和旅伴一起輕鬆記帳、安心同行")).toBeInTheDocument()
    expect(screen.getByText(/登入即表示你同意/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /使用 LINE 登入/ }))
    expect(onLogin).toHaveBeenCalledTimes(1)
  })

  it("labels the dev-mode button and shows the dev note", () => {
    render(<LoginV2 isDevMode onLogin={vi.fn()} />)
    expect(screen.getByRole("button", { name: /開發模式登入/ })).toBeInTheDocument()
    expect(screen.getByText(/LIFF ID 未設定/)).toBeInTheDocument()
  })
})
