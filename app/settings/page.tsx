import { AppLayout } from "@/components/layout/app-layout"

export default function SettingsPage() {
  return (
    <AppLayout title="設定">
      <div className="space-y-4">
        <p className="text-muted-foreground">這裡放應用程式偏好與主題設定。</p>
      </div>
    </AppLayout>
  )
}


