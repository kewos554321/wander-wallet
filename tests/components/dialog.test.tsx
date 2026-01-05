import { describe, it, expect, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog"

describe("Dialog Components", () => {
  describe("Dialog", () => {
    it("should render trigger and open dialog on click", async () => {
      const user = userEvent.setup()

      render(
        <Dialog>
          <DialogTrigger>Open Dialog</DialogTrigger>
          <DialogContent>
            <DialogTitle>Test Dialog</DialogTitle>
            <DialogDescription>Dialog description</DialogDescription>
          </DialogContent>
        </Dialog>
      )

      // Dialog content should not be visible initially
      expect(screen.queryByText("Test Dialog")).not.toBeInTheDocument()

      // Click trigger to open dialog
      await user.click(screen.getByText("Open Dialog"))

      // Dialog content should now be visible
      await waitFor(() => {
        expect(screen.getByText("Test Dialog")).toBeInTheDocument()
        expect(screen.getByText("Dialog description")).toBeInTheDocument()
      })
    })

    it("should close dialog when close button is clicked", async () => {
      const user = userEvent.setup()

      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogTitle>Test Dialog</DialogTitle>
          </DialogContent>
        </Dialog>
      )

      // Dialog should be open
      await waitFor(() => {
        expect(screen.getByText("Test Dialog")).toBeInTheDocument()
      })

      // Click close button
      const closeButton = screen.getByRole("button", { name: /close/i })
      await user.click(closeButton)

      // Dialog should be closed
      await waitFor(() => {
        expect(screen.queryByText("Test Dialog")).not.toBeInTheDocument()
      })
    })

    it("should hide close button when showCloseButton is false", async () => {
      render(
        <Dialog defaultOpen>
          <DialogContent showCloseButton={false}>
            <DialogTitle>No Close Button</DialogTitle>
          </DialogContent>
        </Dialog>
      )

      await waitFor(() => {
        expect(screen.getByText("No Close Button")).toBeInTheDocument()
      })

      expect(screen.queryByRole("button", { name: /close/i })).not.toBeInTheDocument()
    })

    it("should support controlled open state", async () => {
      const onOpenChange = vi.fn()

      render(
        <Dialog open={true} onOpenChange={onOpenChange}>
          <DialogContent>
            <DialogTitle>Controlled Dialog</DialogTitle>
          </DialogContent>
        </Dialog>
      )

      await waitFor(() => {
        expect(screen.getByText("Controlled Dialog")).toBeInTheDocument()
      })
    })
  })

  describe("DialogHeader", () => {
    it("should render with children", () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogHeader>Header Content</DialogHeader>
          </DialogContent>
        </Dialog>
      )

      expect(screen.getByText("Header Content")).toBeInTheDocument()
    })

    it("should have data-slot attribute", async () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogHeader data-testid="header">Header</DialogHeader>
          </DialogContent>
        </Dialog>
      )

      await waitFor(() => {
        expect(screen.getByTestId("header")).toHaveAttribute("data-slot", "dialog-header")
      })
    })
  })

  describe("DialogFooter", () => {
    it("should render with children", async () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogFooter>
              <button>Cancel</button>
              <button>Save</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument()
      })
    })

    it("should have data-slot attribute", async () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogFooter data-testid="footer">Footer</DialogFooter>
          </DialogContent>
        </Dialog>
      )

      await waitFor(() => {
        expect(screen.getByTestId("footer")).toHaveAttribute("data-slot", "dialog-footer")
      })
    })
  })

  describe("DialogTitle", () => {
    it("should render title text", async () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogTitle>My Dialog Title</DialogTitle>
          </DialogContent>
        </Dialog>
      )

      await waitFor(() => {
        expect(screen.getByText("My Dialog Title")).toBeInTheDocument()
      })
    })

    it("should have font-semibold class", async () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogTitle data-testid="title">Title</DialogTitle>
          </DialogContent>
        </Dialog>
      )

      await waitFor(() => {
        expect(screen.getByTestId("title")).toHaveClass("font-semibold")
      })
    })
  })

  describe("DialogDescription", () => {
    it("should render description text", async () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogDescription>This is a description</DialogDescription>
          </DialogContent>
        </Dialog>
      )

      await waitFor(() => {
        expect(screen.getByText("This is a description")).toBeInTheDocument()
      })
    })

    it("should have text-sm class", async () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogDescription data-testid="desc">Desc</DialogDescription>
          </DialogContent>
        </Dialog>
      )

      await waitFor(() => {
        expect(screen.getByTestId("desc")).toHaveClass("text-sm")
      })
    })
  })

  describe("DialogClose", () => {
    it("should close dialog when clicked", async () => {
      const user = userEvent.setup()

      render(
        <Dialog defaultOpen>
          <DialogContent showCloseButton={false}>
            <DialogClose>
              <button>Custom Close</button>
            </DialogClose>
          </DialogContent>
        </Dialog>
      )

      await waitFor(() => {
        expect(screen.getByText("Custom Close")).toBeInTheDocument()
      })

      await user.click(screen.getByText("Custom Close"))

      await waitFor(() => {
        expect(screen.queryByText("Custom Close")).not.toBeInTheDocument()
      })
    })
  })

  describe("Full Dialog Composition", () => {
    it("should render complete dialog", async () => {
      const user = userEvent.setup()

      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Profile</DialogTitle>
              <DialogDescription>
                Make changes to your profile here.
              </DialogDescription>
            </DialogHeader>
            <div>Form content</div>
            <DialogFooter>
              <DialogClose asChild>
                <button>Cancel</button>
              </DialogClose>
              <button>Save</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )

      await user.click(screen.getByText("Open"))

      await waitFor(() => {
        expect(screen.getByText("Edit Profile")).toBeInTheDocument()
        expect(screen.getByText("Make changes to your profile here.")).toBeInTheDocument()
        expect(screen.getByText("Form content")).toBeInTheDocument()
        expect(screen.getByText("Cancel")).toBeInTheDocument()
        expect(screen.getByText("Save")).toBeInTheDocument()
      })
    })
  })
})
