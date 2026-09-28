import { CATEGORY_ICONS, CATEGORY_LABELS, EXPENSE_CATEGORIES } from "@/lib/constants/expenses"
import { CATEGORY_TONES } from "@/components/v2/category-style"

export function CategoryPicker({ value, onChange }: { value: string; onChange: (category: string) => void }) {
  return (
    <div className="mx-4 mb-3">
      <p className="mb-1.5 text-sm font-medium leading-5 tracking-[.1px]">類別</p>
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
                  ? "border-[1.5px] border-v2-lake-mid bg-v2-lake-soft font-bold text-v2-lake"
                  : `border-[1.5px] border-v2-line font-semibold ${CATEGORY_TONES[key]}`
              }`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {CATEGORY_LABELS[key]}
            </button>
          )
        })}
      </div>
    </div>
  )
}
