"use client"

import { useCallback, useEffect, useRef } from "react"

export interface CategorySuggestion {
  category: string
  confidence: number
}

export type CategorizeDescription = (
  description: string,
) => Promise<CategorySuggestion | null>

export interface UseCategoryClassifierInput {
  mode: "create" | "edit" | "quick"
  category: string
  description: string
  categorize?: CategorizeDescription
  onCategory: (category: string) => void
}

export interface UseCategoryClassifierResult {
  /** Ask the AI for a category using the current description. */
  classify: () => void
}

/**
 * Best-effort, silent category suggestion for a new expense.
 *
 * Only runs in create mode, only while the category is still unset, and never
 * overrides a category the user picked while the request was in flight.
 */
export function useCategoryClassifier({
  mode,
  category,
  description,
  categorize,
  onCategory,
}: UseCategoryClassifierInput): UseCategoryClassifierResult {
  const categoryRef = useRef(category)
  const descriptionRef = useRef(description)
  const lastClassifiedRef = useRef<string | null>(null)
  const inFlightRef = useRef(false)

  useEffect(() => {
    categoryRef.current = category
  }, [category])

  useEffect(() => {
    descriptionRef.current = description
  }, [description])

  const classify = useCallback(() => {
    if (mode !== "create" || !categorize) return
    if (inFlightRef.current) return
    // A category is "data": never overwrite it, whether it came from the user,
    // a previous AI suggestion, or a saved expense.
    if (categoryRef.current !== "") return

    const text = descriptionRef.current.trim()
    if (!text) return
    if (lastClassifiedRef.current === text) return

    lastClassifiedRef.current = text
    inFlightRef.current = true

    void (async () => {
      try {
        const result = await categorize(text)
        // The user may have picked a category while the request was running.
        if (!result || categoryRef.current !== "") return
        onCategory(result.category)
      } catch {
        // Classification is best-effort: keep the form exactly as it was.
      } finally {
        inFlightRef.current = false
      }
    })()
  }, [categorize, mode, onCategory])

  return { classify }
}
