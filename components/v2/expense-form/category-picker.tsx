import { CATEGORY_ICONS, CATEGORY_LABELS, EXPENSE_CATEGORIES } from "@/lib/constants/expenses"
import { CATEGORY_PICKER_TONES } from "@/components/v2/category-style"
import { SECTION_CARD, SECTION_TITLE } from "./section-card"

export function CategoryPicker({ value, onChange }: { value: string; onChange: (category: string) => void }) {
  return (
    <div className={SECTION_CARD}>
      <p className={`mb-1.5 ${SECTION_TITLE}`}>類別</p>
      <div className="grid grid-cols-4 gap-1.5">
        {EXPENSE_CATEGORIES.map((key) => {
          const Icon = CATEGORY_ICONS[key]
          const active = value === key
          return (
            <button
              key={key}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(active ? "" : key)}
              className={`flex items-center justify-center gap-[5px] rounded-[14px] px-1 py-2 text-xs ${
                active
                  ? `border-[1.5px] ${CATEGORY_PICKER_TONES[key].border} ${CATEGORY_PICKER_TONES[key].tone} font-bold`
                  : `border-[1.5px] border-v2-line font-semibold ${CATEGORY_PICKER_TONES[key].tone}`
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {CATEGORY_LABELS[key]}
            </button>
          )
        })}
      </div>
    </div>
  )
}
