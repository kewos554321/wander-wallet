import type { ReactNode } from "react"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

interface V2TopBarProps {
  title: string
  backHref: string
  actions?: ReactNode
}

export function V2TopBar({ title, backHref, actions }: V2TopBarProps) {
  return (
    <div className="flex items-center justify-between border-b border-v2-line px-3.5 py-4">
      <Link
        href={backHref}
        aria-label="返回"
        className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-v2-line bg-v2-surface text-v2-ink"
      >
        <ChevronLeft className="h-[18px] w-[18px]" strokeWidth={2} />
      </Link>
      <h1 className="m-0 font-v2-serif text-base font-medium leading-6 tracking-[.15px]">{title}</h1>
      <div className="flex min-w-[34px] justify-end gap-1.5">{actions}</div>
    </div>
  )
}
