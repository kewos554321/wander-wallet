import type { DraftMember } from "./use-expense-draft"

const AVATAR_TONES = ["bg-[#D2EAE1] text-v2-lake", "bg-[#FBE3D2] text-[#C4602F]", "bg-v2-plum-soft text-v2-plum", "bg-v2-rose-soft text-v2-rose"]

// Shared member pill look for the payer, personal-item and shared-pool pickers.
export function memberPillClass(selected: boolean) {
  return `inline-flex items-center gap-1.5 rounded-full px-3.5 py-[5px] ${
    selected ? "border border-v2-lake bg-v2-lake text-white" : "border border-[#DDEDE6] bg-v2-lake-soft text-v2-ink"
  }`
}

export function memberTone(index: number) {
  return AVATAR_TONES[index % AVATAR_TONES.length]
}

export function PayerPicker({ members, value, onChange }: { members: DraftMember[]; value: string; onChange: (id: string) => void }) {
  return (
    <fieldset className="mx-4 mb-4">
      <legend className="mb-2.5 text-sm font-medium leading-5 tracking-[.1px]">付款成員</legend>
      <div className="flex flex-wrap gap-2">
        {members.map((m, i) => {
          const checked = value === m.id
          return (
            <label
              key={m.id}
              className={`cursor-pointer ${memberPillClass(checked)}`}
            >
              <input type="radio" name="v2-payer" className="sr-only" checked={checked} onChange={() => onChange(m.id)} aria-label={m.displayName} />
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold ${memberTone(i)}`} aria-hidden="true">
                {m.displayName.charAt(0)}
              </span>
              <span className="text-xs font-semibold">{m.displayName}</span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
