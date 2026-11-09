"use client"

import { useState, useEffect, useCallback } from "react"
import { ChevronDown, MapPin, Navigation, Search, X, Loader2 } from "lucide-react"

interface LocationResult {
  displayName: string
  lat: number
  lon: number
  address?: Record<string, string>
  type?: string
  class?: string
}

interface LocationPickerV2Props {
  value?: {
    location: string | null
    latitude: number | null
    longitude: number | null
  }
  onChange: (value: {
    location: string | null
    latitude: number | null
    longitude: number | null
  }) => void
  className?: string
  /**
   * "row" renders a Material-style list row (icon · label · value · chevron)
   * with the search panel expanding below it; "default" keeps the filled field.
   */
  variant?: "default" | "row"
}

// v2 copy of components/location-picker.tsx logic with v2 markup only.
export function LocationPickerV2({ value, onChange, className, variant = "default" }: LocationPickerV2Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<LocationResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Search the geocode API.
  const searchLocation = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    setError(null)

    try {
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`)
      const data = await response.json()

      if (response.ok) {
        setSearchResults(data)
      } else {
        setError(data.error || "搜尋失敗")
        setSearchResults([])
      }
    } catch {
      setError("網路錯誤，請稍後再試")
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, [])

  // Debounced search.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        searchLocation(searchQuery)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [searchQuery, searchLocation])

  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setError("您的瀏覽器不支援定位功能")
      return
    }

    setIsGettingLocation(true)
    setError(null)

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        })
      })

      const { latitude, longitude } = position.coords

      const response = await fetch(`/api/geocode?lat=${latitude}&lon=${longitude}`)
      const data = await response.json()

      if (response.ok) {
        onChange({ location: data.displayName, latitude: data.lat, longitude: data.lon })
        setIsOpen(false)
      } else {
        // Keep coordinates even when reverse geocoding fails.
        onChange({
          location: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
          latitude,
          longitude,
        })
        setIsOpen(false)
      }
    } catch (err) {
      if (err instanceof GeolocationPositionError) {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError("請允許存取位置權限")
            break
          case err.POSITION_UNAVAILABLE:
            setError("無法取得位置資訊")
            break
          case err.TIMEOUT:
            setError("取得位置逾時，請重試")
            break
        }
      } else {
        setError("取得位置時發生錯誤")
      }
    } finally {
      setIsGettingLocation(false)
    }
  }

  const selectResult = (result: LocationResult) => {
    onChange({ location: result.displayName, latitude: result.lat, longitude: result.lon })
    setSearchQuery("")
    setSearchResults([])
    setIsOpen(false)
  }

  const clearLocation = () => {
    onChange({ location: null, latitude: null, longitude: null })
  }

  const cancel = () => {
    setIsOpen(false)
    setSearchQuery("")
    setSearchResults([])
    setError(null)
  }

  const formatDisplayName = (name: string, maxLength: number = 50) => {
    if (name.length <= maxLength) return name
    return name.substring(0, maxLength) + "..."
  }

  const panel = isOpen && (
    <div className={`flex flex-col gap-2.5 rounded-xl border border-v2-line bg-v2-paper p-3 ${variant === "row" ? "mt-1" : ""}`}>
      <button
        type="button"
        onClick={getCurrentLocation}
        disabled={isGettingLocation}
        className="flex w-full items-center gap-2 rounded-v2-sm bg-v2-sand px-3 py-2.5 text-[13px] font-semibold disabled:opacity-50"
      >
        {isGettingLocation ? (
          <Loader2 className="h-[15px] w-[15px] animate-spin text-v2-link" aria-hidden="true" />
        ) : (
          <Navigation className="h-[15px] w-[15px] text-v2-link" aria-hidden="true" />
        )}
        使用目前位置
      </button>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-v2-ink-muted" aria-hidden="true" />
        <input
          type="text"
          placeholder="搜尋地點..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-v2-sm border border-v2-line bg-v2-surface py-2.5 pl-[34px] pr-3 text-[13px] outline-none"
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-v2-ink-muted" aria-hidden="true" />
        )}
      </div>

      {error && <p className="text-xs text-v2-danger">{error}</p>}

      {searchResults.length > 0 && (
        <div className="flex flex-col gap-0.5">
          {searchResults.map((result, index) => (
            <button
              key={index}
              type="button"
              onClick={() => selectResult(result)}
              className={`flex items-start gap-2 rounded-lg p-2 text-left text-xs ${index === 0 ? "bg-v2-lake-soft" : ""}`}
            >
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-v2-ink-muted" aria-hidden="true" />
              <span className="break-words">{formatDisplayName(result.displayName, 80)}</span>
            </button>
          ))}
        </div>
      )}

      {variant === "row" && value?.location && (
        <button
          type="button"
          onClick={() => {
            clearLocation()
            setIsOpen(false)
          }}
          className="w-full py-1.5 text-center text-xs font-semibold text-v2-danger"
        >
          清除地點
        </button>
      )}

      <button type="button" onClick={cancel} className="w-full py-1.5 text-center text-xs font-semibold text-v2-ink-muted">
        取消
      </button>
    </div>
  )

  if (variant === "row") {
    return (
      <div className={className}>
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          aria-expanded={isOpen}
          className="flex min-h-[56px] w-full items-center gap-3 px-1 text-left transition-colors hover:bg-v2-lake-tint/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-lake"
        >
          <MapPin className="h-[18px] w-[18px] shrink-0 text-v2-lake" aria-hidden="true" />
          <span className="shrink-0 text-[13px] font-semibold text-v2-ink">消費地點</span>
          <span className="min-w-0 flex-1 truncate text-right text-[13px] text-v2-ink-muted">{value?.location ?? "新增地點"}</span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-v2-ink-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </button>
        {panel}
      </div>
    )
  }

  return (
    <div className={className}>
      {value?.location ? (
        <div className={`flex items-center gap-2 rounded-xl px-3.5 py-3 ${isOpen ? "mb-2 bg-v2-sand" : "bg-v2-paper"}`}>
          <MapPin className="h-[15px] w-[15px] shrink-0 text-v2-coral" aria-hidden="true" />
          <span className="min-w-0 flex-1 break-words text-[13px]">{value.location}</span>
          {isOpen ? (
            <button
              type="button"
              aria-label="清除位置"
              onClick={clearLocation}
              className="flex h-5 w-5 shrink-0 items-center justify-center text-v2-ink-muted"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          ) : (
            <button type="button" onClick={() => setIsOpen(true)} className="shrink-0 text-xs font-bold text-v2-link">
              重新定位
            </button>
          )}
        </div>
      ) : (
        !isOpen && (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="flex w-full items-center gap-2 rounded-xl bg-v2-paper px-3.5 py-3 text-left text-[13px] text-v2-ink-muted"
          >
            <MapPin className="h-[15px] w-[15px] shrink-0 text-v2-coral" aria-hidden="true" />
            新增地點
          </button>
        )
      )}

      {panel}
    </div>
  )
}
