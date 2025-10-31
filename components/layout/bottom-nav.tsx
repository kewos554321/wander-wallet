"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Settings, Folder } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/", label: "首頁", icon: Home },
  { href: "/projects", label: "專案", icon: Folder },
  { href: "/settings", label: "設定", icon: Settings },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto max-w-screen-2xl">
        <div className="grid grid-cols-3">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-col items-center gap-1 py-2 px-1 text-xs transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("h-5 w-5", isActive && "fill-current")} />
                <span className="truncate">{label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}


