// Extracted from v1's inline `getCurrentLocation` in components/expense/expense-form.tsx
// so both the v1 and v2 expense forms can silently prefill the current location
// on mount in create mode without duplicating the geolocation + reverse-geocode logic.

export interface CurrentLocation {
  location: string
  latitude: number
  longitude: number
}

/**
 * 取得裝置目前所在位置（含反向地理編碼取得地址）。
 * 失敗時靜默回傳 null，不影響使用者操作。
 */
export async function getCurrentLocation(): Promise<CurrentLocation | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return null

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
      return { location: data.displayName, latitude: data.lat, longitude: data.lon }
    }
    return { location: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`, latitude, longitude }
  } catch {
    // 靜默失敗，不影響使用
    return null
  }
}
