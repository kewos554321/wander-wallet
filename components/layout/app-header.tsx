"use client"

import { useRouter } from "next/navigation"
import { ModeToggle } from "@/components/system/mode-toggle"
import { Button } from "@/components/ui/button"
import { Menu, Bell, Search } from "lucide-react"

interface AppHeaderProps {
  title?: string
  showBack?: boolean
  onBack?: () => void
}

export function AppHeader({ title = "Wander Wallet", showBack = false, onBack }: AppHeaderProps) {
  const router = useRouter()
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center justify-between px-4">
        <div className="flex items-center gap-2">
          {showBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack ?? (() => router.back())}
              className="h-8 w-8 -ml-2"
            >
              <Menu className="h-4 w-4" />
            </Button>
          )}
          <h1 className="text-lg font-semibold">{title}</h1>
        </div>
        
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Search className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Bell className="h-4 w-4" />
          </Button>
          <ModeToggle />
        </div>
      </div>
    </header>
  )
}


