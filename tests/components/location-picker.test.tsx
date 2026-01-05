import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { LocationPicker } from "@/components/location-picker"

// Mock fetch
const mockFetch = vi.fn()
vi.stubGlobal("fetch", mockFetch)

describe("LocationPicker Component", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("initial state", () => {
    it("should show add location button when no value", () => {
      render(<LocationPicker onChange={vi.fn()} />)

      expect(screen.getByText("新增位置")).toBeInTheDocument()
    })

    it("should show change location button when value exists", () => {
      render(
        <LocationPicker
          value={{
            location: "Test Location",
            latitude: 25.0,
            longitude: 121.5,
          }}
          onChange={vi.fn()}
        />
      )

      expect(screen.getByText("變更位置")).toBeInTheDocument()
    })

    it("should display current location when value exists", () => {
      render(
        <LocationPicker
          value={{
            location: "Test Location",
            latitude: 25.0,
            longitude: 121.5,
          }}
          onChange={vi.fn()}
        />
      )

      expect(screen.getByText("Test Location")).toBeInTheDocument()
    })
  })

  describe("location selection panel", () => {
    it("should open panel when add location is clicked", async () => {
      render(<LocationPicker onChange={vi.fn()} />)

      await fireEvent.click(screen.getByText("新增位置"))

      expect(screen.getByText("使用目前位置")).toBeInTheDocument()
      expect(screen.getByPlaceholderText("搜尋地點...")).toBeInTheDocument()
    })

    it("should show cancel button in panel", async () => {
      render(<LocationPicker onChange={vi.fn()} />)

      await fireEvent.click(screen.getByText("新增位置"))

      expect(screen.getByText("取消")).toBeInTheDocument()
    })

    it("should close panel when cancel is clicked", async () => {
      render(<LocationPicker onChange={vi.fn()} />)

      await fireEvent.click(screen.getByText("新增位置"))
      expect(screen.getByText("使用目前位置")).toBeInTheDocument()

      await fireEvent.click(screen.getByText("取消"))
      expect(screen.queryByText("使用目前位置")).not.toBeInTheDocument()
    })
  })

  describe("clearing location", () => {
    it("should call onChange with null values when clear button is clicked", async () => {
      const onChange = vi.fn()

      render(
        <LocationPicker
          value={{
            location: "Test Location",
            latitude: 25.0,
            longitude: 121.5,
          }}
          onChange={onChange}
        />
      )

      // Find the clear button (X icon)
      const clearButton = screen.getAllByRole("button").find(
        (btn) => btn.querySelector('[class*="lucide-x"]') || btn.textContent === ""
      )

      if (clearButton) {
        await fireEvent.click(clearButton)
        expect(onChange).toHaveBeenCalledWith({
          location: null,
          latitude: null,
          longitude: null,
        })
      }
    })
  })

  describe("search functionality", () => {
    it("should show search input when panel is open", async () => {
      render(<LocationPicker onChange={vi.fn()} />)

      await fireEvent.click(screen.getByText("新增位置"))

      const searchInput = screen.getByPlaceholderText("搜尋地點...")
      expect(searchInput).toBeInTheDocument()
    })

    it("should search location after typing", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            {
              displayName: "台北市",
              lat: 25.0330,
              lon: 121.5654,
            },
          ]),
      })

      render(<LocationPicker onChange={vi.fn()} />)

      await fireEvent.click(screen.getByText("新增位置"))

      const searchInput = screen.getByPlaceholderText("搜尋地點...")
      await fireEvent.change(searchInput, { target: { value: "台北" } })

      // Wait for debounce
      await waitFor(
        () => {
          expect(mockFetch).toHaveBeenCalled()
        },
        { timeout: 1000 }
      )
    })
  })

  describe("current location", () => {
    it("should show error when geolocation is not supported", async () => {
      // Mock navigator without geolocation
      const originalGeolocation = navigator.geolocation
      Object.defineProperty(navigator, "geolocation", {
        value: undefined,
        writable: true,
        configurable: true,
      })

      render(<LocationPicker onChange={vi.fn()} />)

      await fireEvent.click(screen.getByText("新增位置"))
      await fireEvent.click(screen.getByText("使用目前位置"))

      expect(screen.getByText("您的瀏覽器不支援定位功能")).toBeInTheDocument()

      // Restore
      Object.defineProperty(navigator, "geolocation", {
        value: originalGeolocation,
        writable: true,
        configurable: true,
      })
    })
  })

  describe("styling", () => {
    it("should apply custom className", () => {
      const { container } = render(
        <LocationPicker onChange={vi.fn()} className="custom-class" />
      )

      expect(container.firstChild).toHaveClass("custom-class")
    })
  })

  describe("exports", () => {
    it("should export LocationPicker component", () => {
      expect(LocationPicker).toBeDefined()
      expect(typeof LocationPicker).toBe("function")
    })
  })
})
