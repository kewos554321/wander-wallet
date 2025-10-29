import Link from "next/link"
import { AppLayout } from "@/components/layout/app-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function ProjectOverview({ params }: { params: { id: string } }) {
  const { id } = params
  return (
    <AppLayout title={`專案 #${id}`} showBack>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>成員</CardTitle>
            <CardDescription>新增/管理參與者</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">稍後在此顯示成員列表。</p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Link href={`/projects/${id}/expenses/new`}>
            <Button className="w-full">新增支出</Button>
          </Link>
          <Link href={`/projects/${id}/expenses`}>
            <Button variant="outline" className="w-full">支出列表</Button>
          </Link>
          <Link href={`/projects/${id}/settle`}>
            <Button variant="secondary" className="w-full">查看結算</Button>
          </Link>
        </div>
      </div>
    </AppLayout>
  )
}


