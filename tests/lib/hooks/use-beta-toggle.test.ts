import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"

const save = vi.fn()
const ui = { version: "v2" as "v1" | "v2" | null }
vi.mock("@/lib/hooks/useUiVersion", () => ({ useUiVersion: () => ui }))
vi.mock("@/lib/hooks/use-preferences", () => ({ usePreferences: () => ({ save, saving: false, error: null }) }))
import { useBetaToggle } from "@/lib/hooks/use-beta-toggle"
import { UI_VERSION_CHANGE_EVENT, UI_VERSION_STORAGE_KEY } from "@/lib/ui-version"

beforeEach(() => {
  save.mockReset()
  window.sessionStorage.setItem(UI_VERSION_STORAGE_KEY, "v2")
  window.history.replaceState(null, "", "/settings?ui=v2&x=1")
})

describe("useBetaToggle", () => {
  it("reflects the active version", () => {
    ui.version = "v2"
    expect(renderHook(() => useBetaToggle()).result.current.enabled).toBe(true)
    ui.version = "v1"
    expect(renderHook(() => useBetaToggle()).result.current.enabled).toBe(false)
  })
  it("saves and clears overrides on success", async () => {
    save.mockResolvedValue(true)
    const onChange = vi.fn()
    window.addEventListener(UI_VERSION_CHANGE_EVENT, onChange)
    const h = renderHook(() => useBetaToggle())
    await act(() => h.result.current.toggle(false))
    expect(save).toHaveBeenCalledWith({ uiVersion: "v1" })
    expect(window.sessionStorage.getItem(UI_VERSION_STORAGE_KEY)).toBeNull()
    expect(window.location.search).toBe("?x=1")
    expect(onChange).toHaveBeenCalled()
    window.removeEventListener(UI_VERSION_CHANGE_EVENT, onChange)
  })
  it("keeps overrides when saving fails", async () => {
    save.mockResolvedValue(false)
    const h = renderHook(() => useBetaToggle())
    await act(() => h.result.current.toggle(true))
    expect(save).toHaveBeenCalledWith({ uiVersion: "v2" })
    expect(window.sessionStorage.getItem(UI_VERSION_STORAGE_KEY)).toBe("v2")
  })
})
