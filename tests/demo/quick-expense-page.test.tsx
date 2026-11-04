import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
vi.mock("next/font/google", () => ({
  Noto_Serif_TC: () => ({ variable: "font-var-serif" }),
  Noto_Sans_TC: () => ({ variable: "font-var-sans" }),
}))
vi.mock("@/lib/quick-expense/speech-input", () => ({
  useSpeechInput: () => ({ recording: false, transcribing: false, error: null }),
}))
vi.mock("@/components/auth/liff-provider", () => ({ useAuthFetch: () => vi.fn() }))
import DemoQuickExpensePage from "@/app/demo/quick-expense/page"

describe("demo quick-expense page", () => {
  it("shows the input step", () => {
    render(<DemoQuickExpensePage />)
    expect(screen.getByRole("heading", { name: "AI 快速記帳" })).toBeInTheDocument()
  })
  it("switches to the confirm step", () => {
    render(<DemoQuickExpensePage />)
    fireEvent.click(screen.getByRole("button", { name: /確認步驟/ }))
    // The confirm card renders the description inside a labelled text input.
    expect(screen.getByLabelText(/描述/)).toHaveValue("晚餐 拉麵")
  })
})
