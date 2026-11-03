import { describe, it, expect } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { emptyProjectForm, validateProjectForm, toCreatePayload, toUpdatePayload, useProjectForm, JOIN_MODE_OPTIONS } from "@/lib/hooks/use-project-form"

const v = (o = {}) => ({ ...emptyProjectForm("TWD"), name: "京都", ...o })

describe("project form", () => {
  it("defaults", () => {
    expect(emptyProjectForm("JPY")).toEqual({ name: "", description: "", cover: "icon:leaf;color:lake", startDate: null, endDate: null, currency: "JPY", budget: "", joinMode: "both" })
    expect(JOIN_MODE_OPTIONS.map((o) => o.value)).toEqual(["create_only", "claim_only", "both"])
  })
  it("validates in order", () => {
    expect(validateProjectForm(v({ name: "  " }))).toBe("請輸入旅程名稱")
    expect(validateProjectForm(v({ startDate: "2026-11-16", endDate: "2026-11-12" }))).toBe("結束日需晚於出發日")
    for (const budget of ["-1", "abc"]) expect(validateProjectForm(v({ budget }))).toBe("預算需為 0 以上的數字")
    expect(validateProjectForm(v({ budget: "", startDate: "2026-11-12", endDate: "2026-11-12" }))).toBeNull()
  })
  it("builds payloads", () => {
    const f = v({ name: " 京都 ", description: " ", budget: "50000", startDate: "2026-11-12", endDate: "2026-11-16" })
    expect(toCreatePayload(f)).toEqual({ name: "京都", description: null, cover: "icon:leaf;color:lake", startDate: "2026-11-12", endDate: "2026-11-16", budget: 50000, currency: "TWD", joinMode: "both" })
    expect(toUpdatePayload(f)).toEqual(toCreatePayload(f))
    expect(toUpdatePayload(f)).not.toHaveProperty("customRates")
    expect(toCreatePayload(v()).budget).toBeNull()
  })
  it("hook sets values and exposes the error", () => {
    const h = renderHook(() => useProjectForm(v({ name: "" })))
    expect(h.result.current.error).toBe("請輸入旅程名稱")
    act(() => h.result.current.set("name", "東京"))
    expect(h.result.current.values.name).toBe("東京")
    expect(h.result.current.error).toBeNull()
    act(() => h.result.current.reset(v({ name: "大阪" })))
    expect(h.result.current.values.name).toBe("大阪")
  })
})
