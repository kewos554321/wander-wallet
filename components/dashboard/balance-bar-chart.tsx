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
          <Tooltip
            contentStyle={{
              background: "#0f172a",
              border: "none",
              borderRadius: "8px",
              fontSize: "12px",
              color: "#fff",
            }}
            formatter={(value) => [`$${Number(value).toLocaleString()}`, ""]}
          />
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
