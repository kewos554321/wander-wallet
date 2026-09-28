import { describe, it, expect } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { emptyProjectForm, validateProjectForm, toCreatePayload, toUpdatePayload, useProjectForm, JOIN_MODE_OPTIONS } from "@/lib/hooks/use-project-form"

const v = (o = {}) => ({ ...emptyProjectForm("TWD"), name: "京都", ...o })

describe("project form", () => {
  it("defaults", () => {
    expect(emptyProjectForm("JPY")).toEqual({ name: "", description: "", cover: "icon:leaf;color:lake", startDate: null, endDate: null, currency: "JPY", budget: "", joinMode: "both", exchangeRatePrecision: 2, customRates: {} })
    expect(JOIN_MODE_OPTIONS.map((o) => o.value)).toEqual(["both", "create_only", "claim_only"])
  })
  it("validates in order", () => {
    expect(validateProjectForm(v({ name: "  " }))).toBe("請輸入旅程名稱")
    expect(validateProjectForm(v({ startDate: "2026-11-16", endDate: "2026-11-12" }))).toBe("結束日需晚於出發日")
    for (const budget of ["-1", "abc"]) expect(validateProjectForm(v({ budget }))).toBe("預算需為 0 以上的數字")
    for (const exchangeRatePrecision of [-1, 9, 1.5]) expect(validateProjectForm(v({ exchangeRatePrecision }))).toBe("匯率精度需為 0 到 8 的整數")
    expect(validateProjectForm(v({ customRates: { JPY: "0" } }))).toBe("自訂匯率需大於 0")
    expect(validateProjectForm(v({ budget: "", startDate: "2026-11-12", endDate: "2026-11-12", customRates: { JPY: "" } }))).toBeNull()
  })
  it("builds payloads", () => {
    const f = v({ name: " 京都 ", description: " ", budget: "50000", startDate: "2026-11-12", endDate: "2026-11-16", customRates: { JPY: "0.21", USD: "" } })
    expect(toCreatePayload(f)).toEqual({ name: "京都", description: null, cover: "icon:leaf;color:lake", startDate: "2026-11-12", endDate: "2026-11-16", budget: 50000, currency: "TWD", joinMode: "both" })
    expect(toUpdatePayload(f)).toEqual({ ...toCreatePayload(f), exchangeRatePrecision: 2, customRates: { JPY: 0.21 } })
    expect(toUpdatePayload(v()).customRates).toBeNull()
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
