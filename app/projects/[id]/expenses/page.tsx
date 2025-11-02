"use client"

import { use } from "react"
import Link from "next/link"
import { AppLayout } from "@/components/layout/app-layout"
import { Button } from "@/components/ui/button"

export default function ExpensesList({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return (
    <AppLayout title="支出列表" showBack>
      <div className="space-y-4">
        <p className="text-muted-foreground">稍後顯示支出清單。</p>
        <Link href={`/projects/${id}/expenses/new`}>
          <Button>新增支出</Button>
        </Link>
      </div>
    </AppLayout>
  )
}


