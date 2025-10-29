import { AppLayout } from "@/components/layout/app-layout"

export default function ProfilePage() {
  return (
    <AppLayout title="個人">
      <div className="space-y-4">
        <p className="text-muted-foreground">這裡放個人資料與設定。</p>
      </div>
    </AppLayout>
  )
}


