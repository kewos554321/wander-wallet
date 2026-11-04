"use client"

import { useState } from "react"
import { Check, ChevronRight, Users, X } from "lucide-react"
import { formatCurrency } from "@/lib/constants/currencies"
import { V2Avatar, avatarSeed } from "@/components/v2/ui/v2-avatar"
import { Sheet } from "@/components/v2/ui/sheet"
import { SECTION_CARD, SECTION_TITLE } from "@/components/v2/expense-form/section-card"
import type { DraftMember } from "@/components/v2/expense-form/use-expense-draft"

/**
 * Demo-only proposal for the split entry point.
 *
 * The shipped form shows every payer and every participant as a pill. With four
 * travellers that is two walls of near-identical pills, and the default pool is
 * just the payer. This proposal keeps the same decision but shows the result as
 * two list rows: the payer, and "who shares" as a count + per-person amount.
 * The member list only appears when the user taps 調整.
 *
 * Local state on purpose: this is a design preview, not the product path.
 */

interface ProposedSplitPanelProps {
  members: DraftMember[]
  amount: number
  currency: string
  currentMemberId: string
}

export function ProposedSplitPanel({ members, amount, currency, currentMemberId }: ProposedSplitPanelProps) {
  const [payerId, setPayerId] = useState(currentMemberId)
  const [pool, setPool] = useState<string[]>(() => members.map((m) => m.id))
  const [open, setOpen] = useState<"payer" | "split" | null>(null)

  const payer = members.find((m) => m.id === payerId)
  const selectedMembers = members.filter((m) => pool.includes(m.id))
  const excludedMembers = members.filter((m) => !pool.includes(m.id))
  const allSelected = pool.length === members.length
  const onlyMe = pool.length === 1 && pool[0] === currentMemberId
  const perPerson = pool.length > 0 ? amount / pool.length : 0

  const title = allSelected ? `全體 ${members.length} 人` : onlyMe ? "只有你" : `${pool.length} 人平分`
  const subtitle = onlyMe
    ? "這筆不會分給其他旅伴"
    : `每人 ${formatCurrency(perPerson, currency)}${
        excludedMembers.length > 0
          ? ` · ${excludedMembers
              .slice(0, 2)
              .map((m) => m.displayName)
              .join("、")}${excludedMembers.length > 2 ? " 等" : ""}不分`
          : ""
      }`

  const selectAll = () => setPool(members.map((m) => m.id))
  const onlyMeAction = () => setPool([currentMemberId])
  const togglePool = (id: string) => {
    setPool((current) => {
      if (current.includes(id)) {
        // Never leave the expense with nobody sharing it.
        return current.length === 1 ? current : current.filter((memberId) => memberId !== id)
      }
      return [...current, id]
    })
  }

  return (
    <>
      <section className={SECTION_CARD}>
        <p className={`m-0 ${SECTION_TITLE}`}>誰付這筆</p>
        <button
          type="button"
          onClick={() => setOpen("payer")}
          className="mt-2.5 flex min-h-[56px] w-full items-center gap-3 rounded-v2-md border border-v2-line bg-v2-paper px-3 py-2.5 text-left transition-colors duration-150 hover:bg-v2-sand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-lake motion-reduce:transition-none"
        >
          <V2Avatar
            image={payer?.image ?? null}
            name={payer?.displayName ?? "付款人"}
            seed={avatarSeed(payer?.userId, payer?.id)}
            variant={payer?.id === currentMemberId ? "brand" : undefined}
            placeholder={payer?.isPlaceholder}
            className="h-8 w-8 rounded-full"
            fallbackClassName="text-[11px] font-bold"
          />
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-bold text-v2-ink">
              {payer ? `${payer.displayName}付款` : "選擇付款人"}
            </span>
            <span className="mt-0.5 block text-[11px] text-v2-ink-muted">
              {amount > 0 ? `全額 ${formatCurrency(amount, currency)}` : "輸入金額後顯示"}
            </span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-v2-ink-subtle" aria-hidden="true" />
        </button>
      </section>

      <section className={SECTION_CARD}>
        <div className="flex items-center justify-between gap-2">
          <p className={`m-0 flex items-center gap-2 ${SECTION_TITLE}`}>
            誰一起分
            {allSelected && (
              <span className="rounded-full bg-v2-lake-soft px-2 py-[3px] text-[10px] font-bold text-v2-lake">
                預設
              </span>
            )}
          </p>
          <span className="text-[11px] font-semibold tabular-nums text-v2-ink-muted">
            {pool.length} / {members.length} 人
          </span>
        </div>

        <button
          type="button"
          onClick={() => setOpen("split")}
          className="mt-2.5 flex min-h-[64px] w-full items-center gap-3 rounded-v2-md border border-v2-line bg-v2-paper px-3 py-3 text-left transition-colors duration-150 hover:bg-v2-sand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-lake motion-reduce:transition-none"
        >
          <AvatarStack members={selectedMembers} currentMemberId={currentMemberId} />
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-bold text-v2-ink">{title}</span>
            <span className="mt-0.5 block text-[11px] leading-4 text-v2-ink-muted">{subtitle}</span>
          </span>
          <span className="flex shrink-0 items-center gap-0.5 text-[12px] font-bold text-v2-lake">
            調整
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        </button>

        <button
          type="button"
          onClick={onlyMe ? selectAll : onlyMeAction}
          className="mt-1.5 flex min-h-[44px] items-center text-[12px] font-semibold text-v2-lake focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-lake"
        >
          {onlyMe ? "改回全體平分" : "只有我（個人支出）"}
        </button>
      </section>

      <Sheet
        open={open != null}
        onClose={() => setOpen(null)}
        label={open === "payer" ? "選擇付款人" : "選擇分攤旅伴"}
      >
        {open === "payer" && (
          <>
            <SheetHeader
              title="誰付這筆"
              description={`這筆 ${formatCurrency(amount, currency)} 由誰先付？`}
              onClose={() => setOpen(null)}
            />
            <div className="mt-4 space-y-2" role="radiogroup" aria-label="付款人">
              {members.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  isMe={member.id === currentMemberId}
                  checked={member.id === payerId}
                  mode="payer"
                  onClick={() => {
                    setPayerId(member.id)
                    setOpen(null)
                  }}
                />
              ))}
            </div>
          </>
        )}

        {open === "split" && (
          <>
            <SheetHeader
              title="誰一起分"
              description={`選要一起平分這筆 ${formatCurrency(amount, currency)} 的旅伴。`}
              onClose={() => setOpen(null)}
            />
            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="text-[12px] font-semibold tabular-nums text-v2-ink-muted">
                {pool.length} / {members.length} 人
              </span>
              <button
                type="button"
                onClick={allSelected ? onlyMeAction : selectAll}
                className="min-h-[44px] text-[12px] font-bold text-v2-lake focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-lake"
              >
                {allSelected ? "只留我" : "全選"}
              </button>
            </div>
            <div className="mt-1 space-y-2" role="group" aria-label="分攤旅伴">
              {members.map((member) => {
                const checked = pool.includes(member.id)
                return (
                  <MemberRow
                    key={member.id}
                    member={member}
                    isMe={member.id === currentMemberId}
                    checked={checked}
                    mode="split"
                    amountLabel={checked ? undefined : "不分這筆"}
                    onClick={() => togglePool(member.id)}
                  />
                )
              })}
            </div>
            <div className="mt-4 flex items-center justify-between rounded-v2-md bg-v2-lake-soft px-3 py-2.5">
              <span className="text-[12px] font-semibold text-v2-lake">
                {pool.length === 1 ? "只有你" : `${pool.length} 人平分`}
              </span>
              <span className="text-[13px] font-bold tabular-nums text-v2-lake">
                {formatCurrency(perPerson, currency)} / 人
              </span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(null)}
              className="mt-3 w-full rounded-v2-md bg-v2-lake py-[15px] text-[15px] font-bold text-v2-on-lake transition-transform duration-150 ease-out active:scale-[.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-lake motion-reduce:transition-none"
            >
              完成
            </button>
            {/* Keep the demo shell's floating back link clear of the primary action. */}
            <div className="h-11" aria-hidden="true" />
          </>
        )}
      </Sheet>
    </>
  )
}

function AvatarStack({ members, currentMemberId }: { members: DraftMember[]; currentMemberId: string }) {
  const shown = members.slice(0, 3)
  const extra = members.length - shown.length
  return (
    <span className="flex shrink-0" aria-hidden="true">
      {shown.map((member, index) => (
        <V2Avatar
          key={member.id}
          image={member.image ?? null}
          name={member.displayName}
          seed={avatarSeed(member.userId, member.id)}
          variant={member.id === currentMemberId ? "brand" : undefined}
          placeholder={member.isPlaceholder}
          className={`h-7 w-7 rounded-full border-2 border-v2-paper ${index > 0 ? "-ml-2" : ""}`}
          fallbackClassName="text-[9px] font-bold"
        />
      ))}
      {extra > 0 && (
        <span className="-ml-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-v2-paper bg-v2-line text-[10px] font-bold text-v2-ink-muted">
          +{extra}
        </span>
      )}
      {shown.length === 0 && (
        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-v2-check text-v2-ink-subtle">
          <Users className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      )}
    </span>
  )
}

function SheetHeader({
  title,
  description,
  onClose,
}: {
  title: string
  description: string
  onClose: () => void
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="m-0 font-v2-serif text-[20px] font-bold leading-7 text-v2-ink">{title}</h2>
        <p className="m-0 mt-1 text-[12px] leading-4 text-v2-ink-muted">{description}</p>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="關閉"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-v2-line bg-v2-surface text-v2-ink-muted transition-colors duration-150 hover:bg-v2-sand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-lake motion-reduce:transition-none"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  )
}

function MemberRow({
  member,
  isMe,
  checked,
  mode,
  amountLabel,
  onClick,
}: {
  member: DraftMember
  isMe: boolean
  checked: boolean
  mode: "payer" | "split"
  amountLabel?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role={mode === "payer" ? "radio" : "checkbox"}
      aria-checked={checked}
      onClick={onClick}
      className={`flex min-h-[56px] w-full items-center gap-3 rounded-v2-md border px-3 py-2.5 text-left transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-lake motion-reduce:transition-none ${
        checked ? "border-v2-lake bg-v2-lake-soft" : "border-v2-line bg-v2-surface hover:bg-v2-sand"
      }`}
    >
      <V2Avatar
        image={member.image ?? null}
        name={member.displayName}
        seed={avatarSeed(member.userId, member.id)}
        variant={isMe ? "brand" : undefined}
        placeholder={member.isPlaceholder}
        className="h-8 w-8 rounded-full"
        fallbackClassName="text-[11px] font-bold"
      />
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-semibold text-v2-ink">
          {member.displayName}
          {isMe && member.displayName !== "我" ? "（我）" : ""}
        </span>
        {amountLabel && <span className="mt-0.5 block text-[11px] text-v2-ink-muted">{amountLabel}</span>}
      </span>
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center border ${
          mode === "payer" ? "rounded-full" : "rounded-v2-xs"
        } ${checked ? "border-v2-lake bg-v2-lake" : "border-v2-line bg-v2-surface"}`}
      >
        {checked && <Check className="h-3 w-3 text-v2-on-lake" aria-hidden="true" />}
      </span>
    </button>
  )
}
