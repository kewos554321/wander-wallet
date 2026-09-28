import { JOIN_MODE_OPTIONS, type JoinMode } from "@/lib/hooks/use-project-form"

// Shared "成員加入方式" radio-card group used by the new-trip and
// project-settings v2 screens.
export function JoinModePicker({
  value,
  onChange,
  disabled,
}: {
  value: JoinMode
  onChange: (value: JoinMode) => void
  disabled?: boolean
}) {
  return (
    <fieldset>
      <legend className="mb-0.5 text-xs font-semibold text-v2-ink-muted">成員加入方式</legend>
      <p className="mb-2.5 text-xs text-v2-ink-subtle">設定新成員透過分享連結加入時的方式</p>
      <div className="flex flex-col gap-2">
        {JOIN_MODE_OPTIONS.map((option) => {
          const checked = value === option.value
          return (
            <label
              key={option.value}
              className={`flex cursor-pointer items-start gap-2.5 rounded-xl border px-3.5 py-3 ${
                checked ? "border-[1.5px] border-v2-lake bg-v2-lake-soft" : "border-v2-line bg-v2-surface"
              }`}
            >
              <input
                type="radio"
                name="v2-join-mode"
                className="sr-only"
                checked={checked}
                disabled={disabled}
                onChange={() => onChange(option.value)}
                aria-label={option.label}
              />
              <span
                aria-hidden="true"
                className={`mt-0.5 h-4 w-4 shrink-0 rounded-full ${checked ? "border-[5px] border-v2-lake" : "border-[1.5px] border-v2-check"}`}
              />
              <span>
                <span className="block text-sm font-bold leading-5 tracking-[.1px]">{option.label}</span>
                <span className="mt-0.5 block text-xs text-v2-ink-muted">{option.description}</span>
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
