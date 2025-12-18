"use client"

import { useRouter } from "next/navigation"
import { ModeToggle } from "@/components/system/mode-toggle"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

interface AppHeaderProps {
  title?: string
  showBack?: boolean
  backHref?: string
  onBack?: () => void
}

export function AppHeader({ title = "Wander Wallet", showBack = false, backHref, onBack }: AppHeaderProps) {
  const router = useRouter()

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
          <ModeToggle />
        </div>
      </div>
    </header>
  )
}


