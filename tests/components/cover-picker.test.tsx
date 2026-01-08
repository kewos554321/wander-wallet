import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { CoverPicker } from "@/components/cover-picker"
import { PRESET_COVERS } from "@/lib/covers"

describe("CoverPicker Component", () => {
  describe("with no cover", () => {
    it("should show add cover placeholder", () => {
      render(<CoverPicker value={null} onChange={vi.fn()} />)

      expect(screen.getByText("新增封面")).toBeInTheDocument()
    })
  })

  describe("with preset cover", () => {
    it("should render preset cover preview", () => {
      render(<CoverPicker value="preset:2" onChange={vi.fn()} />)

      // Should show the preset emoji (海灘度假 🏖️)
      expect(screen.getByText("🏖️")).toBeInTheDocument()
    })

    it("should show remove button on preset cover", () => {
      render(<CoverPicker value="preset:2" onChange={vi.fn()} />)

      // Remove button has X icon
      const removeButton = document.querySelector('[role="button"]')
      expect(removeButton).toBeInTheDocument()
    })
  })

  describe("dialog", () => {
    it("should open dialog when clicking trigger", async () => {
      render(<CoverPicker value={null} onChange={vi.fn()} />)

      const trigger = screen.getByText("新增封面").closest("button")
      await fireEvent.click(trigger!)

      expect(screen.getByText("選擇封面")).toBeInTheDocument()
    })

    it("should show preset covers section", async () => {
      render(<CoverPicker value={null} onChange={vi.fn()} />)

      const trigger = screen.getByText("新增封面").closest("button")
      await fireEvent.click(trigger!)

      expect(screen.getByText("預設主題")).toBeInTheDocument()
    })

    it("should show custom upload section", async () => {
      render(<CoverPicker value={null} onChange={vi.fn()} />)

      const trigger = screen.getByText("新增封面").closest("button")
      await fireEvent.click(trigger!)

      expect(screen.getByText("自訂圖片")).toBeInTheDocument()
      expect(screen.getByText("上傳圖片")).toBeInTheDocument()
    })

    it("should render all preset cover buttons", async () => {
      render(<CoverPicker value={null} onChange={vi.fn()} />)

      const trigger = screen.getByText("新增封面").closest("button")
      await fireEvent.click(trigger!)

      // Should show all preset cover names
      PRESET_COVERS.forEach((cover) => {
        expect(screen.getByText(cover.name)).toBeInTheDocument()
      })
    })

    it("should call onChange when preset is selected", async () => {
      const onChange = vi.fn()
      render(<CoverPicker value={null} onChange={onChange} />)

      const trigger = screen.getByText("新增封面").closest("button")
      await fireEvent.click(trigger!)

      const presetButton = screen.getByText("海灘度假").closest("button")
      await fireEvent.click(presetButton!)

      expect(onChange).toHaveBeenCalledWith("preset:2")
    })

    it("should show remove cover button when cover is set", async () => {
      render(<CoverPicker value="preset:2" onChange={vi.fn()} />)

      // First open the dialog
      const trigger = screen.getByText("🏖️").closest("button")
      await fireEvent.click(trigger!)

      expect(screen.getByText("移除封面")).toBeInTheDocument()
    })

    it("should call onChange with null when remove cover is clicked", async () => {
      const onChange = vi.fn()
      render(<CoverPicker value="preset:2" onChange={onChange} />)

      const trigger = screen.getByText("🏖️").closest("button")
      await fireEvent.click(trigger!)

      const removeButton = screen.getByText("移除封面")
      await fireEvent.click(removeButton)

      expect(onChange).toHaveBeenCalledWith(null)
    })
  })

  describe("disabled state", () => {
    it("should be disabled when disabled prop is true", () => {
      render(<CoverPicker value={null} onChange={vi.fn()} disabled={true} />)

      const trigger = screen.getByText("新增封面").closest("button")
      expect(trigger).toBeDisabled()
    })
  })

  describe("file upload", () => {
    it("should show file size limit text", async () => {
      render(<CoverPicker value={null} onChange={vi.fn()} />)

      const trigger = screen.getByText("新增封面").closest("button")
      await fireEvent.click(trigger!)

      expect(screen.getByText("支援 JPG、PNG，最大 2MB")).toBeInTheDocument()
    })
  })

  describe("exports", () => {
    it("should export CoverPicker component", () => {
      expect(CoverPicker).toBeDefined()
      expect(typeof CoverPicker).toBe("function")
    })
  })
})
