"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MapPin, Navigation, Search, X, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface LocationResult {
  displayName: string
  lat: number
  lon: number
  address?: Record<string, string>
  type?: string
  class?: string
}

interface LocationPickerProps {
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
}

export function LocationPicker({ value, onChange, className }: LocationPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<LocationResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 搜尋地點
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

  // 防抖搜尋
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        searchLocation(searchQuery)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [searchQuery, searchLocation])

  // 取得目前位置
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

      // 反向地理編碼取得地址
      const response = await fetch(`/api/geocode?lat=${latitude}&lon=${longitude}`)
      const data = await response.json()

      if (response.ok) {
        onChange({
          location: data.displayName,
          latitude: data.lat,
          longitude: data.lon,
        })
        setIsOpen(false)
      } else {
        // 即使反向地理編碼失敗，也保存座標
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

  // 選擇搜尋結果
  const selectResult = (result: LocationResult) => {
    onChange({
      location: result.displayName,
      latitude: result.lat,
      longitude: result.lon,
    })
    setSearchQuery("")
    setSearchResults([])
    setIsOpen(false)
  }

  // 清除位置
  const clearLocation = () => {
    onChange({
      location: null,
      latitude: null,
      longitude: null,
    })
  }

  // 格式化顯示地址（縮短過長的地址）
  const formatDisplayName = (name: string, maxLength: number = 50) => {
    if (name.length <= maxLength) return name
    return name.substring(0, maxLength) + "..."
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* 已選擇的位置顯示 */}
      {value?.location && !isOpen && (
        <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
          <MapPin className="size-4 text-primary mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm break-words">{value.location}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-6 flex-shrink-0"
            onClick={clearLocation}
          >
            <X className="size-4" />
          </Button>
        </div>
      )}

      {/* 位置選擇按鈕或輸入區 */}
      {!isOpen ? (
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={() => setIsOpen(true)}
        >
          <MapPin className="size-4" />
          {value?.location ? "變更位置" : "新增位置"}
        </Button>
      ) : (
        <div className="space-y-3 p-3 border rounded-lg bg-background">
          {/* 目前位置按鈕 */}
          <Button
            type="button"
            variant="secondary"
            className="w-full justify-start gap-2"
            onClick={getCurrentLocation}
            disabled={isGettingLocation}
          >
            {isGettingLocation ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Navigation className="size-4" />
            )}
            使用目前位置
          </Button>

          {/* 搜尋輸入 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="搜尋地點..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />
            )}
          </div>

          {/* 錯誤訊息 */}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {/* 搜尋結果 */}
          {searchResults.length > 0 && (
            <div className="max-h-48 overflow-y-auto space-y-1">
              {searchResults.map((result, index) => (
                <button
                  key={index}
                  type="button"
                  className="w-full text-left p-2 hover:bg-muted rounded-md transition-colors"
                  onClick={() => selectResult(result)}
                >
                  <div className="flex items-start gap-2">
                    <MapPin className="size-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <span className="text-sm break-words">
                      {formatDisplayName(result.displayName, 80)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* 取消按鈕 */}
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => {
              setIsOpen(false)
              setSearchQuery("")
              setSearchResults([])
              setError(null)
            }}
          >
            取消
          </Button>
        </div>
      )}
    </div>
  )
}
