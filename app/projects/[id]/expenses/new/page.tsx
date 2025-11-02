"use client"

import { use } from "react"
import Link from "next/link"
import { AppLayout } from "@/components/layout/app-layout"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function NewExpense({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return (
    <AppLayout title="新增支出" showBack>
      <div className="space-y-4">
        <div>
          <label className="block text-sm mb-1">描述</label>
          <Input placeholder="例如：午餐" />
        </div>
        <div>
          <label className="block text-sm mb-1">金額</label>
          <Input type="number" placeholder="0" />
        </div>
        <div className="flex gap-2">
          <Button className="flex-1">儲存</Button>
          <Link href={`/projects/${id}/expenses`} className="flex-1">
            <Button variant="outline" className="w-full">取消</Button>
          </Link>
        </div>
      </div>
    </AppLayout>
  )
}


