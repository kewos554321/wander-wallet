import { describe, it, expect } from "vitest"
import { COVER_ICONS, COVER_COLORS, DEFAULT_ICON_COVER, buildIconCover, isValidCover, parseCover } from "@/lib/covers"

describe("icon covers", () => {
  it("lists icons and colors", () => {
    expect(COVER_ICONS.map((i) => i.id)).toEqual(["compass", "leaf", "utensils", "globe", "car", "bed", "star"])
    expect(COVER_COLORS.map((c) => c.id)).toEqual(["lake", "coral", "red", "rose", "gold", "plum"])
    expect(DEFAULT_ICON_COVER).toBe("icon:leaf;color:lake")
  })
  it("builds and parses", () => {
    expect(buildIconCover("car", "gold")).toBe("icon:car;color:gold")
    expect(parseCover("icon:car;color:gold")).toEqual({ type: "icon", iconId: "car", colorId: "gold" })
  })
  it("treats unknown ids as none", () => {
    expect(parseCover("icon:rocket;color:lake")).toEqual({ type: "none" })
    expect(parseCover("icon:leaf;color:pink")).toEqual({ type: "none" })
  })
  it("validates covers", () => {
    for (const ok of [null, undefined, "", "preset:1", "icon:leaf;color:lake", "https://cdn.example.com/a.jpg", "data:image/webp;base64,AAAA", "data:image/jpeg;base64,AAAA"]) {
      expect(isValidCover(ok)).toBe(true)
    }
    for (const bad of [1, {}, "preset:999", "icon:rocket;color:lake", "icon:leaf", "javascript:alert(1)", "http://x.com/a.jpg", "data:text/html;base64,AAAA", "hello"]) {
      expect(isValidCover(bad)).toBe(false)
    }
  })
  it("has dark colors for all cover colors", () => {
    expect(COVER_COLORS.map(({ id, darkFg, darkBg }) => ({ id, darkFg, darkBg }))).toEqual([
      { id: "lake", darkFg: "#4FB394", darkBg: "#17302A" },
      { id: "coral", darkFg: "#F09A76", darkBg: "#3A2519" },
      { id: "red", darkFg: "#E8735A", darkBg: "#3A1E18" },
      { id: "rose", darkFg: "#D77E9C", darkBg: "#37212A" },
      { id: "gold", darkFg: "#D4AE55", darkBg: "#332A16" },
      { id: "plum", darkFg: "#A897D6", darkBg: "#2A2438" },
    ])
  })
})
