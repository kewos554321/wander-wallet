import { JOIN_MODE_OPTIONS, type JoinMode } from "@/lib/hooks/use-project-form"

// Shared "成員加入方式" radio-card group. "create" is A9b (owns its card
// title/legend); "settings" is A13 (the card renders the title itself).
export function JoinModePicker({
  value,
  onChange,
  disabled,
  variant = "create",
}: {
  value: JoinMode
  onChange: (value: JoinMode) => void
  disabled?: boolean
  variant?: "create" | "settings"
}) {
  const settings = variant === "settings"
  return (
    <fieldset>
      {!settings && (
        <>
          <legend className="mb-0.5 text-[13px] font-bold text-v2-lake">成員加入方式</legend>
          <p className="mb-2.5 text-xs text-v2-ink-subtle">設定新成員透過分享連結加入時的方式</p>
        </>
      )}
      <div className="flex flex-col gap-2">
        {JOIN_MODE_OPTIONS.map((option) => {
          const checked = value === option.value
          return (
            <label
              key={option.value}
              className={`flex cursor-pointer items-start gap-2.5 border px-3.5 py-3 ${
                settings ? "rounded-[14px]" : "rounded-[12px]"
              } ${
                checked
                  ? settings
                    ? "border-[1.5px] border-v2-lake bg-v2-lake-soft"
                    : "border-[1.5px] border-v2-lake-mid bg-v2-lake-soft"
                  : settings
                    ? "border-v2-line bg-v2-surface"
                    : "border-v2-line bg-v2-paper"
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
              {settings ? (
                <span aria-hidden="true" className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${checked ? "bg-v2-lake" : "border-[1.5px] border-v2-check"}`}>
                  {checked && <span className="h-1.5 w-1.5 rounded-full bg-v2-surface" />}
                </span>
              ) : (
                <span aria-hidden="true" className={`mt-0.5 h-4 w-4 shrink-0 rounded-full ${checked ? "border-[5px] border-v2-lake-mid" : "border-[1.5px] border-v2-check"}`} />
              )}
              <span>
                <span className={`block leading-5 tracking-[.1px] ${settings ? `text-[13px] ${checked ? "font-bold" : "font-semibold"}` : "text-sm font-bold"}`}>{option.label}</span>
                <span className="mt-0.5 block text-xs text-v2-ink-muted">{option.description}</span>
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
