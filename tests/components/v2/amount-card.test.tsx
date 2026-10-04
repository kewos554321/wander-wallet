import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { AmountCard } from "@/components/v2/expense-form/amount-card"

type AmountCardProps = Parameters<typeof AmountCard>[0]

function setup(overrides: Partial<AmountCardProps> = {}) {
  const props: AmountCardProps = {
    amount: "1280",
    currency: "TWD",
    onAmount: vi.fn(),
    onCurrency: vi.fn(),
    calculatorOpen: false,
    onToggleCalculator: vi.fn(),
    ...overrides,
  }
  const utils = render(<AmountCard {...props} />)
  const card = utils.container.firstElementChild as HTMLElement
  return { ...utils, card, props }
}

describe("AmountCard states + calculator slot", () => {
  it("closed card uses the lake-tint fill and lake-edge border, not the old gradient", () => {
    const { card } = setup()
    expect(card.className).toContain("bg-v2-lake-tint")
    expect(card.className).toContain("border-v2-lake-edge")
    expect(card.className).not.toContain("bg-gradient-to-br")
  })

  it("closed card shows the amount input and a paper 計算機 button", () => {
    setup()
    expect(screen.getByLabelText("金額")).toHaveValue("1280")
    const button = screen.getByRole("button", { name: "開啟計算機" })
    expect(button.className).toContain("bg-v2-paper")
    expect(button.className).not.toContain("bg-v2-surface")
  })

  it("clicking 計算機 calls onToggleCalculator", () => {
    const onToggleCalculator = vi.fn()
    setup({ onToggleCalculator })
    fireEvent.click(screen.getByRole("button", { name: "開啟計算機" }))
    expect(onToggleCalculator).toHaveBeenCalledTimes(1)
  })

  it("open card turns solid lake and hides the 金額 input", () => {
    const { card } = setup({ calculatorOpen: true, calculator: <div data-testid="calculator">pad</div> })
    expect(card.className).toContain("bg-v2-lake")
    expect(card.className).not.toContain("bg-v2-lake-tint")
    expect(screen.queryByLabelText("金額")).not.toBeInTheDocument()
  })

  it("renders the calculator node inside the card when open", () => {
    setup({ calculatorOpen: true, calculator: <div data-testid="calculator" /> })
    expect(screen.getByTestId("calculator")).toBeInTheDocument()
  })

  it("does not render the calculator slot while closed", () => {
    setup({ calculator: <div data-testid="calculator" /> })
    expect(screen.queryByTestId("calculator")).not.toBeInTheDocument()
  })

  it("open card shows the title in paper with reduced opacity", () => {
    setup({ calculatorOpen: true, calculator: <div data-testid="calculator" /> })
    const label = screen.getByText("輸入金額")
    expect(label.className).toContain("text-v2-paper")
    expect(label.className).toContain("opacity-85")
    expect(label.tagName).toBe("SPAN")
    expect(label).not.toHaveAttribute("for")
  })

  it("labels the calculator toggle by state", () => {
    const { unmount } = setup()
    expect(screen.getByRole("button", { name: "開啟計算機" })).toBeInTheDocument()
    unmount()
    setup({ calculatorOpen: true, calculator: <div data-testid="calculator" /> })
    expect(screen.getByRole("button", { name: "關閉計算機" })).toBeInTheDocument()
  })
})
