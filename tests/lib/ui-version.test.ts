import { describe, it, expect, vi, afterEach } from "vitest"
import {
  parseUiVersion,
  resolveUiVersion,
  readStoredUiVersion,
  writeStoredUiVersion,
  UI_VERSION_STORAGE_KEY,
} from "@/lib/ui-version"

describe("parseUiVersion", () => {
  it("accepts v1 and v2", () => {
    expect(parseUiVersion("v1")).toBe("v1")
    expect(parseUiVersion("v2")).toBe("v2")
  })

  it("rejects anything else", () => {
    expect(parseUiVersion("v3")).toBeNull()
    expect(parseUiVersion("V2")).toBeNull()
    expect(parseUiVersion("")).toBeNull()
    expect(parseUiVersion(null)).toBeNull()
    expect(parseUiVersion(undefined)).toBeNull()
    expect(parseUiVersion(2)).toBeNull()
  })
})

describe("resolveUiVersion", () => {
  it("prefers a valid url param and marks it overridden", () => {
    expect(resolveUiVersion({ param: "v2", stored: "v1", preference: "v1" })).toEqual({
      version: "v2",
      overridden: true,
    })
  })

  it("ignores an invalid param and falls back to stored", () => {
    expect(resolveUiVersion({ param: "v3", stored: "v2", preference: "v1" })).toEqual({
      version: "v2",
      overridden: true,
    })
  })

  it("uses preference when there is no param or stored value", () => {
    expect(resolveUiVersion({ param: null, stored: null, preference: "v2" })).toEqual({
      version: "v2",
      overridden: false,
    })
  })

  it("defaults to v2", () => {
    expect(resolveUiVersion({ param: null, stored: "garbage", preference: undefined })).toEqual({
      version: "v2",
      overridden: false,
    })
  })
})

describe("stored ui version", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    window.sessionStorage.clear()
  })

  it("round-trips through sessionStorage", () => {
    writeStoredUiVersion("v2")
    expect(window.sessionStorage.getItem(UI_VERSION_STORAGE_KEY)).toBe("v2")
    expect(readStoredUiVersion()).toBe("v2")
  })

  it("returns null when sessionStorage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError")
    })
    expect(readStoredUiVersion()).toBeNull()
  })

  it("does not throw when writing fails", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError")
    })
    expect(() => writeStoredUiVersion("v2")).not.toThrow()
  })
})
