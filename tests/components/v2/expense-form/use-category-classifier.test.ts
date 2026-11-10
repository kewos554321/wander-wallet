import { describe, expect, it, vi } from "vitest"
import { act, renderHook } from "@testing-library/react"
import {
  useCategoryClassifier,
  type CategorySuggestion,
  type UseCategoryClassifierInput,
} from "@/components/v2/expense-form/use-category-classifier"

function setup(overrides: Partial<UseCategoryClassifierInput> = {}) {
  const categorize =
    "categorize" in overrides
      ? overrides.categorize
      : vi.fn(async (): Promise<CategorySuggestion | null> => ({
          category: "transport",
          confidence: 0.9,
        }))
  const onCategory = overrides.onCategory ?? vi.fn()
  const props: UseCategoryClassifierInput = {
    mode: "create",
    category: "",
    description: "計程車",
    ...overrides,
    categorize,
    onCategory,
  }
  const hook = renderHook((current: UseCategoryClassifierInput) => useCategoryClassifier(current), {
    initialProps: props,
  })
  return { ...hook, categorize, onCategory, props }
}

describe("useCategoryClassifier", () => {
  it("classifies the description and applies the returned category", async () => {
    const { result, categorize, onCategory } = setup()

    await act(async () => {
      result.current.classify()
    })

    expect(categorize).toHaveBeenCalledWith("計程車")
    expect(onCategory).toHaveBeenCalledWith("transport")
  })

  it("does nothing when a category is already set", () => {
    const { result, categorize, onCategory } = setup({ category: "food" })

    act(() => result.current.classify())

    expect(categorize).not.toHaveBeenCalled()
    expect(onCategory).not.toHaveBeenCalled()
  })

  it("does nothing in edit mode", () => {
    const { result, categorize } = setup({ mode: "edit" })

    act(() => result.current.classify())

    expect(categorize).not.toHaveBeenCalled()
  })

  it("does nothing without a categorize function", () => {
    const { result } = setup({ categorize: undefined })

    expect(() => result.current.classify()).not.toThrow()
  })

  it("does nothing for a blank description", () => {
    const { result, categorize } = setup({ description: "   " })

    act(() => result.current.classify())

    expect(categorize).not.toHaveBeenCalled()
  })

  it("does not classify the same description twice", async () => {
    const { result, categorize } = setup()

    await act(async () => {
      result.current.classify()
    })
    act(() => result.current.classify())

    expect(categorize).toHaveBeenCalledTimes(1)
  })

  it("ignores a late result when the category changed while classifying", async () => {
    let resolve!: (value: CategorySuggestion | null) => void
    const categorize = vi.fn(
      () =>
        new Promise<CategorySuggestion | null>((done) => {
          resolve = done
        }),
    )
    const { result, rerender, onCategory, props } = setup({ categorize })

    act(() => result.current.classify())
    rerender({ ...props, category: "food" })

    await act(async () => {
      resolve({ category: "transport", confidence: 0.9 })
    })

    expect(onCategory).not.toHaveBeenCalled()
  })

  it("keeps the form untouched when classification fails", async () => {
    const categorize = vi.fn(async (): Promise<CategorySuggestion | null> => {
      throw new Error("boom")
    })
    const { result, onCategory } = setup({ categorize })

    await act(async () => {
      result.current.classify()
    })

    expect(onCategory).not.toHaveBeenCalled()
  })
})
