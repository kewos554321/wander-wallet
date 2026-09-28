import { CoverArt } from "@/components/v2/cover/cover-art"
import { parseLocalDate, slashDate } from "@/components/v2/project/date-utils"

// "卡片預覽" preview at the top of the new-trip form: reflects the cover,
// name and date range as they're being filled in.
export function TripPreviewCard({
  cover,
  name,
  startDate,
  endDate,
}: {
  cover: string | null
  name: string
  startDate: string | null
  endDate: string | null
}) {
  const dayCount =
    startDate && endDate
      ? Math.round((parseLocalDate(endDate).getTime() - parseLocalDate(startDate).getTime()) / 86400000) + 1
      : null
  const dateLine =
    startDate || endDate
      ? `${slashDate(startDate ?? endDate!)} – ${slashDate(endDate ?? startDate!)} · 尚未邀請旅伴`
      : "尚未設定日期 · 尚未邀請旅伴"

  return (
    <div>
      <label className="mb-2 block text-xs font-semibold text-v2-ink-muted">卡片預覽</label>
      <div className="flex items-start gap-3 rounded-2xl border border-v2-line bg-v2-surface p-3 shadow-sm">
        <CoverArt cover={cover} className="h-14 w-14 rounded-2xl" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3
              className={`m-0 truncate font-v2-serif text-base font-semibold ${
                name ? "text-v2-ink" : "italic text-v2-ink-subtle"
              }`}
            >
              {name || "峇里島放鬆之旅"}
            </h3>
            <span className="shrink-0 rounded-full bg-v2-line px-2.5 py-[3px] text-xs font-bold text-v2-ink-muted">
              {dayCount !== null ? `${dayCount} 天` : "— 天"}
            </span>
          </div>
          <p className="my-0.5 truncate text-xs text-v2-ink-subtle">{dateLine}</p>
          <div className="flex items-center justify-between">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-v2-lake-soft text-[8px] font-bold text-v2-lake">
              我
            </span>
            <p className="m-0 font-v2-serif text-base font-bold text-v2-ink-subtle">尚未記帳</p>
          </div>
        </div>
      </div>
    </div>
  )
}
