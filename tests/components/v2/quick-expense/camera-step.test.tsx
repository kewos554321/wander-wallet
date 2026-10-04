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
