import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
  CardFooter,
} from "@/components/ui/card"

describe("Card Components", () => {
  describe("Card", () => {
    it("should render card with children", () => {
      render(<Card>Card Content</Card>)
      expect(screen.getByText("Card Content")).toBeInTheDocument()
    })

    it("should have data-slot attribute", () => {
      render(<Card data-testid="card">Content</Card>)
      expect(screen.getByTestId("card")).toHaveAttribute("data-slot", "card")
    })

    it("should merge custom className", () => {
      render(<Card className="custom-class" data-testid="card">Content</Card>)
      expect(screen.getByTestId("card")).toHaveClass("custom-class")
    })

    it("should apply default styles", () => {
      render(<Card data-testid="card">Content</Card>)
      expect(screen.getByTestId("card")).toHaveClass("rounded-xl", "border")
    })
  })

  describe("CardHeader", () => {
    it("should render header with children", () => {
      render(<CardHeader>Header Content</CardHeader>)
      expect(screen.getByText("Header Content")).toBeInTheDocument()
    })

    it("should have data-slot attribute", () => {
      render(<CardHeader data-testid="header">Content</CardHeader>)
      expect(screen.getByTestId("header")).toHaveAttribute("data-slot", "card-header")
    })

    it("should merge custom className", () => {
      render(<CardHeader className="custom-class" data-testid="header">Content</CardHeader>)
      expect(screen.getByTestId("header")).toHaveClass("custom-class")
    })
  })

  describe("CardTitle", () => {
    it("should render title with children", () => {
      render(<CardTitle>Card Title</CardTitle>)
      expect(screen.getByText("Card Title")).toBeInTheDocument()
    })

    it("should have data-slot attribute", () => {
      render(<CardTitle data-testid="title">Title</CardTitle>)
      expect(screen.getByTestId("title")).toHaveAttribute("data-slot", "card-title")
    })

    it("should have font-semibold class", () => {
      render(<CardTitle data-testid="title">Title</CardTitle>)
      expect(screen.getByTestId("title")).toHaveClass("font-semibold")
    })
  })

  describe("CardDescription", () => {
    it("should render description with children", () => {
      render(<CardDescription>Description text</CardDescription>)
      expect(screen.getByText("Description text")).toBeInTheDocument()
    })

    it("should have data-slot attribute", () => {
      render(<CardDescription data-testid="desc">Desc</CardDescription>)
      expect(screen.getByTestId("desc")).toHaveAttribute("data-slot", "card-description")
    })

    it("should have text-sm class", () => {
      render(<CardDescription data-testid="desc">Desc</CardDescription>)
      expect(screen.getByTestId("desc")).toHaveClass("text-sm")
    })
  })

  describe("CardAction", () => {
    it("should render action with children", () => {
      render(<CardAction>Action Button</CardAction>)
      expect(screen.getByText("Action Button")).toBeInTheDocument()
    })

    it("should have data-slot attribute", () => {
      render(<CardAction data-testid="action">Action</CardAction>)
      expect(screen.getByTestId("action")).toHaveAttribute("data-slot", "card-action")
    })
  })

  describe("CardContent", () => {
    it("should render content with children", () => {
      render(<CardContent>Content here</CardContent>)
      expect(screen.getByText("Content here")).toBeInTheDocument()
    })

    it("should have data-slot attribute", () => {
      render(<CardContent data-testid="content">Content</CardContent>)
      expect(screen.getByTestId("content")).toHaveAttribute("data-slot", "card-content")
    })

    it("should have px-6 padding class", () => {
      render(<CardContent data-testid="content">Content</CardContent>)
      expect(screen.getByTestId("content")).toHaveClass("px-6")
    })
  })

  describe("CardFooter", () => {
    it("should render footer with children", () => {
      render(<CardFooter>Footer Content</CardFooter>)
      expect(screen.getByText("Footer Content")).toBeInTheDocument()
    })

    it("should have data-slot attribute", () => {
      render(<CardFooter data-testid="footer">Footer</CardFooter>)
      expect(screen.getByTestId("footer")).toHaveAttribute("data-slot", "card-footer")
    })

    it("should have flex class", () => {
      render(<CardFooter data-testid="footer">Footer</CardFooter>)
      expect(screen.getByTestId("footer")).toHaveClass("flex")
    })
  })

  describe("Full Card Composition", () => {
    it("should render a complete card", () => {
      render(
        <Card data-testid="full-card">
          <CardHeader>
            <CardTitle>Title</CardTitle>
            <CardDescription>Description</CardDescription>
            <CardAction>
              <button>Action</button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <p>Main content</p>
          </CardContent>
          <CardFooter>
            <button>Save</button>
          </CardFooter>
        </Card>
      )

      expect(screen.getByTestId("full-card")).toBeInTheDocument()
      expect(screen.getByText("Title")).toBeInTheDocument()
      expect(screen.getByText("Description")).toBeInTheDocument()
      expect(screen.getByText("Main content")).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "Action" })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument()
    })
  })
})
