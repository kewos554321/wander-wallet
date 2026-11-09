"use client"

import { useRef, useState } from "react"
import { AlertTriangle } from "lucide-react"
import type { RatePoint, RateRange } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { formatRate } from "./format"

interface RateTrendChartProps {
  base: string
  quote: string
  range: RateRange
  points: RatePoint[] | null
  loading: boolean
  error: string | null
  onRangeChange: (range: RateRange) => void
  onRetry: () => void
}

const WIDTH = 320
const HEIGHT = 112
const PAD_X = 6
const PAD_Y = 12

function shortDate(value: string): string {
  return value.slice(5).replace("-", "/")
}

function TrendSvg({
  points,
  base,
  quote,
  range,
  activeIndex,
}: {
  points: RatePoint[]
  base: string
  quote: string
  range: RateRange
  activeIndex: number | null
}) {
  const rates = points.map((point) => point.rate)
  const min = Math.min(...rates)
  const max = Math.max(...rates)
  const span = max - min || Math.max(Math.abs(max) * 0.02, 0.000001)
  const x = (index: number) =>
    PAD_X + (index / Math.max(points.length - 1, 1)) * (WIDTH - PAD_X * 2)
  const y = (rate: number) =>
    PAD_Y + (1 - (rate - min) / span) * (HEIGHT - PAD_Y * 2)

  const line = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${x(index)},${y(point.rate)}`)
    .join(" ")
  const area = `${line} L${x(points.length - 1)},${HEIGHT - PAD_Y} L${x(0)},${HEIGHT - PAD_Y} Z`
  const last = points[points.length - 1]
  const active = activeIndex != null ? points[activeIndex] : null

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={`${base} 對 ${quote} 近 ${range} 天趨勢`}
      className="h-[112px] w-full"
    >
      <path d={area} fill="var(--v2-lake)" fillOpacity="0.08" />
      <path
        d={line}
        fill="none"
        stroke="var(--v2-lake)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {active && activeIndex != null ? (
        <>
          <line
            x1={x(activeIndex)}
            x2={x(activeIndex)}
            y1={PAD_Y}
            y2={HEIGHT - PAD_Y}
            stroke="var(--v2-ink-muted)"
            strokeWidth="1"
            strokeDasharray="3 3"
            vectorEffect="non-scaling-stroke"
          />
          <circle
            cx={x(activeIndex)}
            cy={y(active.rate)}
            r="3.5"
            fill="var(--v2-lake)"
            stroke="var(--v2-surface)"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
        </>
      ) : (
        <circle cx={x(points.length - 1)} cy={y(last.rate)} r="2.5" fill="var(--v2-lake)" />
      )}
    </svg>
  )
}

export function RateTrendChart({
  base,
  quote,
  range,
  points,
  loading,
  error,
  onRangeChange,
  onRetry,
}: RateTrendChartProps) {
  const rates = points?.map((point) => point.rate) ?? []
  const min = rates.length > 0 ? Math.min(...rates) : null
  const max = rates.length > 0 ? Math.max(...rates) : null
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [lastPoints, setLastPoints] = useState(points)
  const containerRef = useRef<HTMLDivElement>(null)

  // Reset the inspected point when a new series arrives. This is React's
  // "adjust state during render" pattern, so it does not need an effect.
  if (points !== lastPoints) {
    setLastPoints(points)
    setActiveIndex(null)
  }

  const active = activeIndex != null && points ? points[activeIndex] : null

  const pickPoint = (clientX: number) => {
    const element = containerRef.current
    if (!element || !points || points.length < 2) return
    const rect = element.getBoundingClientRect()
    if (rect.width <= 0) return
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    const padded = (ratio * WIDTH - PAD_X) / (WIDTH - PAD_X * 2)
    const index = Math.round(Math.min(1, Math.max(0, padded)) * (points.length - 1))
    setActiveIndex(index)
  }

  return (
    <section className="mx-4 mt-3.5 rounded-2xl border border-v2-line bg-v2-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="m-0 text-[13px] font-bold text-v2-lake">趨勢</h2>
          <p className="m-0 mt-0.5 text-[10px] text-v2-ink-muted">
            1 {base} → {quote}
          </p>
        </div>
        <div
          role="group"
          aria-label="趨勢區間"
          className="flex shrink-0 gap-1 rounded-xl bg-v2-sand p-1"
        >
          {([7, 30, 90] as const).map((days) => (
            <button
              key={days}
              type="button"
              aria-pressed={range === days}
              aria-label={`近 ${days} 天`}
              onClick={() => onRangeChange(days)}
              className={cn(
                "rounded-v2-sm px-2 py-1 text-[11px] font-bold transition-colors duration-150 motion-reduce:transition-none",
                range === days
                  ? "bg-v2-surface text-v2-lake shadow-v2-sm"
                  : "text-v2-ink-muted hover:text-v2-ink"
              )}
            >
              {days}D
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div
          role="status"
          aria-label="正在載入趨勢"
          className="mt-3 h-[112px] animate-pulse rounded-v2-sm bg-v2-lake-soft motion-reduce:animate-none"
        />
      ) : error ? (
        <div
          role="status"
          className="mt-3 flex items-start justify-between gap-3 rounded-v2-sm border border-v2-danger-border bg-v2-danger-tint px-2.5 py-2 text-[11px] leading-4 text-v2-danger-strong"
        >
          <span className="flex items-start gap-1.5">
            <AlertTriangle className="mt-[1px] h-3 w-3 shrink-0" aria-hidden="true" />
            {error}
          </span>
          <button
            type="button"
            onClick={onRetry}
            className="shrink-0 rounded-full border border-v2-lake px-3 py-1 text-[11px] font-bold text-v2-lake"
          >
            重試
          </button>
        </div>
      ) : points && points.length > 1 ? (
        <>
          <p
            aria-live="polite"
            className="mt-3 min-h-4 text-[11px] text-v2-ink-muted"
          >
            {active
              ? `${shortDate(active.date)} · ${formatRate(active.rate)} ${quote}`
              : "點一下圖表看某一天"}
          </p>
          <div ref={containerRef} className="relative mt-2">
            <TrendSvg
              points={points}
              base={base}
              quote={quote}
              range={range}
              activeIndex={activeIndex}
            />
            <div
              data-testid="trend-scrubber"
              role="group"
              tabIndex={0}
              aria-label="趨勢圖，左右滑動或使用方向鍵查看每日匯率"
              className="absolute inset-0 cursor-crosshair rounded-v2-sm outline-none focus-visible:ring-2 focus-visible:ring-v2-lake/40"
              style={{ touchAction: "pan-y" }}
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId)
                pickPoint(event.clientX)
              }}
              onPointerMove={(event) => {
                if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                  pickPoint(event.clientX)
                }
              }}
              onPointerUp={(event) => {
                if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                  event.currentTarget.releasePointerCapture(event.pointerId)
                }
              }}
              onPointerCancel={(event) => {
                if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                  event.currentTarget.releasePointerCapture(event.pointerId)
                }
              }}
              onKeyDown={(event) => {
                if (!points || points.length < 2) return
                if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                  event.preventDefault()
                  const current = activeIndex ?? points.length - 1
                  setActiveIndex(
                    event.key === "ArrowLeft"
                      ? Math.max(0, current - 1)
                      : Math.min(points.length - 1, current + 1)
                  )
                } else if (event.key === "Home") {
                  event.preventDefault()
                  setActiveIndex(0)
                } else if (event.key === "End") {
                  event.preventDefault()
                  setActiveIndex(points.length - 1)
                }
              }}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[10px] text-v2-ink-muted">
            <span>{shortDate(points[0].date)}</span>
            <span>{shortDate(points[points.length - 1].date)}</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[10px] text-v2-ink-muted">
            <span>最低 {min != null ? formatRate(min) : "—"}</span>
            <span>最高 {max != null ? formatRate(max) : "—"}</span>
          </div>
        </>
      ) : (
        <p className="mt-3 text-[11px] text-v2-ink-muted">這個區間沒有趨勢資料。</p>
      )}
    </section>
  )
}
