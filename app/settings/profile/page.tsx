import { AppLayout } from "@/components/layout/app-layout"

export default function SettingsProfilePage() {
  return (
    <AppLayout title="個人資料" showBack>
      <div className="space-y-4">
        <p className="text-muted-foreground">這裡放個人資料與帳號設定。</p>
      </div>
    </AppLayout>
  )
}


