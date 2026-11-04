"use client"

import type { ReactNode } from "react"
import { PRESET_COVERS } from "@/lib/covers"
import { getAvatarColor, normalizeAvatarColorId } from "@/components/avatar-picker"

// DEMO — before/after preview for the five v2 style fixes:
//   1. cover preset gradients (neon → v2 palette)
//   2. avatar colour palette (Tailwind default → v2 tones)
//   3. map popup/chrome colours (slate → v2 tokens)
//   4. contrast + tiny text (category chips, +1 bubble, 市場/今天)
//   5. shadcn primitive radii (rounded-md/lg → rounded-v2-*)
// Nothing here changes production; it is a visual proposal.

const OLD_COVERS: Record<string, string> = {
  "1": "linear-gradient(135deg,#14b8a6 0%,#2dd4bf 50%,#5eead4 100%)",
  "2": "linear-gradient(180deg,#667eea 0%,#764ba2 100%)",
  "3": "linear-gradient(135deg,#11998e 0%,#38ef7d 100%)",
  "4": "linear-gradient(90deg,#ff416c 0%,#ff4b2b 100%)",
  "5": "linear-gradient(135deg,#f093fb 0%,#f5576c 100%)",
  "6": "linear-gradient(45deg,#00c6fb 0%,#005bea 100%)",
  "7": "linear-gradient(180deg,#d4a574 0%,#8b7355 100%)",
  "8": "linear-gradient(90deg,#a18cd1 0%,#fbc2eb 100%)",
  "9": "linear-gradient(180deg,#e0eafc 0%,#cfdef3 100%)",
  "10": "linear-gradient(90deg,#2193b0 0%,#6dd5ed 100%)",
  "11": "linear-gradient(180deg,#485563 0%,#29323c 100%)",
  "12": "linear-gradient(45deg,#f857a6 0%,#ff5858 100%)",
}
// label = the real preset name; after = the real gradient from lib/covers.
const COVERS = PRESET_COVERS.map((c) => ({ label: c.name, before: OLD_COVERS[c.id] ?? "transparent", after: c.gradient }))

const OLD_AVATARS = [
  { id: "red", hex: "#ef4444" },
  { id: "orange", hex: "#f97316" },
  { id: "amber", hex: "#f59e0b" },
  { id: "yellow", hex: "#eab308" },
  { id: "lime", hex: "#84cc16" },
  { id: "green", hex: "#22c55e" },
  { id: "teal", hex: "#5eb4b0" },
  { id: "cyan", hex: "#06b6d4" },
  { id: "blue", hex: "#3b82f6" },
  { id: "indigo", hex: "#6366f1" },
  { id: "purple", hex: "#a855f7" },
  { id: "pink", hex: "#ec4899" },
]
// label = old id -> new v2 id; after = the real resolved hex.
const AVATARS = OLD_AVATARS.map((a) => ({
  label: `${a.id} → ${normalizeAvatarColorId(a.id)}`,
  before: a.hex,
  after: getAvatarColor(a.id),
}))

const CHIPS_BEFORE = [
  { label: "餐飲", cls: "bg-[#FBEAE0] text-[#E8825A]" },
  { label: "交通", cls: "bg-[#EAF5F1] text-[#2F8F74]" },
  { label: "住宿", cls: "bg-[#EFEAF7] text-[#6B5B95]" },
  { label: "票券", cls: "bg-[#EEF0E1] text-[#6B7A3A]" },
  { label: "購物", cls: "bg-[#F6E9EE] text-[#A14A68]" },
  { label: "娛樂", cls: "bg-[#E8EEF7] text-[#4A6FA5]" },
  { label: "禮品", cls: "bg-[#F7EFDD] text-[#9C7A28]" },
  { label: "其他", cls: "bg-[#F1EBE0] text-[#6E6860]" },
]
const CHIPS_AFTER = [
  { label: "餐飲", cls: "bg-[#FBEAE0] text-[#8F3714]" },
  { label: "交通", cls: "bg-[#EAF5F1] text-[#1B5847]" },
  { label: "住宿", cls: "bg-[#EFEAF7] text-[#4E4174]" },
  { label: "票券", cls: "bg-[#EEF0E1] text-[#4C5A26]" },
  { label: "購物", cls: "bg-[#F6E9EE] text-[#A14A68]" },
  { label: "娛樂", cls: "bg-[#E8EEF7] text-[#35507A]" },
  { label: "禮品", cls: "bg-[#F7EFDD] text-[#74591A]" },
  { label: "其他", cls: "bg-[#F1EBE0] text-[#1B1815]" },
]

function Section({ n, title, note, children }: { n: string; title: string; note: string; children: ReactNode }) {
  return (
    <section className="rounded-v2-md border border-v2-line bg-v2-surface p-4">
      <p className="m-0 text-[13px] font-bold text-v2-ink">
        <span className="mr-1.5 text-v2-lake">{n}</span>
        {title}
      </p>
      <p className="mb-3 mt-0.5 text-[11px] text-v2-ink-muted">{note}</p>
      {children}
    </section>
  )
}

function Swatch({ before, after, label, round = false }: { before: string; after: string; label: string; round?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`h-7 w-7 shrink-0 border border-v2-line ${round ? "rounded-full" : "rounded-v2-xs"}`} style={{ background: before }} />
      <span className="text-[10px] text-v2-ink-subtle">→</span>
      <span className={`h-7 w-7 shrink-0 border border-v2-line ${round ? "rounded-full" : "rounded-v2-xs"}`} style={{ background: after }} />
      <span className="min-w-0 truncate text-[10px] text-v2-ink-muted">{label}</span>
    </div>
  )
}

function TripCard({ cover, avatars, label }: { cover: string; avatars: string[]; label: string }) {
  return (
    <div className="rounded-v2-md border border-v2-line bg-v2-surface p-3">
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-v2-sm text-2xl" style={{ background: cover }}>🍁</div>
        <div className="min-w-0 flex-1">
          <p className="m-0 truncate text-[13px] font-bold text-v2-ink">東京之旅</p>
          <p className="m-0 text-[11px] text-v2-ink-muted">10/08 – 10/12 · 4 人</p>
          <div className="mt-1.5 flex -space-x-1.5">
            {avatars.map((a, i) => (
              <span key={i} className="h-5 w-5 rounded-full border-2 border-v2-surface" style={{ background: a }} />
            ))}
          </div>
        </div>
        <span className="text-[12px] font-bold text-v2-ink">$48,600</span>
      </div>
      <p className="m-0 mt-2 text-[10px] text-v2-ink-subtle">{label}</p>
    </div>
  )
}

export default function V2FixesDemoPage() {
  return (
    <div className="mx-auto max-w-md space-y-3.5 px-4 py-6">
      <h1 className="m-0 text-[18px] font-bold text-v2-ink">v2 風格修正 · 前後對照</h1>
      <p className="m-0 text-[12px] text-v2-ink-muted">
        每一組都是 <b>左＝現在</b> → <b>右＝建議</b>。以下「後」欄已套用到 production（covers / avatars / map / chips / radii）。
      </p>

      <Section n="1" title="Cover preset 漸層" note="霓虹網頁漸層 → v2 色系（湖/珊瑚/金/梅/玫瑰/天/墨/沙）">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          {COVERS.map((c) => (
            <Swatch key={c.label} before={c.before} after={c.after} label={c.label} />
          ))}
        </div>
      </Section>

      <Section n="2" title="Avatar 色票" note="Tailwind 預設 12 色（含 indigo/cyan）→ v2 tone">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          {AVATARS.map((a) => (
            <Swatch key={a.label} before={a.before} after={a.after} label={a.label} round />
          ))}
        </div>
      </Section>

      <Section n="3" title="地圖 popup / chrome" note="冷灰藍 slate → v2 token（paper / ink / ink-muted / check）">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-v2-sm border border-[#cbd5e1] p-2.5" style={{ background: "#f8fafc" }}>
            <p className="m-0 text-[11px] font-medium" style={{ color: "#334155" }}>拉麵 $320</p>
            <p className="m-0 mt-0.5 text-[10px]" style={{ color: "#94a3b8" }}>
              <span style={{ color: "#cbd5e1" }}>•</span> 10/11 · 東京
            </p>
            <p className="m-0 mt-1 text-[10px]" style={{ color: "#64748b" }}>查看明細 →</p>
          </div>
          <div className="rounded-v2-sm border border-v2-line bg-v2-surface p-2.5">
            <p className="m-0 text-[11px] font-medium text-v2-ink">拉麵 $320</p>
            <p className="m-0 mt-0.5 text-[10px] text-v2-ink-subtle">
              <span className="text-v2-check">•</span> 10/11 · 東京
            </p>
            <p className="m-0 mt-1 text-[10px] text-v2-ink-muted">查看明細 →</p>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] text-v2-ink-muted">
          {[["#94a3b8", "ink-subtle"], ["#f8fafc", "paper"], ["#334155", "ink"], ["#cbd5e1", "check"], ["#64748b", "ink-muted"]].map(([hex, tok]) => (
            <span key={hex} className="inline-flex items-center gap-1 rounded-full border border-v2-line px-1.5 py-0.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: hex }} />
              {hex} → {tok}
            </span>
          ))}
        </div>
      </Section>

      <Section n="4" title="對比 / 小字" note="8 個類別 chip 的文字加深到 ≥4.5:1；+1 由 8px→10px；市場/今天 10px→12px">
        <p className="m-0 mb-1 text-[10px] font-bold text-v2-ink-subtle">現在</p>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {CHIPS_BEFORE.map((c) => (
            <span key={c.label} className={`rounded-full px-2 py-1 text-[11px] font-semibold ${c.cls}`}>{c.label}</span>
          ))}
        </div>
        <p className="m-0 mb-1 text-[10px] font-bold text-v2-ink-subtle">建議</p>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {CHIPS_AFTER.map((c) => (
            <span key={c.label} className={`rounded-full px-2 py-1 text-[11px] font-semibold ${c.cls}`}>{c.label}</span>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-v2-surface bg-v2-lake-tint text-[8px] font-bold text-v2-lake">+1</span>
            <span className="text-[10px] text-v2-ink-subtle">8px</span>
            <span className="text-[10px] text-v2-ink-subtle">→</span>
            <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-v2-surface bg-v2-lake-tint text-[10px] font-bold text-v2-lake">+1</span>
            <span className="text-[10px] text-v2-ink-subtle">10px</span>
          </div>
        </div>

        <div className="mt-3 rounded-v2-sm bg-v2-lake px-3 py-2">
          <div className="flex items-center gap-2 text-v2-paper/85">
            <span className="text-[10px]">10px</span>
            <span className="rounded-full bg-v2-paper/15 px-2 py-[3px] text-[10px] font-bold text-v2-paper">市場</span>
            <span className="text-[10px]">今天 ›</span>
            <span className="text-v2-paper/40">|</span>
            <span className="text-[12px]">12px</span>
            <span className="rounded-full bg-v2-paper/15 px-2 py-[3px] text-[12px] font-bold text-v2-paper">市場</span>
            <span className="text-[12px]">今天 ›</span>
          </div>
        </div>
      </Section>

      <Section n="5" title="shadcn 圓角（可選）" note="舊原件仍是 rounded-md/lg（6–8px）→ 對到 v2 的 10/14/20">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md border border-v2-line bg-v2-surface px-3 py-1.5 text-[11px]">rounded-md</span>
          <span className="text-[10px] text-v2-ink-subtle">→</span>
          <span className="rounded-v2-sm border border-v2-line bg-v2-surface px-3 py-1.5 text-[11px]">v2-sm (10)</span>
          <span className="rounded-lg border border-v2-line bg-v2-surface px-3 py-1.5 text-[11px]">rounded-lg</span>
          <span className="text-[10px] text-v2-ink-subtle">→</span>
          <span className="rounded-v2-md border border-v2-line bg-v2-surface px-3 py-1.5 text-[11px]">v2-md (14)</span>
        </div>
      </Section>

      <Section n="6" title="套用到實機的影響（卡片）" note="專案卡同時用到 cover + avatar；這就是現在 vs 建議在真實畫面裡的感覺">
        <div className="space-y-2.5">
          <TripCard
            cover={COVERS[0].before}
            avatars={["#ef4444", "#f59e0b", "#6366f1", "#22c55e"]}
            label="現在：霓虹 cover + Tailwind 頭像（青 + 紅/黃/靛/綠）"
          />
          <TripCard
            cover={COVERS[0].after}
            avatars={["#1B5847", "#C4602F", "#4A6FA5", "#6B7A3A"]}
            label="建議：v2 cover + v2 頭像（湖 + 湖/珊瑚/天/橄欖）"
          />
        </div>
      </Section>

      <p className="pb-6 text-center text-[11px] text-v2-ink-subtle">看完選要哪幾項，我再改到 production。</p>
    </div>
  )
}
