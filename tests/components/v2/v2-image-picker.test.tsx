import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { V2ImagePicker } from "@/components/v2/expense-form/v2-image-picker"

type Props = Parameters<typeof V2ImagePicker>[0]

function setup(overrides: Partial<Props> = {}) {
  const onChange = vi.fn()
  const onError = vi.fn()
  const props: Props = { label: "收據/消費圖片", value: null, onChange, onError, ...overrides }
  const utils = render(<V2ImagePicker {...props} />)
  return { ...props, ...utils }
}

function fileInputs(container: HTMLElement) {
  const camera = container.querySelector('input[type="file"][capture="environment"]') as HTMLInputElement
  const gallery = container.querySelector('input[type="file"]:not([capture])') as HTMLInputElement
  return { camera, gallery }
}

describe("V2ImagePicker", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("renders a v2-token card with the label and an add trigger", () => {
    const { container } = setup()
    expect(screen.getByText("收據/消費圖片")).toBeInTheDocument()
    const card = container.firstElementChild as HTMLElement
    expect(card.className).toContain("bg-v2-surface")
    expect(screen.getByRole("button", { name: "新增圖片" })).toHaveAttribute("aria-expanded", "false")
  })

  it("opens the camera input (capture=environment) from 拍照", () => {
    const { container } = setup()
    fireEvent.click(screen.getByRole("button", { name: "新增圖片" }))
    const { camera } = fileInputs(container)
    const spy = vi.spyOn(camera, "click")
    fireEvent.click(screen.getByRole("button", { name: "拍照" }))
    expect(spy).toHaveBeenCalled()
  })

  it("opens the gallery input from 從相簿選擇", () => {
    const { container } = setup()
    fireEvent.click(screen.getByRole("button", { name: "新增圖片" }))
    const { gallery } = fileInputs(container)
    const spy = vi.spyOn(gallery, "click")
    fireEvent.click(screen.getByRole("button", { name: "從相簿選擇" }))
    expect(spy).toHaveBeenCalled()
  })

  it("calls onChange with the selected image file", () => {
    const { container, onChange } = setup()
    const { gallery } = fileInputs(container)
    const file = new File(["x"], "receipt.jpg", { type: "image/jpeg" })
    fireEvent.change(gallery, { target: { files: [file] } })
    expect(onChange).toHaveBeenCalledWith(file)
  })

  it("shows an alert for a non-image file without calling window.alert", () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {})
    const { container } = setup()
    const { gallery } = fileInputs(container)
    const file = new File(["x"], "notes.txt", { type: "text/plain" })
    fireEvent.change(gallery, { target: { files: [file] } })
    expect(screen.getByRole("alert")).toHaveTextContent("請選擇圖片檔案")
    expect(alertSpy).not.toHaveBeenCalled()
  })

  it("shows an alert when the file exceeds the size limit", () => {
    const { container } = setup()
    const { gallery } = fileInputs(container)
    const big = new File([new ArrayBuffer(11 * 1024 * 1024)], "big.png", { type: "image/png" })
    fireEvent.change(gallery, { target: { files: [big] } })
    expect(screen.getByRole("alert")).toHaveTextContent("圖片大小不能超過 10MB")
  })

  it("renders the preview image when a value is present", () => {
    setup({ value: "https://cdn.example/r.jpg" })
    expect(screen.getByAltText("圖片預覽")).toHaveAttribute("src", "https://cdn.example/r.jpg")
  })
})
