import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
vi.mock("next/font/google", () => ({
  Noto_Serif_TC: () => ({ variable: "font-var-serif" }),
  Noto_Sans_TC: () => ({ variable: "font-var-sans" }),
}))
import DemoLoginPage from "@/app/demo/login/page"

describe("demo login page", () => {
  it("renders the login card", () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {})
    render(<DemoLoginPage />)
    expect(screen.getByText("Wander Wallet")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /LINE 登入/ }))
    expect(alertSpy).toHaveBeenCalled()
    alertSpy.mockRestore()
  })
})
