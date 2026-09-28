import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { CameraStep } from "@/components/v2/quick-expense/camera-step"
import { isIOSDevice } from "@/components/v2/quick-expense/use-camera"

const setMedia = (getUserMedia?: unknown) =>
  Object.defineProperty(navigator, "mediaDevices", { value: getUserMedia ? { getUserMedia } : undefined, configurable: true })

afterEach(() => setMedia(undefined))

describe("isIOSDevice", () => {
  it("detects iPhone", () => {
    expect(isIOSDevice("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)")).toBe(true)
    expect(isIOSDevice("Mozilla/5.0 (Linux; Android 14)")).toBe(false)
  })
})

describe("CameraStep", () => {
  const props = () => ({ onImage: vi.fn(), onManual: vi.fn(), onClose: vi.fn() })

  it("shows copy and falls back when there is no camera api", async () => {
    render(<CameraStep {...props()} />)
    expect(screen.getByText("將發票或收據置於框內")).toBeInTheDocument()
    expect(screen.getByText("AI 會自動辨識金額與商家")).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole("button", { name: "開啟相機" })).toBeInTheDocument())
    expect(screen.getByRole("button", { name: "從相簿選擇" })).toBeInTheDocument()
  })

  it("falls back when permission is denied", async () => {
    setMedia(vi.fn().mockRejectedValue(new Error("denied")))
    render(<CameraStep {...props()} />)
    await waitFor(() => expect(screen.getByRole("button", { name: "開啟相機" })).toBeInTheDocument())
  })

  it("stops tracks on unmount when live", async () => {
    const stop = vi.fn()
    setMedia(vi.fn().mockResolvedValue({ getTracks: () => [{ stop }] }))
    const { unmount } = render(<CameraStep {...props()} />)
    await waitFor(() => expect(screen.getByRole("button", { name: "拍照" })).toBeInTheDocument())
    unmount()
    expect(stop).toHaveBeenCalled()
  })

  it("passes a picked file and supports manual input", async () => {
    const p = props()
    const { container } = render(<CameraStep {...p} />)
    const file = new File(["a"], "r.jpg", { type: "image/jpeg" })
    fireEvent.change(container.querySelector('input[data-testid="gallery-input"]')!, { target: { files: [file] } })
    expect(p.onImage).toHaveBeenCalledWith(file)
    fireEvent.click(screen.getByRole("button", { name: "改用手動輸入" }))
    expect(p.onManual).toHaveBeenCalled()
  })
})
