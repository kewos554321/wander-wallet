"use client"

import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { ModeToggle } from "@/components/system/mode-toggle"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Folders, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

interface AppHeaderProps {
  title?: string
  showBack?: boolean
  backHref?: string
  onBack?: () => void
}

const navItems = [
  { href: "/projects", label: "所有專案", icon: Folders },
  { href: "/settings", label: "設定", icon: Settings },
]

export function AppHeader({ title = "Wander Wallet", showBack = false, backHref, onBack }: AppHeaderProps) {
  const router = useRouter()
  const pathname = usePathname()

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else if (backHref) {
      router.push(backHref)
    } else {
      router.back()
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center justify-between px-4">
        <div className="flex items-center gap-2">
          {showBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="h-8 w-8 -ml-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <h1 className="text-lg font-semibold">{title}</h1>
        </div>

        <div className="flex items-center gap-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href
            return (
              <Button
                key={href}
                variant="ghost"
                size="icon"
                asChild
                className={cn(
                  "h-8 w-8",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Link href={href} title={label}>
                  <Icon className={cn("h-4 w-4", isActive && "fill-current")} />
                </Link>
              </Button>
            )
          })}
          <ModeToggle />
        </div>
      </div>
    </header>
  )
}


