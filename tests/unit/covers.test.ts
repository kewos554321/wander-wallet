import { describe, it, expect } from "vitest"
import {
  PRESET_COVERS,
  parseCover,
  getPresetCover,
  createCoverString,
} from "@/lib/covers"

describe("covers utilities", () => {
  describe("PRESET_COVERS", () => {
    it("should have 6 preset covers", () => {
      expect(PRESET_COVERS).toHaveLength(6)
    })

    it("each preset should have required properties", () => {
      PRESET_COVERS.forEach((cover) => {
        expect(cover).toHaveProperty("id")
        expect(cover).toHaveProperty("name")
        expect(cover).toHaveProperty("gradient")
        expect(cover).toHaveProperty("emoji")
        expect(typeof cover.id).toBe("string")
        expect(typeof cover.name).toBe("string")
        expect(typeof cover.gradient).toBe("string")
        expect(typeof cover.emoji).toBe("string")
      })
    })

    it("preset ids should be unique", () => {
      const ids = PRESET_COVERS.map((c) => c.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })
  })

  describe("parseCover", () => {
    it("should return type none for null", () => {
      const result = parseCover(null)
      expect(result).toEqual({ type: "none" })
    })

    it("should return type none for undefined", () => {
      const result = parseCover(undefined)
      expect(result).toEqual({ type: "none" })
    })

    it("should return type none for empty string", () => {
      const result = parseCover("")
      expect(result).toEqual({ type: "none" })
    })

    it("should parse preset cover string", () => {
      const result = parseCover("preset:1")
      expect(result).toEqual({
        type: "preset",
        presetId: "1",
      })
    })

    it("should parse preset cover with different id", () => {
      const result = parseCover("preset:5")
      expect(result).toEqual({
        type: "preset",
        presetId: "5",
      })
    })

    it("should parse custom cover (base64)", () => {
      const base64Url = "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
      const result = parseCover(base64Url)
      expect(result).toEqual({
        type: "custom",
        customUrl: base64Url,
      })
    })

    it("should parse custom cover (external URL)", () => {
      const url = "https://example.com/image.jpg"
      const result = parseCover(url)
      expect(result).toEqual({
        type: "custom",
        customUrl: url,
      })
    })
  })

  describe("getPresetCover", () => {
    it("should return preset cover by id", () => {
      const cover = getPresetCover("1")
      expect(cover).toBeDefined()
      expect(cover?.id).toBe("1")
      expect(cover?.name).toBe("海灘度假")
    })

    it("should return undefined for invalid id", () => {
      const cover = getPresetCover("999")
      expect(cover).toBeUndefined()
    })

    it("should return correct cover for each preset id", () => {
      PRESET_COVERS.forEach((preset) => {
        const cover = getPresetCover(preset.id)
        expect(cover).toEqual(preset)
      })
    })
  })

  describe("createCoverString", () => {
    it("should create preset cover string", () => {
      const result = createCoverString("preset", "3")
      expect(result).toBe("preset:3")
    })

    it("should return custom url as-is", () => {
      const url = "data:image/jpeg;base64,abc123"
      const result = createCoverString("custom", url)
      expect(result).toBe(url)
    })

    it("should handle external URLs", () => {
      const url = "https://example.com/photo.png"
      const result = createCoverString("custom", url)
      expect(result).toBe(url)
    })
  })

  describe("integration: create and parse", () => {
    it("should round-trip preset cover", () => {
      const created = createCoverString("preset", "2")
      const parsed = parseCover(created)
      expect(parsed.type).toBe("preset")
      expect(parsed.presetId).toBe("2")
    })

    it("should round-trip custom cover", () => {
      const customUrl = "https://example.com/my-image.jpg"
      const created = createCoverString("custom", customUrl)
      const parsed = parseCover(created)
      expect(parsed.type).toBe("custom")
      expect(parsed.customUrl).toBe(customUrl)
    })
  })
})
