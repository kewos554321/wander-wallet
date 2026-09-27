import { useId } from "react"
import type { DailyStat } from "@/lib/project-stats"

const WIDTH = 342
const HEIGHT = 90
const TOP = 10
const BOTTOM = 85

export function DailyTrend({ daily }: { daily: DailyStat[] }) {
  // useId() keeps the gradient id unique per instance, avoiding collisions
  // when multiple DailyTrend instances render on the same page. React's
  // useId() can include characters like ":" that break SVG url(#id)
  // fragment references in some browsers, so strip anything unsafe.
  const gradientId = `v2TrendFill-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`

  if (daily.length === 0) {
    return <p className="py-6 text-center text-xs text-v2-ink-muted">尚無支出</p>
  }

  const max = Math.max(...daily.map((d) => d.amount), 1)
  const step = daily.length > 1 ? WIDTH / (daily.length - 1) : 0
  const points = daily.map((d, i) => ({
    x: daily.length > 1 ? i * step : WIDTH / 2,
    y: BOTTOM - (d.amount / max) * (BOTTOM - TOP),
  }))
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ")
  const area = `${line} L${points[points.length - 1].x},${HEIGHT} L${points[0].x},${HEIGHT} Z`

  return (
    <>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%" height={HEIGHT} preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2F8F74" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#2F8F74" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${gradientId})`} />
        <path d={line} fill="none" stroke="#2F8F74" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#1B5847" />
        ))}
      </svg>
      <div className="mt-1.5 flex justify-between">
        {daily.map((d) => (
          <span key={d.date} className="text-xs text-v2-ink-muted">
            {d.date}
          </span>
        ))}
      </div>
    </>
  )
}
