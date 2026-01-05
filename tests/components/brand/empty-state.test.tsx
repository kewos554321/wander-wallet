import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { EmptyState } from "@/components/brand/empty-state"

describe("EmptyState Component", () => {
  it("should render with required props", () => {
    render(<EmptyState variant="no-projects" title="No Projects" />)
    expect(screen.getByText("No Projects")).toBeInTheDocument()
  })

  it("should render with title", () => {
    render(<EmptyState variant="no-expenses" title="沒有費用記錄" />)
    expect(screen.getByRole("heading", { name: "沒有費用記錄" })).toBeInTheDocument()
  })

  it("should render description when provided", () => {
    render(
      <EmptyState
        variant="no-projects"
        title="No Projects"
        description="Create your first project to get started"
      />
    )
    expect(screen.getByText("Create your first project to get started")).toBeInTheDocument()
  })

  it("should not render description when not provided", () => {
    render(<EmptyState variant="no-projects" title="No Projects" />)
    expect(screen.queryByRole("paragraph")).not.toBeInTheDocument()
  })

  it("should render action when provided", () => {
    render(
      <EmptyState
        variant="no-projects"
        title="No Projects"
        action={<button>Create Project</button>}
      />
    )
    expect(screen.getByRole("button", { name: "Create Project" })).toBeInTheDocument()
  })

  it("should render correct illustration for no-projects variant", () => {
    render(<EmptyState variant="no-projects" title="No Projects" />)
    const img = screen.getByRole("img")
    expect(img).toHaveAttribute("alt", "No Projects")
  })

  it("should render correct illustration for no-expenses variant", () => {
    render(<EmptyState variant="no-expenses" title="No Expenses" />)
    const img = screen.getByRole("img")
    expect(img).toHaveAttribute("alt", "No Expenses")
  })

  it("should render correct illustration for no-photos variant", () => {
    render(<EmptyState variant="no-photos" title="No Photos" />)
    const img = screen.getByRole("img")
    expect(img).toHaveAttribute("alt", "No Photos")
  })

  it("should render correct illustration for no-activity variant", () => {
    render(<EmptyState variant="no-activity" title="No Activity" />)
    const img = screen.getByRole("img")
    expect(img).toHaveAttribute("alt", "No Activity")
  })

  it("should merge custom className", () => {
    const { container } = render(
      <EmptyState variant="no-projects" title="Test" className="custom-class" />
    )
    expect(container.firstChild).toHaveClass("custom-class")
  })

  it("should have animate-fade-in class by default", () => {
    const { container } = render(
      <EmptyState variant="no-projects" title="Test" />
    )
    expect(container.firstChild).toHaveClass("animate-fade-in")
  })

  it("should render complete empty state with all props", () => {
    render(
      <EmptyState
        variant="no-projects"
        title="開始旅程"
        description="建立你的第一個旅行專案"
        action={<button>建立專案</button>}
        className="mt-8"
      />
    )

    expect(screen.getByText("開始旅程")).toBeInTheDocument()
    expect(screen.getByText("建立你的第一個旅行專案")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "建立專案" })).toBeInTheDocument()
  })
})
