import Link from "next/link"
import { AppLayout } from "@/components/layout/app-layout"
import { Button } from "@/components/ui/button"

export default function ProjectsPage() {
  return (
    <AppLayout title="專案">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">旅行專案</h2>
          <Link href="/projects/new">
            <Button>新增專案</Button>
          </Link>
        </div>
        <p className="text-muted-foreground">目前還沒有資料，先新增一個專案吧。</p>
      </div>
    </AppLayout>
  )
}


