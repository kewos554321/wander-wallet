import { useState, useEffect, useCallback } from "react"
import { useAuthFetch } from "@/components/auth/liff-provider"

interface UserPreferences {
  onboardingCompleted?: boolean
  notifications?: {
    onCreate?: boolean
    onUpdate?: boolean
    onDelete?: boolean
  }
  defaultSplitMode?: "equal" | "custom"
}

interface UseOnboardingReturn {
  isOnboardingCompleted: boolean
  isLoading: boolean
  completeOnboarding: () => Promise<void>
  resetOnboarding: () => Promise<void>
}

export function useOnboarding(): UseOnboardingReturn {
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState(true) // Default to true to prevent flash
  const [isLoading, setIsLoading] = useState(true)
  const [preferences, setPreferences] = useState<UserPreferences | null>(null)
  const authFetch = useAuthFetch()

  // Fetch user preferences on mount
  useEffect(() => {
    async function fetchPreferences() {
      try {
        const res = await authFetch("/api/users/profile")
        if (res.ok) {
          const data = await res.json()
          const prefs = (data.preferences as UserPreferences) || {}
          setPreferences(prefs)
          setIsOnboardingCompleted(prefs.onboardingCompleted ?? false)
        }
      } catch (error) {
        console.error("Failed to fetch onboarding status:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPreferences()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const updatePreferences = useCallback(
    async (updates: Partial<UserPreferences>) => {
      const newPreferences = { ...preferences, ...updates }
      try {
        const res = await authFetch("/api/users/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ preferences: newPreferences }),
        })
        if (res.ok) {
          setPreferences(newPreferences)
          return true
        }
      } catch (error) {
        console.error("Failed to update preferences:", error)
      }
      return false
    },
    [authFetch, preferences]
  )

  const completeOnboarding = useCallback(async () => {
    const success = await updatePreferences({ onboardingCompleted: true })
    if (success) {
      setIsOnboardingCompleted(true)
    }
  }, [updatePreferences])

  const resetOnboarding = useCallback(async () => {
    const success = await updatePreferences({ onboardingCompleted: false })
    if (success) {
      setIsOnboardingCompleted(false)
    }
  }, [updatePreferences])

  return {
    isOnboardingCompleted,
    isLoading,
    completeOnboarding,
    resetOnboarding,
  }
}
