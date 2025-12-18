"use client"

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  TooltipProps,
} from "recharts"

interface CategoryTrendData {
  date: string
  [category: string]: number | string
}

interface CategoryTrendChartProps {
  data: CategoryTrendData[]
  categories: string[]
}

const CATEGORY_LABELS: Record<string, string> = {
  food: "餐飲",
  transport: "交通",
  accommodation: "住宿",
  ticket: "票券",
  shopping: "購物",
  entertainment: "娛樂",
  gift: "禮品",
  other: "其他",
}

const CATEGORY_COLORS: Record<string, string> = {
  food: "#f97316",
  transport: "#3b82f6",
  accommodation: "#7c3aed",
  ticket: "#06b6d4",
  shopping: "#10b981",
  entertainment: "#ec4899",
  gift: "#f59e0b",
  other: "#64748b",
}

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload || !payload.length) return null

  const total = payload.reduce((sum, entry) => sum + (Number(entry.value) || 0), 0)

  return (
    <div className="bg-slate-900 rounded-lg p-3 text-white text-xs shadow-lg">
      <p className="text-slate-400 mb-2">{label}</p>
      <div className="space-y-1">
        {payload.map((entry, idx) => (
          <div key={idx} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-sm"
                style={{ backgroundColor: entry.color }}
              />
              <span>{CATEGORY_LABELS[entry.dataKey as string] || entry.dataKey}</span>
            </div>
            <span className="font-semibold">${Number(entry.value).toLocaleString()}</span>
          </div>
        ))}
        <div className="border-t border-slate-700 pt-1 mt-1 flex justify-between">
          <span className="text-slate-400">總計</span>
          <span className="font-semibold">${total.toLocaleString()}</span>
        </div>
      </div>
    </div>
  )
}

export function CategoryTrendChart({ data, categories }: CategoryTrendChartProps) {
  if (data.length < 2) return null

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">
        類別趨勢
      </p>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data}>
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "#94a3b8" }}
          />
          <YAxis hide />
          <Tooltip content={<CustomTooltip />} />
          {categories.map((cat) => (
            <Area
              key={cat}
              type="monotone"
              dataKey={cat}
              stackId="1"
              stroke={CATEGORY_COLORS[cat] || "#64748b"}
              fill={CATEGORY_COLORS[cat] || "#64748b"}
              fillOpacity={0.6}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-3 mt-3 justify-center">
        {categories.map((cat) => (
          <div key={cat} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: CATEGORY_COLORS[cat] || "#64748b" }}
            />
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {CATEGORY_LABELS[cat] || cat}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
