"use client"

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  Tooltip as RechartsTooltip,
} from "recharts"
import { Info } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { formatCurrency, DEFAULT_CURRENCY } from "@/lib/constants/currencies"

interface DataPoint {
  date: string
  amount: number
}

interface TrendAreaChartProps {
  data: DataPoint[]
  height?: number
  currency?: string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
  currency: string
}

function CustomTooltip({ active, payload, label, currency }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null

  const amount = payload[0].value

  return (
    <div className="bg-slate-900 rounded-lg p-3 text-white text-xs shadow-lg">
      <p className="text-slate-400 mb-1">{label}</p>
      <p className="text-lg font-semibold text-emerald-400">
        {formatCurrency(amount, currency)}
      </p>
    </div>
  )
}

export function TrendAreaChart({ data, height = 140, currency = DEFAULT_CURRENCY }: TrendAreaChartProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-1.5 mb-4">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          消費趨勢
        </p>
        <Popover>
          <PopoverTrigger asChild>
            <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
              <Info className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent side="bottom" align="start" className="w-auto p-2 text-xs">
            依據「消費日期」顯示近 7 天趨勢
          </PopoverContent>
        </Popover>
      </div>
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
          <RechartsTooltip content={<CustomTooltip currency={currency} />} />
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
