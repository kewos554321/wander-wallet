"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

/**
 * Chrome for the /demo area: a floating "back to the demo index" link on every
 * screen page (hidden on the index itself). Rendered once by app/demo/layout.
 */
export function DemoShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const onIndex = pathname === "/demo"

  return (
    <>
      {children}
      {!onIndex && (
        <Link
          href="/demo"
          aria-label="回 Demo 目錄"
          className="fixed bottom-4 left-4 z-50 rounded-full border border-v2-line bg-v2-surface px-3.5 py-2 text-[12px] font-bold text-v2-lake shadow-md"
        >
          ← Demo 目錄
        </Link>
      )}
    </>
  )
}
