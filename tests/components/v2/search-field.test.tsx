import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { SearchField } from "@/components/v2/ui/search-field"

describe("SearchField", () => {
  it("renders the placeholder and reports changes", () => {
    const onChange = vi.fn()
    render(
      <SearchField value="" onChange={onChange} placeholder="搜尋描述、付款人、操作者..." ariaLabel="搜尋紀錄" />
    )
    const input = screen.getByLabelText("搜尋紀錄")
    expect(input).toHaveAttribute("placeholder", "搜尋描述、付款人、操作者...")
    fireEvent.change(input, { target: { value: "拉麵" } })
    expect(onChange).toHaveBeenCalledWith("拉麵")
  })
})
