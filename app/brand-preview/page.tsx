"use client"

import { Logo } from "@/components/brand/logo"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/brand/empty-state"

export default function BrandPreviewPage() {
  return (
    <div className="min-h-screen bg-background p-6 space-y-8">
      <h1 className="text-2xl font-bold text-foreground">品牌預覽</h1>

      {/* Logo Variants */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Logo 變體</h2>
        <div className="flex flex-wrap gap-6 items-center">
          <div className="text-center">
            <Logo variant="full" size="lg" />
            <p className="text-xs text-muted-foreground mt-2">full</p>
          </div>
          <div className="text-center">
            <Logo variant="simple" size="lg" />
            <p className="text-xs text-muted-foreground mt-2">simple</p>
          </div>
          <div className="text-center">
            <Logo variant="icon" size="lg" />
            <p className="text-xs text-muted-foreground mt-2">icon</p>
          </div>
        </div>
      </section>

      {/* Color Palette */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">品牌色階</h2>
        <div className="flex gap-2">
          {[50, 100, 200, 300, 400, 500, 600, 700].map((shade) => (
            <div key={shade} className="text-center">
              <div
                className={`w-12 h-12 rounded-lg bg-brand-${shade}`}
                style={{ backgroundColor: `var(--brand-${shade})` }}
              />
              <p className="text-xs text-muted-foreground mt-1">{shade}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Buttons */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">按鈕</h2>
        <div className="flex flex-wrap gap-3">
          <Button>主要按鈕</Button>
          <Button variant="secondary">次要按鈕</Button>
          <Button variant="outline">外框按鈕</Button>
          <Button variant="ghost">幽靈按鈕</Button>
          <Button variant="destructive">刪除按鈕</Button>
        </div>
      </section>

      {/* Loading Animation */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">載入動畫</h2>
        <div className="bg-gradient-to-br from-brand-50 via-background to-brand-100 dark:from-brand-100 dark:via-background dark:to-brand-200 rounded-xl p-8">
          <div className="text-center animate-fade-in">
            <div className="relative mb-6 inline-block">
              <div className="absolute inset-0 rounded-2xl bg-brand-400/20 animate-pulse-ring" />
              <Logo variant="simple" size="xl" />
            </div>
            <h1 className="text-xl font-bold text-foreground mb-1">Wander Wallet</h1>
            <p className="text-sm text-muted-foreground mb-6">旅行分帳好幫手</p>
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent mx-auto" />
          </div>
        </div>
      </section>

      {/* Empty States */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">空狀態</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <EmptyState
                variant="no-projects"
                title="還沒有專案"
                description="建立你的第一個旅行專案"
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <EmptyState
                variant="no-expenses"
                title="還沒有支出"
                description="記錄你的第一筆花費"
              />
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
