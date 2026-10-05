import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { MileageV2View } from "@/components/v2/mileage/mileage-v2-view"

vi.mock("next/font/google", () => ({
  Noto_Serif_TC: () => ({ variable: "font-var-serif" }),
  Noto_Sans_TC: () => ({ variable: "font-var-sans" }),
}))

const mockProjectData = vi.hoisted(() => vi.fn())
vi.mock("@/lib/hooks", () => ({ useProjectData: () => mockProjectData() }))
vi.mock("@/components/auth/liff-provider", () => ({ useAuthFetch: () => vi.fn(), useLiff: () => ({ user: { id: "u1" } }) }))

import { MileageV2 } from "@/components/v2/mileage/mileage-v2"

function renderView(overrides: Partial<Parameters<typeof MileageV2View>[0]> = {}) {
  const props: Parameters<typeof MileageV2View>[0] = {
    projectId: "p1",
    projectCurrency: "TWD",
    waypoints: ["東京車站", "京都嵐山"],
    totalKm: 320,
    fuelPrice: 32.5,
    fuelEfficiency: 13,
    participants: 4,
    showResult: true,
    totalFuel: 800,
    perPerson: 200,
    canCalculate: true,
    mapsUrl: "https://www.google.com/maps/dir/?api=1&origin=x&destination=y",
    fuelPrices: [
      { product: "95無鉛汽油", price: 32.5 },
      { product: "98無鉛汽油", price: 34.2 },
    ],
    loadingPrice: false,
    priceSource: "中油",
    onWaypoint: vi.fn(),
    onAddWaypoint: vi.fn(),
    onRemoveWaypoint: vi.fn(),
    onOpenMaps: vi.fn(),
    onTotalKm: vi.fn(),
    onFuelPrice: vi.fn(),
    onFuelEfficiency: vi.fn(),
    onParticipants: vi.fn(),
    onRefreshPrice: vi.fn(),
    onCalculate: vi.fn(),
    ...overrides,
  }
  render(<MileageV2View {...props} />)
  return props
}

describe("MileageV2View", () => {
  it("renders the route planner and fuel calculator", () => {
    renderView()
    expect(screen.getByRole("heading", { name: "里程" })).toBeInTheDocument()
    expect(screen.getByText("路線規劃")).toBeInTheDocument()
    expect(screen.getByText("油費計算")).toBeInTheDocument()
    expect(screen.getByDisplayValue("東京車站")).toBeInTheDocument()
    expect(screen.getByDisplayValue("320")).toBeInTheDocument()
  })

  it("reports waypoint edits, add and remove", () => {
    const props = renderView({ waypoints: ["A", "B", "C"] })
    fireEvent.change(screen.getByDisplayValue("B"), { target: { value: "B2" } })
    expect(props.onWaypoint).toHaveBeenCalledWith(1, "B2")
    fireEvent.click(screen.getByRole("button", { name: /新增地點/ }))
    expect(props.onAddWaypoint).toHaveBeenCalled()
    fireEvent.click(screen.getAllByRole("button", { name: "移除" })[0])
    expect(props.onRemoveWaypoint).toHaveBeenCalledWith(1)
  })

  it("reports number inputs and calculation", () => {
    const props = renderView()
    fireEvent.change(screen.getByLabelText("總里程 (km)"), { target: { value: "500" } })
    expect(props.onTotalKm).toHaveBeenCalledWith(500)
    fireEvent.change(screen.getByLabelText("分攤人數"), { target: { value: "5" } })
    expect(props.onParticipants).toHaveBeenCalledWith(5)
    fireEvent.click(screen.getByRole("button", { name: /計算油費/ }))
    expect(props.onCalculate).toHaveBeenCalled()
    fireEvent.click(screen.getByRole("button", { name: /開啟 Google Maps/ }))
    expect(props.onOpenMaps).toHaveBeenCalled()
  })

  it("picks a quick fuel price", () => {
    const props = renderView()
    fireEvent.click(screen.getByRole("button", { name: /34\.2/ }))
    expect(props.onFuelPrice).toHaveBeenCalledWith(34.2)
  })

  it("shows the dark result card after calculating", () => {
    renderView()
    expect(screen.getByText("總油費")).toBeInTheDocument()
    expect(screen.getByText("TWD 800")).toBeInTheDocument()
    expect(screen.getByText("TWD 200")).toBeInTheDocument()
  })

  it("hides the result card before calculating", () => {
    renderView({ showResult: false })
    expect(screen.queryByText("總油費")).not.toBeInTheDocument()
  })
})

describe("MileageV2 container", () => {
  beforeEach(() => {
    mockProjectData.mockReset().mockReturnValue({ project: { currency: "TWD" }, projectCurrency: "TWD", loading: false })
  })

  it("loads fuel prices and renders the page", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ prices: [{ product: "95無鉛汽油", price: 32.5 }, { product: "98無鉛汽油", price: 34.2 }], source: "中油" }),
    })
    vi.stubGlobal("fetch", fetchMock)
    render(<MileageV2 projectId="p1" />)
    expect(screen.getByRole("heading", { name: "里程" })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText(/34\.2/)).toBeInTheDocument())
    vi.unstubAllGlobals()
  })
})
