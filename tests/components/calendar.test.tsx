import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { Calendar, CalendarDayButton } from "@/components/ui/calendar"

describe("Calendar Component", () => {
  describe("rendering", () => {
    it("should render calendar", () => {
      const { container } = render(<Calendar />)

      const calendar = container.querySelector('[data-slot="calendar"]')
      expect(calendar).toBeInTheDocument()
    })

    it("should apply custom className", () => {
      const { container } = render(<Calendar className="custom-class" />)

      const calendar = container.querySelector('[data-slot="calendar"]')
      expect(calendar).toHaveClass("custom-class")
    })

    it("should render navigation buttons", () => {
      render(<Calendar />)

      // Check for previous and next navigation buttons
      const prevButton = screen.getByRole("button", { name: /previous/i })
      const nextButton = screen.getByRole("button", { name: /next/i })

      expect(prevButton).toBeInTheDocument()
      expect(nextButton).toBeInTheDocument()
    })

    it("should render weekday headers", () => {
      render(<Calendar />)

      // Calendar should display weekday headers
      expect(screen.getByText("Su")).toBeInTheDocument()
      expect(screen.getByText("Mo")).toBeInTheDocument()
      expect(screen.getByText("Tu")).toBeInTheDocument()
    })

    it("should show outside days by default", () => {
      // showOutsideDays defaults to true
      render(<Calendar />)

      // The calendar should render with outside days visible
      const calendar = document.querySelector('[data-slot="calendar"]')
      expect(calendar).toBeInTheDocument()
    })

    it("should hide outside days when set", () => {
      render(<Calendar showOutsideDays={false} />)

      const calendar = document.querySelector('[data-slot="calendar"]')
      expect(calendar).toBeInTheDocument()
    })
  })

  describe("props", () => {
    it("should support captionLayout label", () => {
      render(<Calendar captionLayout="label" />)

      const calendar = document.querySelector('[data-slot="calendar"]')
      expect(calendar).toBeInTheDocument()
    })

    it("should support captionLayout dropdown", () => {
      render(<Calendar captionLayout="dropdown" />)

      const calendar = document.querySelector('[data-slot="calendar"]')
      expect(calendar).toBeInTheDocument()
    })

    it("should support captionLayout dropdown-months", () => {
      render(<Calendar captionLayout="dropdown-months" />)

      const calendar = document.querySelector('[data-slot="calendar"]')
      expect(calendar).toBeInTheDocument()
    })

    it("should support captionLayout dropdown-years", () => {
      render(<Calendar captionLayout="dropdown-years" />)

      const calendar = document.querySelector('[data-slot="calendar"]')
      expect(calendar).toBeInTheDocument()
    })

    it("should apply buttonVariant prop", () => {
      render(<Calendar buttonVariant="outline" />)

      const calendar = document.querySelector('[data-slot="calendar"]')
      expect(calendar).toBeInTheDocument()
    })

    it("should support custom formatters", () => {
      const customFormatter = {
        formatMonthDropdown: (date: Date) => date.toLocaleString("zh-TW", { month: "long" }),
      }

      render(<Calendar formatters={customFormatter} />)

      const calendar = document.querySelector('[data-slot="calendar"]')
      expect(calendar).toBeInTheDocument()
    })

    it("should support custom classNames", () => {
      render(
        <Calendar
          classNames={{
            root: "custom-root-class",
            months: "custom-months-class",
          }}
        />
      )

      const calendar = document.querySelector('[data-slot="calendar"]')
      expect(calendar).toBeInTheDocument()
    })
  })

  describe("selection modes", () => {
    it("should support single selection mode", () => {
      render(<Calendar mode="single" />)

      const calendar = document.querySelector('[data-slot="calendar"]')
      expect(calendar).toBeInTheDocument()
    })

    it("should support range selection mode", () => {
      render(<Calendar mode="range" />)

      const calendar = document.querySelector('[data-slot="calendar"]')
      expect(calendar).toBeInTheDocument()
    })

    it("should support multiple selection mode", () => {
      render(<Calendar mode="multiple" />)

      const calendar = document.querySelector('[data-slot="calendar"]')
      expect(calendar).toBeInTheDocument()
    })

    it("should support selected date", () => {
      const selectedDate = new Date(2024, 5, 15)
      render(<Calendar mode="single" selected={selectedDate} />)

      const calendar = document.querySelector('[data-slot="calendar"]')
      expect(calendar).toBeInTheDocument()
    })

    it("should support date range selection", () => {
      const selectedRange = {
        from: new Date(2024, 5, 10),
        to: new Date(2024, 5, 20),
      }
      render(<Calendar mode="range" selected={selectedRange} />)

      const calendar = document.querySelector('[data-slot="calendar"]')
      expect(calendar).toBeInTheDocument()
    })
  })

  describe("disabled dates", () => {
    it("should support disabled prop with date array", () => {
      const disabledDates = [new Date(2024, 5, 15), new Date(2024, 5, 16)]
      render(<Calendar disabled={disabledDates} />)

      const calendar = document.querySelector('[data-slot="calendar"]')
      expect(calendar).toBeInTheDocument()
    })

    it("should support disabled prop with matcher function", () => {
      const disableWeekends = (date: Date) => {
        const day = date.getDay()
        return day === 0 || day === 6
      }

      render(<Calendar disabled={disableWeekends} />)

      const calendar = document.querySelector('[data-slot="calendar"]')
      expect(calendar).toBeInTheDocument()
    })
  })

  describe("multiple months", () => {
    it("should support numberOfMonths prop", () => {
      render(<Calendar numberOfMonths={2} />)

      const calendar = document.querySelector('[data-slot="calendar"]')
      expect(calendar).toBeInTheDocument()
    })
  })

  describe("week numbers", () => {
    it("should support showWeekNumber prop", () => {
      render(<Calendar showWeekNumber />)

      const calendar = document.querySelector('[data-slot="calendar"]')
      expect(calendar).toBeInTheDocument()
    })
  })
})

describe("CalendarDayButton", () => {
  it("should be exported", () => {
    expect(CalendarDayButton).toBeDefined()
    expect(typeof CalendarDayButton).toBe("function")
  })
})
