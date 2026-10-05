"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useProjectData } from "@/lib/hooks"
import { UiV2Scope } from "@/components/v2/ui-v2-scope"
import { MileageV2View } from "./mileage-v2-view"

interface FuelPriceData {
  product: string
  price: number
}

export function MileageV2({ projectId }: { projectId: string }) {
  const { projectCurrency } = useProjectData(projectId)

  const [waypoints, setWaypoints] = useState<string[]>(["", ""])
  const [totalKm, setTotalKm] = useState(0)
  const [fuelPrice, setFuelPrice] = useState(28.3)
  const [fuelEfficiency, setFuelEfficiency] = useState(12)
  const [participants, setParticipants] = useState(2)
  const [showResult, setShowResult] = useState(false)
  const [fuelPrices, setFuelPrices] = useState<FuelPriceData[]>([])
  const [loadingPrice, setLoadingPrice] = useState(false)
  const [priceSource, setPriceSource] = useState("")

  const fetchFuelPrice = useCallback(async () => {
    setLoadingPrice(true)
    try {
      const res = await fetch("/api/fuel-price")
      if (res.ok) {
        const data = await res.json()
        const prices: FuelPriceData[] = data.prices ?? []
        setFuelPrices(prices)
        setPriceSource(data.source ?? "")
        const price95 = prices.find((p) => p.product === "95無鉛汽油")
        if (price95) setFuelPrice(price95.price)
      }
    } catch (error) {
      console.error("獲取油價錯誤:", error)
    } finally {
      setLoadingPrice(false)
    }
  }, [])

  useEffect(() => {
    fetchFuelPrice()
  }, [fetchFuelPrice])

  const updateWaypoint = (index: number, value: string) =>
    setWaypoints((prev) => prev.map((waypoint, i) => (i === index ? value : waypoint)))
  const addWaypoint = () => setWaypoints((prev) => [...prev, ""])
  const removeWaypoint = (index: number) =>
    setWaypoints((prev) => (prev.length <= 2 ? prev : prev.filter((_, i) => i !== index)))

  const mapsUrl = useMemo(() => {
    const valid = waypoints.filter((w) => w.trim())
    if (valid.length < 2) return null
    const origin = encodeURIComponent(valid[0])
    const destination = encodeURIComponent(valid[valid.length - 1])
    const via = valid.slice(1, -1).map((w) => encodeURIComponent(w)).join("|")
    let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`
    if (via) url += `&waypoints=${via}`
    return url
  }, [waypoints])

  const totalFuel = totalKm > 0 && fuelEfficiency > 0 ? (totalKm / fuelEfficiency) * fuelPrice : 0
  const perPerson = participants > 0 ? totalFuel / participants : 0
  const canCalculate = totalKm > 0 && fuelEfficiency > 0 && fuelPrice > 0 && participants > 0

  return (
    <UiV2Scope>
      <div className="mx-auto max-w-md">
        <MileageV2View
          projectId={projectId}
          projectCurrency={projectCurrency}
          waypoints={waypoints}
          totalKm={totalKm}
          fuelPrice={fuelPrice}
          fuelEfficiency={fuelEfficiency}
          participants={participants}
          showResult={showResult}
          totalFuel={totalFuel}
          perPerson={perPerson}
          canCalculate={canCalculate}
          mapsUrl={mapsUrl}
          fuelPrices={fuelPrices}
          loadingPrice={loadingPrice}
          priceSource={priceSource}
          onWaypoint={updateWaypoint}
          onAddWaypoint={addWaypoint}
          onRemoveWaypoint={removeWaypoint}
          onOpenMaps={() => {
            if (mapsUrl) window.open(mapsUrl, "_blank")
          }}
          onTotalKm={setTotalKm}
          onFuelPrice={setFuelPrice}
          onFuelEfficiency={setFuelEfficiency}
          onParticipants={setParticipants}
          onRefreshPrice={fetchFuelPrice}
          onCalculate={() => setShowResult(true)}
        />
      </div>
    </UiV2Scope>
  )
}
