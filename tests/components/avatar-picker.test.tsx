import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import {
  AvatarPicker,
  AvatarDisplay,
  AvatarIcon,
  AVATAR_ICONS,
  AVATAR_COLORS,
  parseAvatarString,
  generateAvatarString,
  getAvatarIcon,
  getAvatarColor,
} from "@/components/avatar-picker"

describe("Avatar Picker Utilities", () => {
  describe("parseAvatarString", () => {
    it("should parse valid avatar string", () => {
      const result = parseAvatarString("avatar:cat:blue")
      expect(result).toEqual({ iconId: "cat", colorId: "blue" })
    })

    it("should return null for invalid avatar string", () => {
      expect(parseAvatarString("invalid")).toBeNull()
      expect(parseAvatarString("avatar:only")).toBeNull()
      expect(parseAvatarString(null)).toBeNull()
      expect(parseAvatarString(undefined)).toBeNull()
    })

    it("should return null if string does not start with avatar:", () => {
      expect(parseAvatarString("other:cat:blue")).toBeNull()
    })
  })

  describe("generateAvatarString", () => {
    it("should generate avatar string in correct format", () => {
      expect(generateAvatarString("cat", "blue")).toBe("avatar:cat:blue")
      expect(generateAvatarString("dog", "red")).toBe("avatar:dog:red")
    })
  })

  describe("getAvatarIcon", () => {
    it("should return icon component for valid id", () => {
      const icon = getAvatarIcon("cat")
      expect(icon).toBeDefined()
    })

    it("should return User icon for invalid id", () => {
      const icon = getAvatarIcon("invalid")
      // Should return default User icon
      expect(icon).toBeDefined()
    })
  })

  describe("getAvatarColor", () => {
    it("should return hex color for valid id", () => {
      expect(getAvatarColor("red")).toBe("#ef4444")
      expect(getAvatarColor("blue")).toBe("#3b82f6")
    })

    it("should return default color for invalid id", () => {
      // Default is indigo #6366f1
      expect(getAvatarColor("invalid")).toBe("#6366f1")
    })
  })

  describe("AVATAR_ICONS constant", () => {
    it("should have 16 icons", () => {
      expect(AVATAR_ICONS).toHaveLength(16)
    })

    it("should have id, icon, and label for each item", () => {
      AVATAR_ICONS.forEach((item) => {
        expect(item.id).toBeDefined()
        expect(item.icon).toBeDefined()
        expect(item.label).toBeDefined()
      })
    })
  })

  describe("AVATAR_COLORS constant", () => {
    it("should have 12 colors", () => {
      expect(AVATAR_COLORS).toHaveLength(12)
    })

    it("should have id, bg, and hex for each color", () => {
      AVATAR_COLORS.forEach((color) => {
        expect(color.id).toBeDefined()
        expect(color.bg).toBeDefined()
        expect(color.hex).toBeDefined()
      })
    })
  })
})

describe("AvatarIcon Component", () => {
  it("should render icon for valid iconId", () => {
    render(<AvatarIcon iconId="cat" className="test-class" />)
    // The icon is rendered as an svg
    const svg = document.querySelector("svg")
    expect(svg).toBeInTheDocument()
    expect(svg).toHaveClass("test-class")
  })

  it("should render default User icon for invalid iconId", () => {
    render(<AvatarIcon iconId="invalid" />)
    const svg = document.querySelector("svg")
    expect(svg).toBeInTheDocument()
  })
})

describe("AvatarDisplay Component", () => {
  it("should render avatar with valid avatar string", () => {
    const { container } = render(<AvatarDisplay avatarString="avatar:cat:blue" />)
    const avatarDiv = container.firstChild as HTMLElement
    expect(avatarDiv).toBeInTheDocument()
    expect(avatarDiv.style.backgroundColor).toBe("rgb(59, 130, 246)") // #3b82f6
  })

  it("should return null for invalid avatar string", () => {
    const { container } = render(<AvatarDisplay avatarString="invalid" />)
    expect(container.firstChild).toBeNull()
  })

  it("should return null for null avatar string", () => {
    const { container } = render(<AvatarDisplay avatarString={null} />)
    expect(container.firstChild).toBeNull()
  })

  it("should apply size classes", () => {
    const { container: small } = render(
      <AvatarDisplay avatarString="avatar:cat:blue" size="sm" />
    )
    expect(small.firstChild).toHaveClass("size-10")

    const { container: medium } = render(
      <AvatarDisplay avatarString="avatar:cat:blue" size="md" />
    )
    expect(medium.firstChild).toHaveClass("size-12")

    const { container: large } = render(
      <AvatarDisplay avatarString="avatar:cat:blue" size="lg" />
    )
    expect(large.firstChild).toHaveClass("size-24")
  })

  it("should apply custom className", () => {
    const { container } = render(
      <AvatarDisplay avatarString="avatar:cat:blue" className="custom-class" />
    )
    expect(container.firstChild).toHaveClass("custom-class")
  })

  it("should return null for unknown iconId", () => {
    const { container } = render(<AvatarDisplay avatarString="avatar:unknown:blue" />)
    expect(container.firstChild).toBeNull()
  })
})

describe("AvatarPicker Component", () => {
  it("should render dialog when open", () => {
    render(
      <AvatarPicker
        open={true}
        onOpenChange={vi.fn()}
        onSelect={vi.fn()}
      />
    )

    expect(screen.getByText("選擇頭像")).toBeInTheDocument()
  })

  it("should not render dialog when closed", () => {
    render(
      <AvatarPicker
        open={false}
        onOpenChange={vi.fn()}
        onSelect={vi.fn()}
      />
    )

    expect(screen.queryByText("選擇頭像")).not.toBeInTheDocument()
  })

  it("should render icon selection section", () => {
    render(
      <AvatarPicker
        open={true}
        onOpenChange={vi.fn()}
        onSelect={vi.fn()}
      />
    )

    expect(screen.getByText("選擇圖案")).toBeInTheDocument()
  })

  it("should render color selection section", () => {
    render(
      <AvatarPicker
        open={true}
        onOpenChange={vi.fn()}
        onSelect={vi.fn()}
      />
    )

    expect(screen.getByText("選擇顏色")).toBeInTheDocument()
  })

  it("should render confirm button", () => {
    render(
      <AvatarPicker
        open={true}
        onOpenChange={vi.fn()}
        onSelect={vi.fn()}
      />
    )

    expect(screen.getByText("確認")).toBeInTheDocument()
  })

  it("should show loading state when loading is true", () => {
    render(
      <AvatarPicker
        open={true}
        onOpenChange={vi.fn()}
        onSelect={vi.fn()}
        loading={true}
      />
    )

    expect(screen.getByText("儲存中...")).toBeInTheDocument()
  })

  it("should call onSelect when confirm button is clicked", async () => {
    const onSelect = vi.fn()

    render(
      <AvatarPicker
        open={true}
        onOpenChange={vi.fn()}
        currentIcon="cat"
        currentColor="blue"
        onSelect={onSelect}
      />
    )

    const confirmButton = screen.getByText("確認")
    await fireEvent.click(confirmButton)

    expect(onSelect).toHaveBeenCalledWith("cat", "blue")
  })

  it("should render 16 icon buttons", () => {
    render(
      <AvatarPicker
        open={true}
        onOpenChange={vi.fn()}
        onSelect={vi.fn()}
      />
    )

    // Each icon has a title attribute with the label
    AVATAR_ICONS.forEach((icon) => {
      expect(screen.getByTitle(icon.label)).toBeInTheDocument()
    })
  })
})

describe("exports", () => {
  it("should export AvatarPicker component", () => {
    expect(AvatarPicker).toBeDefined()
    expect(typeof AvatarPicker).toBe("function")
  })

  it("should export AvatarDisplay component", () => {
    expect(AvatarDisplay).toBeDefined()
    expect(typeof AvatarDisplay).toBe("function")
  })

  it("should export AvatarIcon component", () => {
    expect(AvatarIcon).toBeDefined()
    expect(typeof AvatarIcon).toBe("function")
  })

  it("should export utility functions", () => {
    expect(parseAvatarString).toBeDefined()
    expect(generateAvatarString).toBeDefined()
    expect(getAvatarIcon).toBeDefined()
    expect(getAvatarColor).toBeDefined()
  })
})
