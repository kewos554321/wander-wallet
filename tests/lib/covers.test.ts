import { describe, it, expect } from "vitest"
import {
  PRESET_COVERS,
  parseCover,
  getPresetCover,
  createCoverString,
} from "@/lib/covers"

describe("Covers Utilities (lib/covers.ts)", () => {
  describe("PRESET_COVERS constant", () => {
    it("should have 6 preset covers", () => {
      expect(PRESET_COVERS).toHaveLength(6)
    })

    it("should have id, name, gradient, and emoji for each cover", () => {
      PRESET_COVERS.forEach((cover) => {
        expect(cover.id).toBeDefined()
        expect(cover.name).toBeDefined()
        expect(cover.gradient).toBeDefined()
        expect(cover.emoji).toBeDefined()
      })
    })

    it("should include expected cover names", () => {
      const names = PRESET_COVERS.map((c) => c.name)
      expect(names).toContain("海灘度假")
      expect(names).toContain("山林探險")
      expect(names).toContain("城市漫遊")
    })
  })

  describe("parseCover function", () => {
    it("should return none type for null", () => {
      expect(parseCover(null)).toEqual({ type: "none" })
    })

    it("should return none type for undefined", () => {
      expect(parseCover(undefined)).toEqual({ type: "none" })
    })

    it("should return none type for empty string", () => {
      expect(parseCover("")).toEqual({ type: "none" })
    })

    it("should parse preset cover string", () => {
      expect(parseCover("preset:1")).toEqual({
        type: "preset",
        presetId: "1",
      })
    })

    it("should parse preset cover with any id", () => {
      expect(parseCover("preset:abc123")).toEqual({
        type: "preset",
        presetId: "abc123",
      })
    })

    it("should parse custom URL as custom type", () => {
      const url = "https://example.com/image.jpg"
      expect(parseCover(url)).toEqual({
        type: "custom",
        customUrl: url,
      })
    })

    it("should parse base64 string as custom type", () => {
      const base64 = "data:image/jpeg;base64,/9j/4AAQ..."
      expect(parseCover(base64)).toEqual({
        type: "custom",
        customUrl: base64,
      })
    })
  })

  describe("getPresetCover function", () => {
    it("should return preset cover for valid id", () => {
      const cover = getPresetCover("1")
      expect(cover).toBeDefined()
      expect(cover?.name).toBe("海灘度假")
      expect(cover?.emoji).toBe("🏖️")
    })

    it("should return undefined for invalid id", () => {
      expect(getPresetCover("invalid")).toBeUndefined()
      expect(getPresetCover("999")).toBeUndefined()
    })

    it("should return correct cover for each id", () => {
      expect(getPresetCover("2")?.name).toBe("山林探險")
      expect(getPresetCover("3")?.name).toBe("城市漫遊")
      expect(getPresetCover("4")?.name).toBe("美食之旅")
      expect(getPresetCover("5")?.name).toBe("文化巡禮")
      expect(getPresetCover("6")?.name).toBe("自然風光")
    })
  })

  describe("createCoverString function", () => {
    it("should create preset string", () => {
      expect(createCoverString("preset", "1")).toBe("preset:1")
      expect(createCoverString("preset", "abc")).toBe("preset:abc")
    })

    it("should return value directly for custom type", () => {
      const url = "https://example.com/image.jpg"
      expect(createCoverString("custom", url)).toBe(url)
    })

    it("should return base64 directly for custom type", () => {
      const base64 = "data:image/jpeg;base64,/9j/4AAQ..."
      expect(createCoverString("custom", base64)).toBe(base64)
    })
  })
})
