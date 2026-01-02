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
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{title}</p>
        {icon && (
          <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${iconBgClass || "bg-slate-100 dark:bg-slate-800"}`}>
            {icon}
          </div>
        )}
      </div>
      <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
        {value}
      </p>
      {subtitle && (
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
          {subtitle}
        </p>
      )}
      {trend && (
        <p
          className={`text-xs font-medium mt-1 ${
            trendUp ? "text-emerald-500" : "text-red-500"
          }`}
        >
          {trend}
        </p>
      )}
    </div>
  )
}
