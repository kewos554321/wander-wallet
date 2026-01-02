import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog"

describe("ConfirmDeleteDialog Component", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    description: "確定要刪除這筆資料嗎？",
    onConfirm: vi.fn(),
  }

  it("should render dialog with default title", () => {
    render(<ConfirmDeleteDialog {...defaultProps} />)

    expect(screen.getByText("確認刪除")).toBeInTheDocument()
  })

  it("should render dialog with custom title", () => {
    render(<ConfirmDeleteDialog {...defaultProps} title="確認刪除專案" />)

    expect(screen.getByText("確認刪除專案")).toBeInTheDocument()
  })

  it("should render description text", () => {
    render(<ConfirmDeleteDialog {...defaultProps} />)

    expect(screen.getByText("確定要刪除這筆資料嗎？")).toBeInTheDocument()
  })

  it("should render cancel and confirm buttons", () => {
    render(<ConfirmDeleteDialog {...defaultProps} />)

    expect(screen.getByRole("button", { name: "取消" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "刪除" })).toBeInTheDocument()
  })

  it("should render custom confirm text", () => {
    render(<ConfirmDeleteDialog {...defaultProps} confirmText="確認刪除" />)

    expect(screen.getByRole("button", { name: "確認刪除" })).toBeInTheDocument()
  })

  it("should call onConfirm when confirm button is clicked", async () => {
    const handleConfirm = vi.fn()
    const user = userEvent.setup()

    render(<ConfirmDeleteDialog {...defaultProps} onConfirm={handleConfirm} />)

    await user.click(screen.getByRole("button", { name: "刪除" }))

    expect(handleConfirm).toHaveBeenCalledTimes(1)
  })

  it("should call onOpenChange with false when cancel button is clicked", async () => {
    const handleOpenChange = vi.fn()
    const user = userEvent.setup()

    render(<ConfirmDeleteDialog {...defaultProps} onOpenChange={handleOpenChange} />)

    await user.click(screen.getByRole("button", { name: "取消" }))

    expect(handleOpenChange).toHaveBeenCalledWith(false)
  })

  it("should show loading state when loading is true", () => {
    render(<ConfirmDeleteDialog {...defaultProps} loading={true} />)

    expect(screen.getByRole("button", { name: "刪除中..." })).toBeInTheDocument()
  })

  it("should disable buttons when loading is true", () => {
    render(<ConfirmDeleteDialog {...defaultProps} loading={true} />)

    expect(screen.getByRole("button", { name: "取消" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "刪除中..." })).toBeDisabled()
  })

  it("should not call onConfirm when confirm button is disabled", async () => {
    const handleConfirm = vi.fn()
    const user = userEvent.setup()

    render(<ConfirmDeleteDialog {...defaultProps} onConfirm={handleConfirm} loading={true} />)

    await user.click(screen.getByRole("button", { name: "刪除中..." }))

    expect(handleConfirm).not.toHaveBeenCalled()
  })

  it("should render children content", () => {
    render(
      <ConfirmDeleteDialog {...defaultProps}>
        <div data-testid="custom-content">自訂內容</div>
      </ConfirmDeleteDialog>
    )

    expect(screen.getByTestId("custom-content")).toBeInTheDocument()
    expect(screen.getByText("自訂內容")).toBeInTheDocument()
  })

  it("should not render dialog when open is false", () => {
    render(<ConfirmDeleteDialog {...defaultProps} open={false} />)

    expect(screen.queryByText("確認刪除")).not.toBeInTheDocument()
  })

  it("should render with dynamic description", () => {
    const projectName = "我的專案"
    render(
      <ConfirmDeleteDialog
        {...defaultProps}
        description={`確定要刪除「${projectName}」嗎？`}
      />
    )

    expect(screen.getByText("確定要刪除「我的專案」嗎？")).toBeInTheDocument()
  })

  it("should render with dynamic confirm text for batch delete", () => {
    const count = 5
    render(
      <ConfirmDeleteDialog
        {...defaultProps}
        title="確認批量刪除"
        confirmText={`刪除 ${count} 筆`}
      />
    )

    expect(screen.getByText("確認批量刪除")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "刪除 5 筆" })).toBeInTheDocument()
  })

  it("should have destructive variant for confirm button", () => {
    render(<ConfirmDeleteDialog {...defaultProps} />)

    const confirmButton = screen.getByRole("button", { name: "刪除" })
    expect(confirmButton).toHaveClass("bg-destructive")
  })

  it("should have outline variant for cancel button", () => {
    render(<ConfirmDeleteDialog {...defaultProps} />)

    const cancelButton = screen.getByRole("button", { name: "取消" })
    expect(cancelButton).toHaveClass("border")
  })
})
