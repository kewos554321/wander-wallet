import { describe, it, expect, vi, afterEach, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { CameraStep } from "@/components/v2/quick-expense/camera-step"
import { isIOSDevice } from "@/components/v2/quick-expense/use-camera"

const setMedia = (getUserMedia?: unknown) =>
  Object.defineProperty(navigator, "mediaDevices", { value: getUserMedia ? { getUserMedia } : undefined, configurable: true })

const originalToBlob = HTMLCanvasElement.prototype.toBlob
const originalVideoWidth = Object.getOwnPropertyDescriptor(HTMLVideoElement.prototype, "videoWidth")
const originalVideoHeight = Object.getOwnPropertyDescriptor(HTMLVideoElement.prototype, "videoHeight")

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined as never)
})

afterEach(() => {
  setMedia(undefined)
  vi.restoreAllMocks()
  Object.defineProperty(HTMLCanvasElement.prototype, "toBlob", { configurable: true, value: originalToBlob })
  if (originalVideoWidth) Object.defineProperty(HTMLVideoElement.prototype, "videoWidth", originalVideoWidth)
  if (originalVideoHeight) Object.defineProperty(HTMLVideoElement.prototype, "videoHeight", originalVideoHeight)
})

describe("isIOSDevice", () => {
  it("detects iPhone", () => {
    expect(isIOSDevice("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)")).toBe(true)
    expect(isIOSDevice("Mozilla/5.0 (Linux; Android 14)")).toBe(false)
  })

  it("detects iPadOS desktop-mode user agents via touch support", () => {
    const touch = (n: number) => Object.defineProperty(navigator, "maxTouchPoints", { configurable: true, value: n })
    touch(5)
    expect(isIOSDevice("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)")).toBe(true)
    touch(0)
    expect(isIOSDevice("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)")).toBe(false)
  })
})

describe("CameraStep", () => {
  const props = () => ({ onImage: vi.fn(), onClose: vi.fn() })

  it("renders a centred title with the close button on the left", () => {
    const p = props()
    render(<CameraStep {...p} />)
    const title = screen.getByText("拍照記帳")
    const close = screen.getByRole("button", { name: "關閉" })
    const header = close.parentElement!
    expect(header.children[0]).toBe(close)
    expect(header.children[1]).toBe(title)
    fireEvent.click(close)
    expect(p.onClose).toHaveBeenCalled()
  })

  it("falls back to the capture buttons when there is no camera api", async () => {
    render(<CameraStep {...props()} />)
    await waitFor(() => expect(screen.getByRole("button", { name: "開啟相機" })).toBeInTheDocument())
    expect(screen.getByRole("button", { name: "從相簿選擇" })).toBeInTheDocument()
    // The centred framing copy was removed.
    expect(screen.queryByText("將發票或收據置於框內")).toBeNull()
  })

  it("falls back when the camera fails for a non-permission reason", async () => {
    setMedia(vi.fn().mockRejectedValue(new Error("camera busy")))
    render(<CameraStep {...props()} />)
    await waitFor(() => expect(screen.getByRole("button", { name: "開啟相機" })).toBeInTheDocument())
  })

  it("shows a permission message with retry when access is denied", async () => {
    const denied = Object.assign(new Error("Permission denied"), { name: "NotAllowedError" })
    const getUserMedia = vi.fn().mockRejectedValue(denied)
    setMedia(getUserMedia)
    render(<CameraStep {...props()} />)
    expect(await screen.findByText("請允許相機權限")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "重新嘗試" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "從相簿選擇" })).toBeInTheDocument()
    const calls = getUserMedia.mock.calls.length
    fireEvent.click(screen.getByRole("button", { name: "重新嘗試" }))
    await waitFor(() => expect(getUserMedia.mock.calls.length).toBeGreaterThan(calls))
  })

  it("retries with any camera when the environment camera is unavailable", async () => {
    const getUserMedia = vi.fn().mockRejectedValueOnce(new Error("OverconstrainedError")).mockResolvedValueOnce({ getTracks: () => [] })
    setMedia(getUserMedia)
    render(<CameraStep {...props()} />)
    await waitFor(() => expect(screen.getByRole("button", { name: "拍照" })).toBeInTheDocument())
    expect(getUserMedia).toHaveBeenCalledTimes(2)
  })

  it("requests a high-resolution stream so shots are not blurry", async () => {
    const getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => [] })
    setMedia(getUserMedia)
    render(<CameraStep {...props()} />)
    await waitFor(() => expect(screen.getByRole("button", { name: "拍照" })).toBeInTheDocument())
    expect(getUserMedia.mock.calls[0][0]).toMatchObject({
      video: { facingMode: { ideal: "environment" }, width: { ideal: 3840 }, height: { ideal: 2160 } },
    })
  })

  it("taps to focus when the track supports it", async () => {
    const applyConstraints = vi.fn().mockResolvedValue(undefined)
    const track = { getCapabilities: () => ({ focusMode: ["single-shot", "continuous"], pointsOfInterest: [{}] }), applyConstraints, getTracks: () => [] }
    setMedia(vi.fn().mockResolvedValue({ getTracks: () => [], getVideoTracks: () => [track] }))
    render(<CameraStep {...props()} />)
    await screen.findByRole("button", { name: "拍照" })
    const viewfinder = screen.getByTestId("camera-viewfinder")
    viewfinder.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 400, right: 200, bottom: 400, x: 0, y: 0, toJSON: () => ({}) })
    fireEvent(viewfinder, new MouseEvent("pointerdown", { bubbles: true, clientX: 100, clientY: 100 }))
    expect(screen.getByTestId("focus-ring")).toBeInTheDocument()
    await waitFor(() => expect(applyConstraints).toHaveBeenCalled())
    expect(applyConstraints.mock.calls[0][0].advanced[0]).toMatchObject({ focusMode: "single-shot", pointsOfInterest: [{ x: 0.5, y: 0.25 }] })
  })

  it("does not tap-to-focus when the track has no focus capabilities", async () => {
    const applyConstraints = vi.fn().mockResolvedValue(undefined)
    const track = { getCapabilities: () => ({}), applyConstraints, getTracks: () => [] }
    setMedia(vi.fn().mockResolvedValue({ getTracks: () => [], getVideoTracks: () => [track] }))
    render(<CameraStep {...props()} />)
    await screen.findByRole("button", { name: "拍照" })
    fireEvent.pointerDown(screen.getByTestId("camera-viewfinder"), { clientX: 10, clientY: 10 })
    expect(screen.queryByTestId("focus-ring")).toBeNull()
    expect(applyConstraints).not.toHaveBeenCalled()
  })

  it("toggles the torch when the track supports it", async () => {
    const applyConstraints = vi.fn().mockResolvedValue(undefined)
    const track = { getCapabilities: () => ({ torch: true }), applyConstraints, getTracks: () => [] }
    setMedia(vi.fn().mockResolvedValue({ getTracks: () => [], getVideoTracks: () => [track] }))
    render(<CameraStep {...props()} />)
    const torch = await screen.findByRole("button", { name: "手電筒" })
    expect(torch).toHaveAttribute("aria-pressed", "false")
    fireEvent.click(torch)
    await waitFor(() => expect(applyConstraints).toHaveBeenCalledWith(expect.objectContaining({ advanced: [{ torch: true }] })))
    await waitFor(() => expect(screen.getByRole("button", { name: "手電筒" })).toHaveAttribute("aria-pressed", "true"))
  })

  it("hides the torch button when the track does not support it", async () => {
    const track = { getCapabilities: () => ({}), applyConstraints: vi.fn(), getTracks: () => [] }
    setMedia(vi.fn().mockResolvedValue({ getTracks: () => [], getVideoTracks: () => [track] }))
    render(<CameraStep {...props()} />)
    await screen.findByRole("button", { name: "拍照" })
    expect(screen.queryByRole("button", { name: "手電筒" })).toBeNull()
  })

  it("does not show the focus ring when the device only offers manual focus", async () => {
    const applyConstraints = vi.fn().mockResolvedValue(undefined)
    const track = { getCapabilities: () => ({ focusMode: ["manual"] }), applyConstraints, getTracks: () => [] }
    setMedia(vi.fn().mockResolvedValue({ getTracks: () => [], getVideoTracks: () => [track] }))
    render(<CameraStep {...props()} />)
    await screen.findByRole("button", { name: "拍照" })
    fireEvent.pointerDown(screen.getByTestId("camera-viewfinder"), { clientX: 10, clientY: 10 })
    expect(screen.queryByTestId("focus-ring")).toBeNull()
    expect(applyConstraints).not.toHaveBeenCalled()
  })

  it("opens the hidden native camera and gallery inputs from the fallback buttons", async () => {
    render(<CameraStep {...props()} />)
    const cameraInput = screen.getByTestId("camera-input")
    const galleryInput = screen.getByTestId("gallery-input")
    const cameraClick = vi.spyOn(cameraInput, "click")
    const galleryClick = vi.spyOn(galleryInput, "click")
    fireEvent.click(await screen.findByRole("button", { name: "開啟相機" }))
    expect(cameraClick).toHaveBeenCalledTimes(1)
    expect(galleryClick).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole("button", { name: "從相簿選擇" }))
    expect(galleryClick).toHaveBeenCalledTimes(1)
  })

  it("captures a live frame and forwards the resulting jpeg file", async () => {
    const toBlob = vi.fn((cb: BlobCallback) => cb(new Blob(["frame"], { type: "image/jpeg" })))
    Object.defineProperty(HTMLCanvasElement.prototype, "toBlob", { configurable: true, value: toBlob })
    Object.defineProperty(HTMLVideoElement.prototype, "videoWidth", { configurable: true, get: () => 640 })
    Object.defineProperty(HTMLVideoElement.prototype, "videoHeight", { configurable: true, get: () => 480 })
    setMedia(vi.fn().mockResolvedValue({ getTracks: () => [] }))
    const p = props()
    render(<CameraStep {...p} />)
    fireEvent.click(await screen.findByRole("button", { name: "拍照" }))
    await waitFor(() => expect(p.onImage).toHaveBeenCalledTimes(1))
    const file = p.onImage.mock.calls[0][0] as File
    expect(file).toBeInstanceOf(File)
    expect(file.name).toMatch(/^receipt-\d+\.jpg$/)
    expect(file.type).toBe("image/jpeg")
    expect(toBlob).toHaveBeenCalledTimes(1)
  })

  it("does not forward anything when a live frame cannot be captured", async () => {
    Object.defineProperty(HTMLVideoElement.prototype, "videoWidth", { configurable: true, get: () => 0 })
    setMedia(vi.fn().mockResolvedValue({ getTracks: () => [] }))
    const p = props()
    render(<CameraStep {...p} />)
    fireEvent.click(await screen.findByRole("button", { name: "拍照" }))
    await waitFor(() => expect(screen.getByRole("button", { name: "拍照" })).toBeInTheDocument())
    expect(p.onImage).not.toHaveBeenCalled()
  })

  it("opens the gallery input from the live-mode icon button", async () => {
    setMedia(vi.fn().mockResolvedValue({ getTracks: () => [] }))
    render(<CameraStep {...props()} />)
    await screen.findByRole("button", { name: "拍照" })
    const galleryClick = vi.spyOn(screen.getByTestId("gallery-input"), "click")
    fireEvent.click(screen.getByRole("button", { name: "從相簿選擇" }))
    expect(galleryClick).toHaveBeenCalledTimes(1)
  })

  it("stops tracks on unmount when live", async () => {
    const stop = vi.fn()
    setMedia(vi.fn().mockResolvedValue({ getTracks: () => [{ stop }] }))
    const { unmount } = render(<CameraStep {...props()} />)
    await waitFor(() => expect(screen.getByRole("button", { name: "拍照" })).toBeInTheDocument())
    unmount()
    expect(stop).toHaveBeenCalled()
  })

  it("passes a picked file and no longer offers manual input", async () => {
    const p = props()
    const { container } = render(<CameraStep {...p} />)
    const file = new File(["a"], "r.jpg", { type: "image/jpeg" })
    fireEvent.change(container.querySelector('input[data-testid="gallery-input"]')!, { target: { files: [file] } })
    expect(p.onImage).toHaveBeenCalledWith(file)
    expect(screen.queryByRole("button", { name: "改用手動輸入" })).toBeNull()
  })

  it("starts camera stream only once and does not restart", async () => {
    const stop = vi.fn()
    const getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => [{ stop }] })
    setMedia(getUserMedia)
    const { unmount } = render(<CameraStep {...props()} />)
    await waitFor(() => expect(screen.getByRole("button", { name: "拍照" })).toBeInTheDocument())
    expect(getUserMedia).toHaveBeenCalledTimes(1)
    expect(stop).not.toHaveBeenCalled()
    unmount()
    expect(stop).toHaveBeenCalledTimes(1)
  })
})
