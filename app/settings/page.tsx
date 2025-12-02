"use client"

import { useState } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { signOut } from "next-auth/react"
import { LogOut } from "lucide-react"

export default function SettingsPage() {
  const [open, setOpen] = useState(false)

  async function handleLogout() {
    await signOut({ 
      redirect: true, 
      callbackUrl: "/login" 
    })
  }

  return (
    <AppLayout title="設定">
      <div className="space-y-4">
        <p className="text-muted-foreground">這裡放應用程式偏好與主題設定。</p>
        
        <div className="pt-4 border-t">
          <Button
            variant="destructive"
            onClick={() => setOpen(true)}
            className="w-full sm:w-auto"
          >
            <LogOut className="size-4" />
            登出
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>確認登出</DialogTitle>
            <DialogDescription>
              確定要登出嗎？登出後需要重新登入才能使用應用程式。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleLogout}
            >
              確認登出
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}


