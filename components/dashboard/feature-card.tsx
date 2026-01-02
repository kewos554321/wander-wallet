"use client"

import { ReactNode } from "react"
import Link from "next/link"

interface FeatureCardProps {
  href?: string
  onClick?: () => void
  icon: ReactNode
  label: string
  iconBgClass: string
}

export function FeatureCard({ href, onClick, icon, label, iconBgClass }: FeatureCardProps) {
  const content = (
    <div className="bg-white dark:bg-slate-900 rounded-xl p-3 sm:p-4 border border-slate-200 dark:border-slate-800 flex flex-col items-center gap-2 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 active:scale-95 transition-all duration-150 cursor-pointer group">
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center transition-transform duration-150 group-hover:scale-110 ${iconBgClass}`}>
        {icon}
      </div>
      <p className="font-medium text-sm text-slate-900 dark:text-slate-100">{label}</p>
    </div>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }

  return (
    <button onClick={onClick} className="w-full text-left">
      {content}
    </button>
  )
}
