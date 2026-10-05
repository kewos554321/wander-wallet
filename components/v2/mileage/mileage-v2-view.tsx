"use client"

import { Calculator, ExternalLink, Fuel, Gauge, Plus, RefreshCw, Users, X } from "lucide-react"
import { V2TopBar } from "@/components/v2/layout/v2-top-bar"
import { SECTION_CARD, SECTION_TITLE } from "@/components/v2/expense-form/section-card"
import { formatCurrency } from "@/lib/constants/currencies"
import { cn } from "@/lib/utils"

export interface MileageV2ViewProps {
  projectId: string
  projectCurrency: string
  waypoints: string[]
  totalKm: number
  fuelPrice: number
  fuelEfficiency: number
  participants: number
  showResult: boolean
  totalFuel: number
  perPerson: number
  canCalculate: boolean
  mapsUrl: string | null
  fuelPrices: { product: string; price: number }[]
  loadingPrice: boolean
  priceSource: string
  onWaypoint: (index: number, value: string) => void
  onAddWaypoint: () => void
  onRemoveWaypoint: (index: number) => void
  onOpenMaps: () => void
  onTotalKm: (value: number) => void
  onFuelPrice: (value: number) => void
  onFuelEfficiency: (value: number) => void
  onParticipants: (value: number) => void
  onRefreshPrice: () => void
  onCalculate: () => void
}

const INPUT = "w-full rounded-[10px] border border-v2-line bg-v2-paper px-3 py-2.5 text-[14px] font-bold text-v2-ink outline-none"
const LABEL = "mb-1 block text-[11px] text-v2-ink-muted"
const PRIMARY_BUTTON = "flex w-full items-center justify-center gap-2 rounded-[12px] bg-v2-lake py-[13px] text-[14px] font-bold text-v2-paper disabled:opacity-50"

export function MileageV2View({
  projectId,
  projectCurrency,
  waypoints,
  totalKm,
  fuelPrice,
  fuelEfficiency,
  participants,
  showResult,
  totalFuel,
  perPerson,
  canCalculate,
  mapsUrl,
  fuelPrices,
  loadingPrice,
  priceSource,
  onWaypoint,
  onAddWaypoint,
  onRemoveWaypoint,
  onOpenMaps,
  onTotalKm,
  onFuelPrice,
  onFuelEfficiency,
  onParticipants,
  onRefreshPrice,
  onCalculate,
}: MileageV2ViewProps) {
  return (
    <div className="min-h-screen">
      <V2TopBar title="里程" backHref={`/projects/${projectId}`} titleClassName="text-[17px] font-semibold" />

      <div className="pt-3.5">
        <div className={SECTION_CARD}>
          <p className={cn(SECTION_TITLE, "mb-3")}>路線規劃</p>
          <div className="mb-3 rounded-[10px] border border-v2-lake-border bg-v2-lake-soft px-3 py-2.5 text-[11px] text-v2-lake">
            加入沿途地點，計算總里程並開啟Google Maps導航
          </div>
          <div className="flex flex-col gap-2">
            {waypoints.map((waypoint, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-v2-lake text-[11px] font-bold text-v2-on-lake">
                  {String.fromCharCode(65 + index)}
                </span>
                <input
                  aria-label={`地點 ${String.fromCharCode(65 + index)}`}
                  value={waypoint}
                  onChange={(e) => onWaypoint(index, e.target.value)}
                  placeholder={index === 0 ? "起點" : index === waypoints.length - 1 ? "終點" : "途經點"}
                  className={cn(INPUT, "flex-1 font-normal")}
                />
                {index > 0 ? (
                  <button type="button" aria-label="移除" onClick={() => onRemoveWaypoint(index)} className="flex h-6 w-6 items-center justify-center text-v2-ink-subtle">
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
            ))}
          </div>
          <button type="button" onClick={onAddWaypoint} className="mt-2.5 flex items-center gap-1.5 text-[13px] font-semibold text-v2-lake">
            <Plus className="h-3.5 w-3.5" />
            新增地點
          </button>
          <button type="button" onClick={onOpenMaps} disabled={!mapsUrl} className={cn(PRIMARY_BUTTON, "mt-3.5")}>
            <ExternalLink className="h-4 w-4" />
            開啟 Google Maps
          </button>
        </div>

        <div className={SECTION_CARD}>
          <p className={cn(SECTION_TITLE, "mb-3")}>油費計算</p>
          <div className="mb-3 rounded-[10px] border border-v2-lake-border bg-v2-lake-soft px-3 py-2.5 text-[11px] leading-[1.6] text-v2-lake">
            油費＝總里程 ÷ 油耗 × 油價，再除以分攤人數
            <br />
            參考油耗：汽油車約 12-15 km/L
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label htmlFor="mileage-km" className={LABEL}>
                <Gauge className="mr-1 inline h-3 w-3" />
                總里程 (km)
              </label>
              <input id="mileage-km" aria-label="總里程 (km)" type="number" value={totalKm || ""} onChange={(e) => onTotalKm(Number(e.target.value))} placeholder="0" className={INPUT} />
            </div>
            <div>
              <label htmlFor="mileage-price" className={LABEL}>
                <Fuel className="mr-1 inline h-3 w-3" />
                油價 ($/L)
              </label>
              <input id="mileage-price" aria-label="油價 ($/L)" type="number" value={fuelPrice || ""} onChange={(e) => onFuelPrice(Number(e.target.value))} placeholder="28.3" className={INPUT} />
            </div>
            <div>
              <label htmlFor="mileage-eff" className={LABEL}>
                <Gauge className="mr-1 inline h-3 w-3" />
                油耗 (km/L)
              </label>
              <input id="mileage-eff" aria-label="油耗 (km/L)" type="number" value={fuelEfficiency || ""} onChange={(e) => onFuelEfficiency(Number(e.target.value))} placeholder="12" className={INPUT} />
            </div>
            <div>
              <label htmlFor="mileage-people" className={LABEL}>
                <Users className="mr-1 inline h-3 w-3" />
                分攤人數
              </label>
              <input id="mileage-people" aria-label="分攤人數" type="number" min="1" value={participants || ""} onChange={(e) => onParticipants(Number(e.target.value))} placeholder="2" className={INPUT} />
            </div>
          </div>

          {fuelPrices.length > 0 ? (
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              {fuelPrices.map((fp) => (
                <button
                  key={fp.product}
                  type="button"
                  onClick={() => onFuelPrice(fp.price)}
                  className={cn(
                    "rounded-full px-2.5 py-[5px] text-[11px] font-semibold",
                    fp.price === fuelPrice ? "bg-v2-lake text-v2-on-lake" : "bg-v2-lake-soft text-v2-lake"
                  )}
                >
                  {fp.product.replace("無鉛汽油", " 無鉛")} {fp.price}
                </button>
              ))}
              <button type="button" aria-label="重新整理油價" onClick={onRefreshPrice} disabled={loadingPrice} className="flex h-6 w-6 items-center justify-center text-v2-ink-subtle">
                <RefreshCw className={cn("h-3 w-3", loadingPrice && "animate-spin")} />
              </button>
            </div>
          ) : null}

          <button type="button" onClick={onCalculate} disabled={!canCalculate} className={cn(PRIMARY_BUTTON, "mt-3.5")}>
            <Calculator className="h-4 w-4" />
            計算油費
          </button>
        </div>

        {showResult && canCalculate ? (
          <div className="mx-4 mt-3.5 overflow-hidden rounded-[18px] bg-v2-lake p-[18px] px-5 text-v2-paper">
            <p className="m-0 mb-2.5 text-[12px] opacity-75">
              {totalKm}km ÷ {fuelEfficiency}km/L × {fuelPrice} ÷ {participants}人
            </p>
            <p className="m-0 text-[13px] opacity-85">總油費</p>
            <p className="mb-3.5 mt-0.5 font-v2-serif text-[22px] font-bold">{formatCurrency(totalFuel, projectCurrency)}</p>
            <p className="m-0 text-[13px] opacity-85">每人分攤</p>
            <p className="m-0 mt-0.5 font-v2-serif text-[32px] font-bold leading-10">{formatCurrency(perPerson, projectCurrency)}</p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
