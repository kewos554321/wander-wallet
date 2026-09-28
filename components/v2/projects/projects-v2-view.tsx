"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"
import { Compass, Plus } from "lucide-react"
import type { ProjectListItem, ProjectListMember } from "@/lib/hooks/useProjects"
import { formatCurrency, DEFAULT_CURRENCY } from "@/lib/constants/currencies"
import { formatTripDateRange, getGreeting, getTripDays, getTripStatus, type TripStatus } from "@/lib/trip"
import { CoverThumb } from "./cover-thumb"

type Filter = "all" | TripStatus

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "active", label: "進行中" },
  { value: "completed", label: "已完成" },
]

// Avatar tones cycle through the v2 palette.
const AVATAR_TONES = [
  "bg-v2-lake-soft text-v2-lake",
  "bg-v2-coral-soft text-v2-coral",
  "bg-v2-plum-soft text-v2-plum",
  "bg-v2-rose-soft text-v2-rose",
  "bg-v2-gold-soft text-v2-gold",
]

interface ProjectsV2ViewProps {
  projects: ProjectListItem[]
  loading: boolean
  userName: string | null
  now: Date
  adSlot?: ReactNode
}

export function ProjectsV2View({ projects, loading, userName, now, adSlot }: ProjectsV2ViewProps) {
  const [filter, setFilter] = useState<Filter>("all")
  const visible = projects.filter((p) => filter === "all" || getTripStatus(p.endDate, now) === filter)
  const initial = userName?.trim().charAt(0).toUpperCase() || "?"

  return (
    <div className="pb-5">
      <div className="flex items-center justify-between px-5 pb-1 pt-[22px]">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-v2-lake text-v2-paper">
            <Compass className="h-[17px] w-[17px]" strokeWidth={1.6} />
          </div>
          <span className="text-[15px] font-bold tracking-[.1px]">Wander Wallet</span>
        </div>
        <Link
          href="/settings"
          aria-label="通用設定"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-v2-lake text-sm font-bold text-v2-paper"
        >
          {initial}
        </Link>
      </div>

      <div className="flex items-end justify-between gap-3 px-5 pb-4 pt-3.5">
        <div>
          <p className="mb-1 text-xs leading-4 tracking-[.4px] text-v2-ink-muted">
            {userName ? `${getGreeting(now)}，${userName}` : "你好"}
          </p>
          <h1 className="m-0 font-v2-serif text-[32px] font-bold leading-10">你的旅程</h1>
        </div>
        <Link
          href="/projects/new"
          aria-label="建立新旅程"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-v2-lake text-v2-on-lake shadow-[0_4px_10px_rgba(27,88,71,.25)]"
        >
          <Plus className="h-[19px] w-[19px]" strokeWidth={2.2} />
        </Link>
      </div>

      <div className="flex items-center gap-1.5 px-5 pb-4">
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
            className={
              filter === value
                ? "rounded-full bg-v2-lake px-[18px] py-2 text-sm font-medium leading-5 tracking-[.1px] text-v2-on-lake"
                : "rounded-full px-3.5 py-2 text-sm font-medium leading-5 tracking-[.1px] text-v2-ink-muted"
            }
          >
            {label}
          </button>
        ))}
      </div>

      {adSlot && <div className="px-5 pb-4">{adSlot}</div>}

      <div className="flex flex-col gap-2.5 px-5">
        {loading ? (
          [0, 1, 2].map((i) => (
            <div
              key={i}
              data-testid="v2-project-skeleton"
              className="h-[90px] animate-pulse rounded-2xl border border-v2-line bg-v2-surface"
            />
          ))
        ) : projects.length === 0 ? (
          <div className="rounded-2xl border border-v2-line bg-v2-surface px-5 py-12 text-center">
            <p className="font-v2-serif text-[17px] font-semibold">還沒有旅程</p>
            <p className="mt-1 text-xs text-v2-ink-muted">建立旅程來記錄旅行中的共同開銷</p>
            <Link
              href="/projects/new"
              className="mt-5 inline-flex rounded-full bg-v2-lake px-6 py-3 text-[15px] font-bold text-v2-on-lake"
            >
              建立旅程
            </Link>
          </div>
        ) : visible.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-v2-ink-muted">沒有符合的旅程</p>
        ) : (
          visible.map((p) => <ProjectCard key={p.id} project={p} />)
        )}
      </div>
    </div>
  )
}

function ProjectCard({ project }: { project: ProjectListItem }) {
  const days = getTripDays(project.startDate, project.endDate)
  const memberCount = project._count.members || project.members.length
  const dateLine = project.startDate
    ? `${formatTripDateRange(project.startDate, project.endDate)} · ${memberCount} 位旅伴`
    : formatTripDateRange(project.startDate, project.endDate)

  return (
    <Link
      href={`/projects/${project.id}`}
      className="flex items-start gap-3 rounded-2xl border border-v2-line bg-v2-surface p-3 shadow-[0_2px_8px_rgba(27,24,21,.05)]"
    >
      <CoverThumb cover={project.cover} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="m-0 truncate font-v2-serif text-base font-medium leading-6 tracking-[.15px]">{project.name}</h3>
          {days !== null && (
            <span className="shrink-0 rounded-full bg-v2-lake px-2.5 py-[3px] text-xs font-bold leading-4 tracking-[.5px] text-v2-on-lake">
              {days} 天
            </span>
          )}
        </div>
        <p className="mb-2 mt-0.5 truncate text-xs leading-4 tracking-[.4px] text-v2-ink-muted">{dateLine}</p>
        <div className="flex items-center justify-between">
          <AvatarStack members={project.members} total={memberCount} />
          <p className="m-0 font-v2-serif text-base font-bold leading-6 tracking-[.15px] tabular-nums text-v2-lake">
            {formatCurrency(project.totalAmount, project.currency || DEFAULT_CURRENCY)}
          </p>
        </div>
      </div>
    </Link>
  )
}

function AvatarStack({ members, total }: { members: ProjectListMember[]; total: number }) {
  const shown = members.slice(0, 3)
  const extra = total - shown.length
  const bubble = "flex h-5 w-5 items-center justify-center rounded-full border-2 border-v2-surface text-[8px] font-bold"

  return (
    <div className="flex">
      {shown.map((m, i) => (
        <div key={m.id} className={`${bubble} ${AVATAR_TONES[i % AVATAR_TONES.length]} ${i > 0 ? "-ml-1.5" : ""}`}>
          {m.displayName.charAt(0)}
        </div>
      ))}
      {extra > 0 && <div className={`${bubble} -ml-1.5 bg-v2-line text-[7px] text-v2-ink-muted`}>+{extra}</div>}
    </div>
  )
}
