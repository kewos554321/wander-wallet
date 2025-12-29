import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemberAvatar } from "@/components/member-avatar"

// Mock next/image
vi.mock("next/image", () => ({
  default: ({ src, alt, width, height, className }: { src: string; alt: string; width: number; height: number; className?: string }) => (
    <img src={src} alt={alt} width={width} height={height} className={className} data-testid="next-image" />
  ),
}))

// Mock avatar-picker
vi.mock("@/components/avatar-picker", () => ({
  parseAvatarString: (str: string | null | undefined) => {
    if (!str?.startsWith("avatar:")) return null
    const parts = str.split(":")
    if (parts.length !== 3) return null
    return { iconId: parts[1], colorId: parts[2] }
  },
  AvatarIcon: ({ iconId, className }: { iconId: string; className?: string }) => (
    <span data-testid="avatar-icon" data-icon-id={iconId} className={className}>Icon</span>
  ),
  getAvatarColor: (colorId: string) => {
    const colors: Record<string, string> = {
      red: "#ef4444",
      blue: "#3b82f6",
      green: "#22c55e",
    }
    return colors[colorId] || "#6366f1"
  },
}))

describe("MemberAvatar Component", () => {
  describe("Custom Avatar (avatar:icon:color format)", () => {
    it("should render custom avatar with correct icon", () => {
      render(<MemberAvatar image="avatar:cat:red" name="Test User" />)

      const icon = screen.getByTestId("avatar-icon")
      expect(icon).toBeInTheDocument()
      expect(icon).toHaveAttribute("data-icon-id", "cat")
    })

    it("should apply background color from avatar data", () => {
      const { container } = render(<MemberAvatar image="avatar:dog:blue" name="Test User" />)

      const avatarDiv = container.firstChild as HTMLElement
      expect(avatarDiv).toHaveStyle({ backgroundColor: "#3b82f6" })
    })

    it("should use selected background color when selected", () => {
      const { container } = render(<MemberAvatar image="avatar:cat:red" name="Test User" selected />)

      const avatarDiv = container.firstChild as HTMLElement
      expect(avatarDiv).toHaveStyle({ backgroundColor: "rgba(255,255,255,0.3)" })
    })
  })

  describe("External Image (Google OAuth, etc.)", () => {
    it("should render external image", () => {
      render(<MemberAvatar image="https://example.com/avatar.jpg" name="Test User" />)

      const img = screen.getByTestId("next-image")
      expect(img).toBeInTheDocument()
      expect(img).toHaveAttribute("src", "https://example.com/avatar.jpg")
      expect(img).toHaveAttribute("alt", "Test User")
    })

    it("should apply correct image size for md (default)", () => {
      render(<MemberAvatar image="https://example.com/avatar.jpg" name="Test User" />)

      const img = screen.getByTestId("next-image")
      expect(img).toHaveAttribute("width", "32")
      expect(img).toHaveAttribute("height", "32")
    })

    it("should apply correct image size for sm", () => {
      render(<MemberAvatar image="https://example.com/avatar.jpg" name="Test User" size="sm" />)

      const img = screen.getByTestId("next-image")
      expect(img).toHaveAttribute("width", "20")
      expect(img).toHaveAttribute("height", "20")
    })

    it("should apply correct image size for lg", () => {
      render(<MemberAvatar image="https://example.com/avatar.jpg" name="Test User" size="lg" />)

      const img = screen.getByTestId("next-image")
      expect(img).toHaveAttribute("width", "40")
      expect(img).toHaveAttribute("height", "40")
    })
  })

  describe("Fallback (User icon)", () => {
    it("should render User icon when no image provided", () => {
      const { container } = render(<MemberAvatar image={null} name="Test User" />)

      // User icon should be rendered (as svg)
      const svg = container.querySelector("svg")
      expect(svg).toBeInTheDocument()
    })

    it("should render User icon when image is undefined", () => {
      const { container } = render(<MemberAvatar image={undefined} name="Test User" />)

      const svg = container.querySelector("svg")
      expect(svg).toBeInTheDocument()
    })

    it("should apply slate-500 text color when not selected", () => {
      const { container } = render(<MemberAvatar image={null} name="Test User" />)

      const svg = container.querySelector("svg")
      expect(svg).toHaveClass("text-slate-500")
    })

    it("should apply white text color when selected", () => {
      const { container } = render(<MemberAvatar image={null} name="Test User" selected />)

      const svg = container.querySelector("svg")
      expect(svg).toHaveClass("text-white")
    })
  })

  describe("Sizes", () => {
    it("should apply sm size classes", () => {
      const { container } = render(<MemberAvatar image={null} name="Test User" size="sm" />)

      const avatarDiv = container.firstChild as HTMLElement
      expect(avatarDiv).toHaveClass("h-5", "w-5")
    })

    it("should apply md size classes (default)", () => {
      const { container } = render(<MemberAvatar image={null} name="Test User" />)

      const avatarDiv = container.firstChild as HTMLElement
      expect(avatarDiv).toHaveClass("h-8", "w-8")
    })

    it("should apply lg size classes", () => {
      const { container } = render(<MemberAvatar image={null} name="Test User" size="lg" />)

      const avatarDiv = container.firstChild as HTMLElement
      expect(avatarDiv).toHaveClass("h-10", "w-10")
    })
  })

  describe("Custom className", () => {
    it("should merge custom className with default classes", () => {
      const { container } = render(<MemberAvatar image={null} name="Test User" className="custom-class" />)

      const avatarDiv = container.firstChild as HTMLElement
      expect(avatarDiv).toHaveClass("custom-class")
      expect(avatarDiv).toHaveClass("rounded-full")
    })
  })

  describe("Common styles", () => {
    it("should always have rounded-full class", () => {
      const { container } = render(<MemberAvatar image={null} name="Test User" />)

      const avatarDiv = container.firstChild as HTMLElement
      expect(avatarDiv).toHaveClass("rounded-full")
    })

    it("should always have flex centering classes", () => {
      const { container } = render(<MemberAvatar image={null} name="Test User" />)

      const avatarDiv = container.firstChild as HTMLElement
      expect(avatarDiv).toHaveClass("flex", "items-center", "justify-center")
    })
  })
})
