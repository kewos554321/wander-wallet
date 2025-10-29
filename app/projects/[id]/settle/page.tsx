import { AppLayout } from "@/components/layout/app-layout"

export default function SettlePage() {
  return (
    <AppLayout title="結算" showBack>
      <div className="space-y-4">
        <p className="text-muted-foreground">稍後在此顯示結算建議（誰轉給誰）。</p>
      </div>
    </AppLayout>
  )
}


