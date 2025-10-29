import Link from "next/link"
import { AppLayout } from "@/components/layout/app-layout"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function NewProjectPage() {
  return (
    <AppLayout title="新增專案" showBack>
      <div className="space-y-4">
        <div>
          <label className="block text-sm mb-1">專案名稱</label>
          <Input placeholder="例如：日本關西 5 天" />
        </div>
        <div className="flex gap-2">
          <Button className="flex-1">建立</Button>
          <Link href="/projects" className="flex-1">
            <Button variant="outline" className="w-full">取消</Button>
          </Link>
        </div>
      </div>
    </AppLayout>
  )
}


