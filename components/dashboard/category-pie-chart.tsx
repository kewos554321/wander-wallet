"use client"

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"

interface CategoryData {
  name: string
  value: number
  color: string
}

interface CategoryPieChartProps {
  data: CategoryData[]
}

const CATEGORY_LABELS: Record<string, string> = {
  food: "餐飲",
  transport: "交通",
  accommodation: "住宿",
  entertainment: "娛樂",
  shopping: "購物",
  other: "其他",
}

const CATEGORY_COLORS: Record<string, string> = {
  food: "#f97316",
  transport: "#3b82f6",
  accommodation: "#8b5cf6",
  entertainment: "#ec4899",
  shopping: "#f59e0b",
  other: "#64748b",
}

export function CategoryPieChart({ data }: CategoryPieChartProps) {
  const chartData = data.map((item) => ({
    ...item,
    name: CATEGORY_LABELS[item.name] || item.name,
    color: CATEGORY_COLORS[item.name] || item.color || "#64748b",
  }))

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">
        分類統計
      </p>
      <div className="flex items-center gap-5">
        <ResponsiveContainer width={100} height={100}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={28}
              outerRadius={45}
              dataKey="value"
              strokeWidth={0}
            >
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="flex-1 flex flex-col gap-2">
          {chartData.map((cat, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between text-sm"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-sm"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="text-slate-500 dark:text-slate-400">
                  {cat.name}
                </span>
              </div>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                ${cat.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
