"use client"

import { use, useEffect, useState } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Car, Plus, Trash2, ExternalLink, Calculator, Users, Fuel, Gauge, Info, RefreshCw } from "lucide-react"

interface FuelPriceData {
  product: string
  price: number
}

export default function MileagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  const [waypoints, setWaypoints] = useState<string[]>(["", ""])
  const [totalKm, setTotalKm] = useState<number>(0)
  const [fuelPrice, setFuelPrice] = useState<number>(28.3)
  const [fuelEfficiency, setFuelEfficiency] = useState<number>(12)
  const [participants, setParticipants] = useState<number>(2)
  const [showResult, setShowResult] = useState(false)

  // 油價相關
  const [fuelPrices, setFuelPrices] = useState<FuelPriceData[]>([])
  const [loadingPrice, setLoadingPrice] = useState(false)
  const [priceSource, setPriceSource] = useState<string>("")

  useEffect(() => {
    fetchFuelPrice()
  }, [])

  async function fetchFuelPrice() {
    setLoadingPrice(true)
    try {
      const res = await fetch("/api/fuel-price")
      if (res.ok) {
        const data = await res.json()
        setFuelPrices(data.prices)
        setPriceSource(data.source)
        // 預設使用 95 無鉛
        const price95 = data.prices.find((p: FuelPriceData) => p.product === "95無鉛汽油")
        if (price95) {
          setFuelPrice(price95.price)
        }
      }
    } catch (error) {
      console.error("獲取油價錯誤:", error)
    } finally {
      setLoadingPrice(false)
    }
  }

  const updateWaypoint = (index: number, value: string) => {
    const newWaypoints = [...waypoints]
    newWaypoints[index] = value
    setWaypoints(newWaypoints)
  }

  const addWaypoint = () => {
    setWaypoints([...waypoints, ""])
  }

  const removeWaypoint = (index: number) => {
    if (waypoints.length <= 2) return
    setWaypoints(waypoints.filter((_, i) => i !== index))
  }

  // 產生 Google Maps 路線連結
  const generateMapsUrl = () => {
    const validWaypoints = waypoints.filter(w => w.trim())
    if (validWaypoints.length < 2) return null

    const origin = encodeURIComponent(validWaypoints[0])
    const destination = encodeURIComponent(validWaypoints[validWaypoints.length - 1])
    const waypointsParam = validWaypoints.slice(1, -1).map(w => encodeURIComponent(w)).join("|")

    let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`
    if (waypointsParam) {
      url += `&waypoints=${waypointsParam}`
    }
    return url
  }

  // 計算油費
  const totalFuel = totalKm > 0 && fuelEfficiency > 0
    ? totalKm / fuelEfficiency * fuelPrice
    : 0
  const perPerson = participants > 0 ? totalFuel / participants : 0

  // 計算按鈕
  const canCalculate = totalKm > 0 && fuelEfficiency > 0 && fuelPrice > 0 && participants > 0

  const handleCalculate = () => {
    setShowResult(true)
  }

  const mapsUrl = generateMapsUrl()
  const backHref = `/projects/${id}`

  return (
    <AppLayout title="里程" showBack backHref={backHref}>
      <div className="py-4 pb-32 space-y-6">
        {/* 路線規劃 */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <h2 className="font-medium text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
            <Car className="h-5 w-5 text-blue-500" />
            路線規劃
          </h2>
          <div className="flex items-start gap-2 mb-4 p-3 bg-blue-50 dark:bg-blue-950/50 rounded-lg">
            <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-700 dark:text-blue-300">
              輸入起點、終點及途經點，點擊「開啟 Google Maps」查看實際路線與距離，再將總里程填入下方計算油費
            </p>
          </div>

          <div className="space-y-3">
            {waypoints.map((waypoint, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-xs font-medium text-blue-600 dark:text-blue-400">
                  {String.fromCharCode(65 + index)}
                </div>
                <Input
                  value={waypoint}
                  onChange={(e) => updateWaypoint(index, e.target.value)}
                  placeholder={index === 0 ? "起點" : index === waypoints.length - 1 ? "終點" : "途經點"}
                  className="flex-1"
                />
                {waypoints.length > 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeWaypoint(index)}
                    className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addWaypoint}
              className="flex-1"
            >
              <Plus className="h-4 w-4 mr-2" />
              新增途經點
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => mapsUrl && window.open(mapsUrl, "_blank")}
              disabled={!mapsUrl}
              className="flex-1"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              開啟 Google Maps
            </Button>
          </div>
        </div>

        {/* 里程與油費 */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <h2 className="font-medium text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
            <Calculator className="h-5 w-5 text-emerald-500" />
            油費計算
          </h2>
          <div className="flex items-start gap-2 mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/50 rounded-lg">
            <Info className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
            <div className="text-xs text-emerald-700 dark:text-emerald-300 space-y-1">
              <p><strong>公式：</strong>總里程 ÷ 油耗 × 油價 = 總油費</p>
              <p><strong>油耗參考：</strong></p>
              <ul className="ml-3 space-y-0.5">
                <li>• 小型車 (Yaris, Vios)：15-18 km/L</li>
                <li>• 中型車 (Altis, Civic)：12-15 km/L</li>
                <li>• SUV (RAV4, CR-V)：10-13 km/L</li>
                <li>• 大型車 (Alphard)：8-10 km/L</li>
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground flex items-center gap-1">
                <Gauge className="h-4 w-4" />
                總里程 (km)
              </label>
              <Input
                type="number"
                value={totalKm || ""}
                onChange={(e) => setTotalKm(Number(e.target.value))}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground flex items-center gap-1">
                <Fuel className="h-4 w-4" />
                油價 ($/L)
              </label>
              <Input
                type="number"
                value={fuelPrice || ""}
                onChange={(e) => setFuelPrice(Number(e.target.value))}
                placeholder="28.3"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground flex items-center gap-1">
                <Car className="h-4 w-4" />
                油耗 (km/L)
              </label>
              <Input
                type="number"
                value={fuelEfficiency || ""}
                onChange={(e) => setFuelEfficiency(Number(e.target.value))}
                placeholder="12"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground flex items-center gap-1">
                <Users className="h-4 w-4" />
                分攤人數
              </label>
              <Input
                type="number"
                value={participants || ""}
                onChange={(e) => setParticipants(Number(e.target.value))}
                placeholder="2"
                min="1"
              />
            </div>
          </div>

          {/* 今日油價參考 */}
          {fuelPrices.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">今日油價參考（{priceSource}）</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={fetchFuelPrice}
                  disabled={loadingPrice}
                  className="h-6 px-2 text-xs"
                >
                  <RefreshCw className={`h-3 w-3 ${loadingPrice ? "animate-spin" : ""}`} />
                </Button>
              </div>
              <div className="flex gap-2">
                {fuelPrices.map((fp) => (
                  <Button
                    key={fp.product}
                    type="button"
                    variant={fuelPrice === fp.price ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFuelPrice(fp.price)}
                    className="flex-1 h-9"
                  >
                    <div className="text-center">
                      <div className="text-xs opacity-70">{fp.product.replace("無鉛汽油", "")}</div>
                      <div className="font-medium">${fp.price}</div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* 計算按鈕 */}
          <Button
            type="button"
            onClick={handleCalculate}
            disabled={!canCalculate}
            className="w-full mt-4"
          >
            <Calculator className="h-4 w-4 mr-2" />
            計算油費
          </Button>
        </div>

        {/* 計算結果 */}
        {showResult && canCalculate && (
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950 rounded-xl border border-emerald-200 dark:border-emerald-800 p-4">
            <div className="text-center space-y-2">
              <p className="text-sm text-emerald-600 dark:text-emerald-400">
                總里程 {totalKm} km ÷ 油耗 {fuelEfficiency} km/L × 油價 ${fuelPrice}
              </p>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                總油費 ${totalFuel.toLocaleString("zh-TW", { maximumFractionDigits: 0 })}
              </p>
              <div className="pt-2 border-t border-emerald-200 dark:border-emerald-800">
                <p className="text-sm text-emerald-600 dark:text-emerald-400">
                  {participants} 人分攤
                </p>
                <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">
                  每人 ${perPerson.toLocaleString("zh-TW", { maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

    </AppLayout>
  )
}
