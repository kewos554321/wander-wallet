import { describe, it, expect } from "vitest"
import { cn } from "@/lib/utils"

describe("cn (className utility)", () => {
  it("should merge class names correctly", () => {
    const result = cn("px-4", "py-2")
    expect(result).toBe("px-4 py-2")
  })

  it("should handle conditional classes", () => {
    const isActive = true
    const result = cn("base-class", isActive && "active-class")
    expect(result).toBe("base-class active-class")
  })

  it("should filter out falsy values", () => {
    const result = cn("class-a", false && "class-b", null, undefined, "class-c")
    expect(result).toBe("class-a class-c")
  })

  it("should merge tailwind classes correctly (last wins)", () => {
    const result = cn("px-2 py-4", "px-4")
    expect(result).toBe("py-4 px-4")
  })

  it("should handle empty inputs", () => {
    const result = cn()
    expect(result).toBe("")
  })

  it("should handle object syntax", () => {
    const result = cn({
      "text-red-500": true,
      "text-blue-500": false,
    })
    expect(result).toBe("text-red-500")
  })

  it("should handle array syntax", () => {
    const result = cn(["class-a", "class-b"])
    expect(result).toBe("class-a class-b")
  })
})
