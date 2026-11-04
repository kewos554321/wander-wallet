import { describe, it, expect } from "vitest"
import { CLASSIC_COVERS, COVER_ICONS, COVER_COLORS, COVER_PICKER_COLORS, DEFAULT_ICON_COVER, buildIconCover, isValidCover, parseCover } from "@/lib/covers"

describe("icon covers", () => {
  it("lists icons and colors", () => {
    expect(COVER_ICONS.map((i) => i.id)).toEqual([
      "compass", "leaf", "utensils", "globe", "car", "bed", "star",
      "camera", "fork-knife", "hiking", "mountain", "heart", "sparkle",
      "plane", "map-pin", "tent", "ship", "train", "bike", "coffee",
      "shopping-bag", "ticket", "sun", "music", "backpack", "palm-tree", "landmark",
      "luggage", "map", "route", "navigation", "anchor", "sailboat", "bus",
      "plane-takeoff", "plane-landing", "hotel", "umbrella", "snowflake", "waves", "trees",
      "taxi", "cable-car", "fuel", "parking", "fish", "wine", "pizza",
      "ice-cream", "key", "concierge-bell", "sunrise", "sunset", "calendar", "languages",
    ])
    expect(COVER_COLORS.map((c) => c.id)).toEqual(["lake", "coral", "red", "rose", "gold", "plum", "ink", "sky", "moss", "sand", "slate", "berry", "ocean", "cobalt", "mint"])
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
  it("accepts the new icon ids and rejects unknown ones", () => {
    expect(isValidCover("icon:camera;color:ink")).toBe(true)
    expect(parseCover("icon:fork-knife;color:ink")).toEqual({ type: "icon", iconId: "fork-knife", colorId: "ink" })
    expect(isValidCover("icon:rocket;color:lake")).toBe(false)
  })
  it("keeps red covers parseable for existing data but hides red from the picker", () => {
    expect(parseCover("icon:compass;color:red")).toEqual({ type: "icon", iconId: "compass", colorId: "red" })
    expect(isValidCover("icon:compass;color:red")).toBe(true)
    expect(COVER_PICKER_COLORS.map((c) => c.id)).toEqual(["lake", "coral", "plum", "gold", "rose", "ink", "sky", "moss", "sand", "slate", "berry", "ocean", "cobalt", "mint"])
  })
  it("exposes the nine v1 classic covers for the picker", () => {
    expect(CLASSIC_COVERS.map((c) => c.id)).toEqual(["1", "2", "3", "4", "5", "6", "7", "8", "9"])
    expect(CLASSIC_COVERS[0].name).toBe("經典")
    expect(CLASSIC_COVERS[8].name).toBe("滑雪假期")
  })
  it("has dark colors for all cover colors", () => {
    expect(COVER_COLORS.map(({ id, darkFg, darkBg }) => ({ id, darkFg, darkBg }))).toEqual([
      { id: "lake", darkFg: "#4FB394", darkBg: "#17302A" },
      { id: "coral", darkFg: "#F09A76", darkBg: "#3A2519" },
      { id: "red", darkFg: "#E8735A", darkBg: "#3A1E18" },
      { id: "rose", darkFg: "#D77E9C", darkBg: "#37212A" },
      { id: "gold", darkFg: "#D4AE55", darkBg: "#332A16" },
      { id: "plum", darkFg: "#A897D6", darkBg: "#2A2438" },
      { id: "ink", darkFg: "#D9D2C7", darkBg: "#2A2622" },
      { id: "sky", darkFg: "#8FB4D9", darkBg: "#1D2736" },
      { id: "moss", darkFg: "#9CB06A", darkBg: "#242A16" },
      { id: "sand", darkFg: "#C9AE8C", darkBg: "#2E261C" },
      { id: "slate", darkFg: "#A9B5C5", darkBg: "#232933" },
      { id: "berry", darkFg: "#D98AA6", darkBg: "#331C26" },
      { id: "ocean", darkFg: "#7BC0CC", darkBg: "#142B30" },
      { id: "cobalt", darkFg: "#8FA6E0", darkBg: "#1A2238" },
      { id: "mint", darkFg: "#7FC4B4", darkBg: "#16302B" },
    ])
  })
})
