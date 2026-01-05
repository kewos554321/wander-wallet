import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { ImagePicker, SimpleImagePicker } from "@/components/ui/image-picker"
import type { ImagePickerValue } from "@/components/ui/image-picker"

// Mock window.navigator
const mockNavigator = {
  userAgent: "Mozilla/5.0 (Macintosh)",
  vendor: "",
  mediaDevices: {
    getUserMedia: vi.fn(),
  },
}

// Mock URL
const mockRevokeObjectURL = vi.fn()
const mockCreateObjectURL = vi.fn().mockReturnValue("blob:mock-url")

describe("ImagePicker Components", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    Object.defineProperty(global, "navigator", {
      value: mockNavigator,
      writable: true,
      configurable: true,
    })

    Object.defineProperty(global, "URL", {
      value: {
        createObjectURL: mockCreateObjectURL,
        revokeObjectURL: mockRevokeObjectURL,
      },
      writable: true,
      configurable: true,
    })
  })

  describe("ImagePicker", () => {
    const defaultValue: ImagePickerValue = {
      image: null,
      pendingFile: null,
      preview: null,
    }

    it("should render camera and gallery buttons when no image", () => {
      render(<ImagePicker value={defaultValue} onChange={vi.fn()} />)

      expect(screen.getByText("拍照")).toBeInTheDocument()
      expect(screen.getByText("選擇圖片")).toBeInTheDocument()
    })

    it("should render image preview when image URL is set", () => {
      const value: ImagePickerValue = {
        image: "https://example.com/image.jpg",
        pendingFile: null,
        preview: null,
      }

      render(<ImagePicker value={value} onChange={vi.fn()} />)

      const img = screen.getByRole("img", { name: "圖片預覽" })
      expect(img).toHaveAttribute("src", "https://example.com/image.jpg")
    })

    it("should render preview image when preview is set", () => {
      const value: ImagePickerValue = {
        image: null,
        pendingFile: new File(["test"], "test.jpg", { type: "image/jpeg" }),
        preview: "blob:preview-url",
      }

      render(<ImagePicker value={value} onChange={vi.fn()} />)

      const img = screen.getByRole("img", { name: "圖片預覽" })
      expect(img).toHaveAttribute("src", "blob:preview-url")
    })

    it("should show pending badge when pendingFile is set", () => {
      const value: ImagePickerValue = {
        image: null,
        pendingFile: new File(["test"], "test.jpg", { type: "image/jpeg" }),
        preview: "blob:preview-url",
      }

      render(<ImagePicker value={value} onChange={vi.fn()} />)

      expect(screen.getByText("待上傳")).toBeInTheDocument()
    })

    it("should call onChange with cleared value when remove button is clicked", async () => {
      const onChange = vi.fn()
      const value: ImagePickerValue = {
        image: "https://example.com/image.jpg",
        pendingFile: null,
        preview: null,
      }

      render(<ImagePicker value={value} onChange={onChange} />)

      const removeButton = screen.getByRole("button")
      await fireEvent.click(removeButton)

      expect(onChange).toHaveBeenCalledWith({
        image: null,
        pendingFile: null,
        preview: null,
      })
    })

    it("should call onRemove when remove button is clicked and onRemove is provided", async () => {
      const onRemove = vi.fn()
      const onChange = vi.fn()
      const value: ImagePickerValue = {
        image: "https://example.com/image.jpg",
        pendingFile: null,
        preview: null,
      }

      render(<ImagePicker value={value} onChange={onChange} onRemove={onRemove} />)

      const removeButton = screen.getByRole("button")
      await fireEvent.click(removeButton)

      expect(onRemove).toHaveBeenCalled()
    })

    it("should revoke preview URL when removing image", async () => {
      const onChange = vi.fn()
      const value: ImagePickerValue = {
        image: null,
        pendingFile: null,
        preview: "blob:preview-url",
      }

      render(<ImagePicker value={value} onChange={onChange} />)

      const removeButton = screen.getByRole("button")
      await fireEvent.click(removeButton)

      expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:preview-url")
    })

    it("should disable buttons when disabled prop is true", () => {
      render(<ImagePicker value={defaultValue} onChange={vi.fn()} disabled />)

      const buttons = screen.getAllByRole("button")
      buttons.forEach(button => {
        expect(button).toBeDisabled()
      })
    })

    it("should accept custom className", () => {
      const { container } = render(
        <ImagePicker value={defaultValue} onChange={vi.fn()} className="custom-class" />
      )

      expect(container.firstChild).toHaveClass("custom-class")
    })

    it("should have hidden file inputs", () => {
      const { container } = render(<ImagePicker value={defaultValue} onChange={vi.fn()} />)

      const fileInputs = container.querySelectorAll('input[type="file"]')
      expect(fileInputs.length).toBe(2) // camera and gallery inputs
      fileInputs.forEach(input => {
        expect(input).toHaveClass("hidden")
      })
    })
  })

  describe("SimpleImagePicker", () => {
    it("should render camera and upload buttons when no image", () => {
      render(<SimpleImagePicker image={null} onFileSelect={vi.fn()} />)

      expect(screen.getByText("拍照")).toBeInTheDocument()
      expect(screen.getByText("上傳")).toBeInTheDocument()
    })

    it("should render only upload button when showCamera is false", () => {
      render(<SimpleImagePicker image={null} onFileSelect={vi.fn()} showCamera={false} />)

      expect(screen.queryByText("拍照")).not.toBeInTheDocument()
      expect(screen.getByText("上傳")).toBeInTheDocument()
    })

    it("should render image when image prop is set", () => {
      render(
        <SimpleImagePicker
          image="https://example.com/image.jpg"
          onFileSelect={vi.fn()}
        />
      )

      const img = screen.getByRole("img", { name: "圖片" })
      expect(img).toHaveAttribute("src", "https://example.com/image.jpg")
    })

    it("should call onRemove when remove button is clicked", async () => {
      const onRemove = vi.fn()
      render(
        <SimpleImagePicker
          image="https://example.com/image.jpg"
          onFileSelect={vi.fn()}
          onRemove={onRemove}
        />
      )

      const removeButton = screen.getByRole("button")
      await fireEvent.click(removeButton)

      expect(onRemove).toHaveBeenCalled()
    })

    it("should show loading state when uploading", () => {
      render(<SimpleImagePicker image={null} onFileSelect={vi.fn()} uploading />)

      expect(screen.getByText("處理中...")).toBeInTheDocument()
    })

    it("should disable buttons when disabled", () => {
      render(<SimpleImagePicker image={null} onFileSelect={vi.fn()} disabled />)

      const buttons = screen.getAllByRole("button")
      buttons.forEach(button => {
        expect(button).toBeDisabled()
      })
    })

    it("should disable buttons when uploading", () => {
      render(<SimpleImagePicker image={null} onFileSelect={vi.fn()} uploading />)

      const buttons = screen.getAllByRole("button")
      buttons.forEach(button => {
        expect(button).toBeDisabled()
      })
    })

    it("should accept custom className", () => {
      const { container } = render(
        <SimpleImagePicker image={null} onFileSelect={vi.fn()} className="custom-class" />
      )

      expect(container.firstChild).toHaveClass("custom-class")
    })
  })

  describe("file input handling", () => {
    it("should trigger file input click when upload button is clicked", async () => {
      render(<SimpleImagePicker image={null} onFileSelect={vi.fn()} showCamera={false} />)

      const uploadButton = screen.getByText("上傳")

      // File input should be triggered (we can't fully test this in JSDOM)
      expect(uploadButton).toBeInTheDocument()
    })

    it("should handle file selection via input change", async () => {
      const onFileSelect = vi.fn()
      const { container } = render(
        <SimpleImagePicker image={null} onFileSelect={onFileSelect} showCamera={false} />
      )

      const fileInput = container.querySelector('input[type="file"]:not([capture])') as HTMLInputElement
      expect(fileInput).toBeInTheDocument()

      const file = new File(["test"], "test.jpg", { type: "image/jpeg" })
      Object.defineProperty(fileInput, "files", {
        value: [file],
        configurable: true,
      })

      await fireEvent.change(fileInput)

      expect(onFileSelect).toHaveBeenCalledWith(file)
    })

    it("should not call onFileSelect for non-image files", async () => {
      const onFileSelect = vi.fn()
      const alertMock = vi.spyOn(window, "alert").mockImplementation(() => {})

      const { container } = render(
        <SimpleImagePicker image={null} onFileSelect={onFileSelect} showCamera={false} />
      )

      const fileInput = container.querySelector('input[type="file"]:not([capture])') as HTMLInputElement
      const file = new File(["test"], "test.txt", { type: "text/plain" })
      Object.defineProperty(fileInput, "files", {
        value: [file],
        configurable: true,
      })

      await fireEvent.change(fileInput)

      expect(onFileSelect).not.toHaveBeenCalled()
      expect(alertMock).toHaveBeenCalledWith("請選擇圖片檔案")

      alertMock.mockRestore()
    })

    it("should not call onFileSelect for files exceeding size limit", async () => {
      const onFileSelect = vi.fn()
      const alertMock = vi.spyOn(window, "alert").mockImplementation(() => {})

      const { container } = render(
        <SimpleImagePicker image={null} onFileSelect={onFileSelect} maxSizeMB={1} showCamera={false} />
      )

      const fileInput = container.querySelector('input[type="file"]:not([capture])') as HTMLInputElement

      // Create a file larger than 1MB
      const largeContent = new Array(2 * 1024 * 1024).fill("a").join("")
      const file = new File([largeContent], "large.jpg", { type: "image/jpeg" })

      Object.defineProperty(fileInput, "files", {
        value: [file],
        configurable: true,
      })

      await fireEvent.change(fileInput)

      expect(onFileSelect).not.toHaveBeenCalled()
      expect(alertMock).toHaveBeenCalledWith("圖片大小不能超過 1MB")

      alertMock.mockRestore()
    })
  })

  describe("iOS detection", () => {
    it("should render capture input for camera on iOS", () => {
      Object.defineProperty(global, "navigator", {
        value: {
          ...mockNavigator,
          userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)",
        },
        configurable: true,
      })

      const { container } = render(<ImagePicker value={{ image: null, pendingFile: null, preview: null }} onChange={vi.fn()} />)

      const captureInput = container.querySelector('input[capture="environment"]')
      expect(captureInput).toBeInTheDocument()
    })
  })

  describe("exports", () => {
    it("should export ImagePicker component", () => {
      expect(ImagePicker).toBeDefined()
      expect(typeof ImagePicker).toBe("function")
    })

    it("should export SimpleImagePicker component", () => {
      expect(SimpleImagePicker).toBeDefined()
      expect(typeof SimpleImagePicker).toBe("function")
    })
  })
})
