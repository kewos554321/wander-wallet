"use client"

import { ReactNode } from "react"

interface StatCardProps {
  title: string
  value: string
  subtitle?: string
  icon?: ReactNode
  trend?: string
  trendUp?: boolean
  iconBgClass?: string
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendUp,
  iconBgClass,
}: StatCardProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0 flex-1">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{title}</p>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 truncate tabular-nums">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {subtitle}
            </p>
          )}
          {trend && (
            <p
              className={`text-xs font-medium ${
                trendUp ? "text-emerald-500" : "text-red-500"
              }`}
            >
              {trend}
            </p>
          )}
        </div>
        {icon && (
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${iconBgClass || "bg-slate-100 dark:bg-slate-800"}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
