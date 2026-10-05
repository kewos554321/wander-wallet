"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ArrowRightLeft,
  BarChart3,
  Car,
  Coins,
  Download,
  History,
  Images,
  MapPin,
  MoreHorizontal,
  StickyNote,
  Users,
  type LucideIcon,
} from "lucide-react"
import { CATEGORY_PICKER_TONES } from "@/components/v2/category-style"
import { EXPENSE_CATEGORIES } from "@/lib/constants/expenses"

interface Feature {
  label: string
  path: string
  icon: LucideIcon
}

/**
 * Tones follow the category colours as they appear on the add-expense page
 * (`EXPENSE_CATEGORIES`: 餐飲→交通→住宿→票券→購物→娛樂→禮品→其他), assigned
 * left-to-right across the grid and cycling after all 8 categories. The 「更多」
 * toggle stays neutral and is not part of the sequence.
 */
const FEATURE_TONES = EXPENSE_CATEGORIES.map((category) => CATEGORY_PICKER_TONES[category].tone)

const PRIMARY: Feature[] = [
  { label: "成員", path: "members", icon: Users },
  { label: "結算", path: "settle", icon: ArrowRightLeft },
  { label: "統計", path: "stats", icon: BarChart3 },
  { label: "匯率", path: "currency", icon: Coins },
]

const SECONDARY: Feature[] = [
  { label: "歷史", path: "activity-logs", icon: History },
  { label: "里程", path: "mileage", icon: Car },
  { label: "匯出", path: "export", icon: Download },
  { label: "筆記", path: "notes", icon: StickyNote },
  { label: "地圖", path: "map", icon: MapPin },
  { label: "照片", path: "photos", icon: Images },
]

const toneAt = (index: number) => FEATURE_TONES[index % FEATURE_TONES.length]

const labelClass = "text-[11px] font-medium leading-[14px] tracking-[.3px]"
const wideLabelClass = "text-[12px] font-medium leading-4 tracking-[.5px]"

export function FeatureGrid({ projectId }: { projectId: string }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <nav aria-label="功能" className="px-4 pt-5">
      <div className="rounded-[18px] border border-v2-line bg-v2-surface px-3 pb-3 pt-4">
        <p className="mb-3 px-1 text-[13px] font-bold text-v2-lake">功能</p>

        <div className="flex items-start justify-between">
          {PRIMARY.map(({ label, path, icon: Icon }, index) => (
            <Link
              key={path}
              href={`/projects/${projectId}/${path}`}
              className="flex w-[52px] flex-col items-center gap-[5px] text-center"
            >
              <span className={`flex h-[46px] w-[46px] items-center justify-center rounded-full ${toneAt(index)}`} aria-hidden="true">
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.7} />
              </span>
              <span className={path === "currency" ? wideLabelClass : labelClass}>{label}</span>
            </Link>
          ))}

          <button
            type="button"
            aria-label="更多功能"
            aria-expanded={expanded}
            onClick={() => setExpanded((v) => !v)}
            className="flex w-[52px] flex-col items-center gap-[5px] text-center"
          >
            <span
              className={`flex h-[46px] w-[46px] items-center justify-center rounded-full ${
                expanded ? "bg-v2-lake text-v2-on-lake" : "bg-v2-sand text-v2-ink-muted"
              }`}
              aria-hidden="true"
            >
              <MoreHorizontal className="h-[18px] w-[18px]" strokeWidth={2} />
            </span>
            <span className={labelClass}>更多</span>
          </button>
        </div>

        {expanded && (
          <div className="mt-3.5 border-t border-dashed border-v2-line pt-3.5">
            <p className="mb-3 px-1 text-[11px] font-bold tracking-[.5px] text-v2-ink-subtle">更多功能</p>
            <div className="grid grid-cols-5 gap-x-1 gap-y-3">
              {SECONDARY.map(({ label, path, icon: Icon }, index) => (
                <Link
                  key={path}
                  href={`/projects/${projectId}/${path}`}
                  className="flex flex-col items-center gap-[5px] text-center"
                >
                  <span className={`flex h-[46px] w-[46px] items-center justify-center rounded-full ${toneAt(PRIMARY.length + index)}`} aria-hidden="true">
                    <Icon className="h-[18px] w-[18px]" strokeWidth={1.6} />
                  </span>
                  <span className={wideLabelClass}>{label}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
