import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { AdNativeCard } from "@/components/ads/ad-native-card"
import type { Ad } from "@/types/ads"

describe("AdNativeCard Component", () => {
  const mockAd: Ad = {
    id: "ad-1",
    title: "Test Native Ad",
    description: "Test Description for native ad",
    imageUrl: "https://example.com/image.jpg",
    targetUrl: "https://www.example.com/landing",
    type: "native",
    status: "active",
    priority: 1,
    placements: [],
    totalImpressions: 0,
    totalClicks: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  describe("rendering with image", () => {
    it("should render ad title", () => {
      render(<AdNativeCard ad={mockAd} />)

      expect(screen.getByText("Test Native Ad")).toBeInTheDocument()
    })

    it("should render ad description", () => {
      render(<AdNativeCard ad={mockAd} />)

      expect(screen.getByText("Test Description for native ad")).toBeInTheDocument()
    })

    it("should render sponsor badge", () => {
      render(<AdNativeCard ad={mockAd} />)

      expect(screen.getByText("贊助")).toBeInTheDocument()
    })

    it("should render image when imageUrl is provided", () => {
      render(<AdNativeCard ad={mockAd} />)

      const img = screen.getByRole("img", { name: "Test Native Ad" })
      expect(img).toBeInTheDocument()
    })

    it("should extract and display domain from targetUrl", () => {
      render(<AdNativeCard ad={mockAd} />)

      // Domain should be extracted without www.
      expect(screen.getByText("example.com")).toBeInTheDocument()
    })
  })

  describe("rendering without image", () => {
    it("should render without image when imageUrl is undefined", () => {
      const adWithoutImage: Ad = {
        ...mockAd,
        imageUrl: undefined,
      }

      render(<AdNativeCard ad={adWithoutImage} />)

      expect(screen.getByText("Test Native Ad")).toBeInTheDocument()
      expect(screen.queryByRole("img")).not.toBeInTheDocument()
    })
  })

  describe("rendering without description", () => {
    it("should render without description when description is undefined", () => {
      const adWithoutDescription: Ad = {
        ...mockAd,
        description: undefined,
      }

      render(<AdNativeCard ad={adWithoutDescription} />)

      expect(screen.getByText("Test Native Ad")).toBeInTheDocument()
      expect(screen.queryByText("Test Description for native ad")).not.toBeInTheDocument()
    })
  })

  describe("domain extraction", () => {
    it("should handle URL without www", () => {
      const adWithSimpleUrl: Ad = {
        ...mockAd,
        targetUrl: "https://shop.example.com/products",
      }

      render(<AdNativeCard ad={adWithSimpleUrl} />)

      expect(screen.getByText("shop.example.com")).toBeInTheDocument()
    })

    it("should handle invalid URL gracefully", () => {
      const adWithInvalidUrl: Ad = {
        ...mockAd,
        targetUrl: "not-a-valid-url",
      }

      render(<AdNativeCard ad={adWithInvalidUrl} />)

      // Should fall back to showing the original URL
      expect(screen.getByText("not-a-valid-url")).toBeInTheDocument()
    })
  })

  describe("interaction", () => {
    it("should call onClick when clicked", async () => {
      const onClick = vi.fn()
      render(<AdNativeCard ad={mockAd} onClick={onClick} />)

      const card = screen.getByText("Test Native Ad").closest("div")
      await fireEvent.click(card!)

      expect(onClick).toHaveBeenCalled()
    })
  })

  describe("styling", () => {
    it("should apply custom className", () => {
      const { container } = render(<AdNativeCard ad={mockAd} className="custom-class" />)

      expect(container.firstChild).toHaveClass("custom-class")
    })
  })

  describe("exports", () => {
    it("should export AdNativeCard component", () => {
      expect(AdNativeCard).toBeDefined()
      expect(typeof AdNativeCard).toBe("function")
    })
  })
})
