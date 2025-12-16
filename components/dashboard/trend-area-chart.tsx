"use client"

import dynamic from "next/dynamic"

const ResponsiveContainer = dynamic(
  () => import("recharts").then((mod) => mod.ResponsiveContainer),
  { ssr: false }
)
const AreaChart = dynamic(
  () => import("recharts").then((mod) => mod.AreaChart),
  { ssr: false }
)
const Area = dynamic(() => import("recharts").then((mod) => mod.Area), {
  ssr: false,
})
const XAxis = dynamic(() => import("recharts").then((mod) => mod.XAxis), {
  ssr: false,
})
const Tooltip = dynamic(() => import("recharts").then((mod) => mod.Tooltip), {
  ssr: false,
})

interface DataPoint {
  date: string
  amount: number
}

interface TrendAreaChartProps {
  data: DataPoint[]
  height?: number
}

export function TrendAreaChart({ data, height = 140 }: TrendAreaChartProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">
        消費趨勢
      </p>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "#94a3b8" }}
          />
          <Tooltip
            contentStyle={{
              background: "#0f172a",
              border: "none",
              borderRadius: "8px",
              fontSize: "12px",
              color: "#fff",
            }}
            formatter={(value) => [`$${Number(value).toLocaleString()}`, "金額"]}
          />
          <Area
            type="monotone"
            dataKey="amount"
            stroke="#22c55e"
            strokeWidth={2}
            fill="url(#colorAmount)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
