"use client"

import { ReactNode } from "react"

interface StatCardProps {
  title: string
  value: string
  subtitle?: string
  icon?: ReactNode
  trend?: string
  trendUp?: boolean
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendUp,
}: StatCardProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs text-slate-500 dark:text-slate-400">{title}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
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
          <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl">
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
