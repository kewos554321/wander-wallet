"use client"

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts"

interface MemberBalance {
  name: string
  paid: number
  share: number
  balance: number
}

interface BalanceBarChartProps {
  data: MemberBalance[]
  height?: number
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ payload: MemberBalance }>
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null

  const data = payload[0].payload
  const balance = data.balance

  return (
    <div className="bg-slate-900 rounded-lg p-3 text-white text-xs shadow-lg">
      <p className="font-semibold mb-2">{data.name}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">已付</span>
          <span className="text-emerald-400">${data.paid.toLocaleString()}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">應付</span>
          <span>${data.share.toLocaleString()}</span>
        </div>
        <div className="border-t border-slate-700 pt-1 mt-1 flex justify-between gap-4">
          <span className="text-slate-400">結餘</span>
          <span className={balance >= 0 ? "text-emerald-400" : "text-red-400"}>
            {balance >= 0 ? "+" : ""}${balance.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  )
}

export function BalanceBarChart({ data, height = 160 }: BalanceBarChartProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">
        成員付款比較
      </p>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" barGap={4}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: "#64748b" }}
            width={50}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.05)" }} />
          <Bar
            dataKey="paid"
            fill="#22c55e"
            radius={[0, 4, 4, 0]}
            name="已付"
          />
          <Bar
            dataKey="share"
            fill="#e5e7eb"
            radius={[0, 4, 4, 0]}
            name="應付"
          />
        </BarChart>
      </ResponsiveContainer>
      <div className="flex gap-4 justify-center mt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-emerald-500" />
          <span className="text-xs text-slate-500 dark:text-slate-400">
            已付金額
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-slate-200 dark:bg-slate-700" />
          <span className="text-xs text-slate-500 dark:text-slate-400">
            應付金額
          </span>
        </div>
      </div>
    </div>
  )
}
