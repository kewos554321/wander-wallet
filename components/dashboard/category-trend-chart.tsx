"use client"

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts"
import { getCategoryLabel, getCategoryColor } from "@/lib/constants/expenses"
import { formatCurrency, DEFAULT_CURRENCY } from "@/lib/constants/currencies"

interface CategoryTrendData {
  date: string
  [category: string]: number | string
}

interface CategoryTrendChartProps {
  data: CategoryTrendData[]
  categories: string[]
  currency?: string
}

interface CustomTooltipPayloadItem {
  value: number
  dataKey: string
  color: string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: CustomTooltipPayloadItem[]
  label?: string
  currency: string
}

function CustomTooltip({ active, payload, label, currency }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null

  const total = payload.reduce((sum, entry) => sum + (entry.value || 0), 0)

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
              <span>{getCategoryLabel(entry.dataKey)}</span>
            </div>
            <span className="font-semibold">{formatCurrency(entry.value, currency)}</span>
          </div>
        ))}
        <div className="border-t border-slate-700 pt-1 mt-1 flex justify-between">
          <span className="text-slate-400">總計</span>
          <span className="font-semibold">{formatCurrency(total, currency)}</span>
        </div>
      </div>
    </div>
  )
}

export function CategoryTrendChart({ data, categories, currency = DEFAULT_CURRENCY }: CategoryTrendChartProps) {
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
          <Tooltip content={<CustomTooltip currency={currency} />} />
          {categories.map((cat) => (
            <Area
              key={cat}
              type="monotone"
              dataKey={cat}
              stackId="1"
              stroke={getCategoryColor(cat)}
              fill={getCategoryColor(cat)}
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
              style={{ backgroundColor: getCategoryColor(cat) }}
            />
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {getCategoryLabel(cat)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
