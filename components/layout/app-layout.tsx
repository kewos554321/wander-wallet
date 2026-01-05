"use client"

import { AppHeader } from "./app-header"

interface AppLayoutProps {
  children: React.ReactNode
  title?: string
  showBack?: boolean
  backHref?: string
  onBack?: () => void
}

export function AppLayout({
  children,
  title,
  showBack = false,
  backHref,
  onBack,
}: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader title={title} showBack={showBack} backHref={backHref} onBack={onBack} />

      <main>
        <div className="container mx-auto max-w-screen-2xl px-4 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}


