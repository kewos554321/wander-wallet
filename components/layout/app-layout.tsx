"use client"

import { AppHeader } from "./app-header"
import { BottomNav } from "./bottom-nav"

interface AppLayoutProps {
  children: React.ReactNode
  title?: string
  showBack?: boolean
  onBack?: () => void
}

export function AppLayout({ 
  children, 
  title, 
  showBack = false, 
  onBack 
}: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader title={title} showBack={showBack} onBack={onBack} />
      
      <main className="pb-16 pt-14">
        <div className="container mx-auto max-w-screen-2xl px-4">
          {children}
        </div>
      </main>
      
      <BottomNav />
    </div>
  )
}


