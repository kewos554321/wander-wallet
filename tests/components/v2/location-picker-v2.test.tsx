import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { LocationPickerV2 } from "@/components/v2/expense-form/location-picker-v2"

const mockFetch = vi.fn()
vi.stubGlobal("fetch", mockFetch)

const originalGeolocation = navigator.geolocation

function setGeolocation(value: unknown) {
  Object.defineProperty(navigator, "geolocation", { value, writable: true, configurable: true })
}

const VALUE = { location: "Test Location", latitude: 25.0, longitude: 121.5 }

describe("LocationPickerV2", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    setGeolocation(originalGeolocation)
  })

  // Ported from tests/components/location-picker.test.tsx (shared behaviour).
  it("shows an add-location control when there is no value", () => {
    render(<LocationPickerV2 onChange={vi.fn()} />)
    expect(screen.getByText("新增地點")).toBeInTheDocument()
  })

  it("shows the current value and a relocate control when a value exists", () => {
    render(<LocationPickerV2 value={VALUE} onChange={vi.fn()} />)
    expect(screen.getByText("Test Location")).toBeInTheDocument()
    expect(screen.getByText("重新定位")).toBeInTheDocument()
  })

  it("opens the panel showing the current-location, search and cancel controls", () => {
    render(<LocationPickerV2 onChange={vi.fn()} />)
    fireEvent.click(screen.getByText("新增地點"))
    expect(screen.getByText("使用目前位置")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("搜尋地點...")).toBeInTheDocument()
    expect(screen.getByText("取消")).toBeInTheDocument()
  })

  it("closes the panel when cancel is clicked", () => {
    render(<LocationPickerV2 onChange={vi.fn()} />)
    fireEvent.click(screen.getByText("新增地點"))
    fireEvent.click(screen.getByText("取消"))
    expect(screen.queryByText("使用目前位置")).not.toBeInTheDocument()
  })

  it("clears the location through onChange when the clear button is clicked", () => {
    const onChange = vi.fn()
    render(<LocationPickerV2 value={VALUE} onChange={onChange} />)
    fireEvent.click(screen.getByText("重新定位"))
    fireEvent.click(screen.getByLabelText("清除位置"))
    expect(onChange).toHaveBeenCalledWith({ location: null, latitude: null, longitude: null })
  })

  it("searches the geocode API after typing (debounced)", async () => {
    const longName = "台".repeat(90)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([{ displayName: longName, lat: 25.033, lon: 121.5654 }]),
    })
    render(<LocationPickerV2 onChange={vi.fn()} />)
    fireEvent.click(screen.getByText("新增地點"))
    fireEvent.change(screen.getByPlaceholderText("搜尋地點..."), { target: { value: "台北" } })
    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith("/api/geocode?q=%E5%8F%B0%E5%8C%97"), { timeout: 1000 })
    expect(await screen.findByText(`${"台".repeat(80)}...`)).toBeInTheDocument()
  })

  it("shows an error when geolocation is not supported", () => {
    setGeolocation(undefined)
    render(<LocationPickerV2 onChange={vi.fn()} />)
    fireEvent.click(screen.getByText("新增地點"))
    fireEvent.click(screen.getByText("使用目前位置"))
    expect(screen.getByText("您的瀏覽器不支援定位功能")).toBeInTheDocument()
  })

  it("applies a custom className to the root element", () => {
    const { container } = render(<LocationPickerV2 onChange={vi.fn()} className="custom-class" />)
    expect(container.firstChild).toHaveClass("custom-class")
  })

  // Net-new for v2 (not in the v1 suite).
  it("applies the picked result and closes the panel", async () => {
    const onChange = vi.fn()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([{ displayName: "台北市", lat: 25.033, lon: 121.5654 }]),
    })
    render(<LocationPickerV2 onChange={onChange} />)
    fireEvent.click(screen.getByText("新增地點"))
    fireEvent.change(screen.getByPlaceholderText("搜尋地點..."), { target: { value: "台北" } })
    fireEvent.click(await screen.findByText("台北市"))
    expect(onChange).toHaveBeenCalledWith({ location: "台北市", latitude: 25.033, longitude: 121.5654 })
    await waitFor(() => expect(screen.queryByText("使用目前位置")).not.toBeInTheDocument())
  })

  it("uses the reverse-geocoded name when the current location succeeds", async () => {
    const onChange = vi.fn()
    setGeolocation({
      getCurrentPosition: (resolve: PositionCallback) =>
        resolve({ coords: { latitude: 25.03, longitude: 121.56 } } as unknown as GeolocationPosition),
    })
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ displayName: "台北市", lat: 25.03, lon: 121.56 }) })
    render(<LocationPickerV2 onChange={onChange} />)
    fireEvent.click(screen.getByText("新增地點"))
    fireEvent.click(screen.getByText("使用目前位置"))
    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ location: "台北市", latitude: 25.03, longitude: 121.56 }))
  })

  it("falls back to formatted coordinates when reverse geocoding fails", async () => {
    const onChange = vi.fn()
    setGeolocation({
      getCurrentPosition: (resolve: PositionCallback) =>
        resolve({ coords: { latitude: 25.03, longitude: 121.56 } } as unknown as GeolocationPosition),
    })
    mockFetch.mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({}) })
    render(<LocationPickerV2 onChange={onChange} />)
    fireEvent.click(screen.getByText("新增地點"))
    fireEvent.click(screen.getByText("使用目前位置"))
    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith({ location: "25.030000, 121.560000", latitude: 25.03, longitude: 121.56 })
    )
  })

  it("keeps the value chip visible while the panel is open", () => {
    render(<LocationPickerV2 value={VALUE} onChange={vi.fn()} />)
    fireEvent.click(screen.getByText("重新定位"))
    expect(screen.getByText("使用目前位置")).toBeInTheDocument()
    expect(screen.getByText("Test Location")).toBeInTheDocument()
  })
})
