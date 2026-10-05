import { formatCurrency } from "@/lib/constants/currencies"
import type { MemberStat } from "@/lib/project-stats"
import { V2Avatar } from "@/components/v2/ui/v2-avatar"

const AVATAR_TONES = [
  "bg-v2-lake-tint text-v2-lake",
  "bg-v2-coral-soft text-v2-coral-strong",
  "bg-v2-plum-soft text-v2-plum",
  "bg-v2-gold-soft text-v2-gold",
  "bg-v2-rose-soft text-v2-rose",
]

type RankingMember = MemberStat & { image?: string | null }

export function MemberRanking({ members, currency, currentMemberId }: { members: RankingMember[]; currency: string; currentMemberId: string | null }) {
  const ranked = [...members].sort((a, b) => b.share - a.share)
  const top = ranked[0]?.share ?? 0

  if (top <= 0) {
    return <p className="py-6 text-center text-xs text-v2-ink-muted">尚無支出</p>
  }

  return (
    <ul aria-label="成員排行" className="m-0 flex list-none flex-col gap-2.5 p-0">
      {ranked.map((m, i) => {
        const label = m.id === currentMemberId ? "我" : m.name
        const pct = Math.round((m.share / top) * 100)
        return (
          <li key={m.id} className="flex items-center gap-2.5">
            <V2Avatar
              image={m.image ?? null}
              name={label}
              className="h-[26px] w-[26px] shrink-0 rounded-full"
              fallbackClassName={`text-[10px] font-bold ${AVATAR_TONES[i % AVATAR_TONES.length]}`}
            />
            <span
              role="meter"
              aria-label={label}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct}
              className="h-2 flex-1 overflow-hidden rounded-full bg-v2-line-soft"
            >
              <span className={`block h-full rounded-full ${i === 0 ? "bg-v2-lake" : "bg-v2-lake-mid"}`} style={{ width: `${pct}%` }} />
            </span>
            <span className="w-[68px] shrink-0 text-right text-xs text-v2-ink-muted">{formatCurrency(Math.round(m.share), currency)}</span>
          </li>
        )
      })}
    </ul>
  )
}
