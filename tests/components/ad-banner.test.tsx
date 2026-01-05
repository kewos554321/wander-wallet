import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { AdBanner } from "@/components/ads/ad-banner"
import type { Ad } from "@/types/ads"

describe("AdBanner Component", () => {
  const mockAd: Ad = {
    id: "ad-1",
    title: "Test Ad",
    description: "Test Description",
    imageUrl: "https://example.com/image.jpg",
    targetUrl: "https://example.com",
    type: "banner",
    status: "active",
    priority: 1,
    placements: [],
    totalImpressions: 0,
    totalClicks: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  describe("rendering with image", () => {
    it("should render ad with image", () => {
      render(<AdBanner ad={mockAd} />)

      expect(screen.getByRole("img", { name: "Test Ad" })).toBeInTheDocument()
      expect(screen.getByText("Test Ad")).toBeInTheDocument()
      expect(screen.getByText("Test Description")).toBeInTheDocument()
    })

    it("should render ad badge", () => {
      render(<AdBanner ad={mockAd} />)

      expect(screen.getByText("廣告")).toBeInTheDocument()
    })
  })

  describe("rendering without image", () => {
    it("should render text-only version when no imageUrl", () => {
      const adWithoutImage: Ad = {
        ...mockAd,
        imageUrl: undefined,
      }

      render(<AdBanner ad={adWithoutImage} />)

      expect(screen.getByText("Test Ad")).toBeInTheDocument()
      expect(screen.getByText("Test Description")).toBeInTheDocument()
      expect(screen.queryByRole("img")).not.toBeInTheDocument()
    })

    it("should render without description if not provided", () => {
      const adWithoutDescription: Ad = {
        ...mockAd,
        imageUrl: undefined,
        description: undefined,
      }

      render(<AdBanner ad={adWithoutDescription} />)

      expect(screen.getByText("Test Ad")).toBeInTheDocument()
      expect(screen.queryByText("Test Description")).not.toBeInTheDocument()
    })
  })

  describe("interaction", () => {
    it("should call onClick when clicked", async () => {
      const onClick = vi.fn()
      render(<AdBanner ad={mockAd} onClick={onClick} />)

      const container = screen.getByText("Test Ad").closest("div")
      await fireEvent.click(container!)

      expect(onClick).toHaveBeenCalled()
    })
  })

  describe("styling", () => {
    it("should apply custom className", () => {
      const { container } = render(<AdBanner ad={mockAd} className="custom-class" />)

      expect(container.firstChild).toHaveClass("custom-class")
    })
  })

  describe("exports", () => {
    it("should export AdBanner component", () => {
      expect(AdBanner).toBeDefined()
      expect(typeof AdBanner).toBe("function")
    })
  })
})
