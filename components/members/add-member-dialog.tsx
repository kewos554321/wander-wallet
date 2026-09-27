"use client"

import { useState } from "react"
import type { FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface AddMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (name: string) => Promise<string | null>
}

export function AddMemberDialog({ open, onOpenChange, onAdd }: AddMemberDialogProps) {
  const [newMemberName, setNewMemberName] = useState("")
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState("")

  async function handleAddMember(e: FormEvent) {
    e.preventDefault()
    if (!newMemberName.trim()) return
    setAdding(true)
    setAddError("")
    const error = await onAdd(newMemberName)
    setAdding(false)
    if (error) {
      setAddError(error)
      return
    }
    setNewMemberName("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open)
      if (!open) {
        setNewMemberName("")
        setAddError("")
      }
    }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新增成員</DialogTitle>
          <DialogDescription>
            建立佔位成員，可用於記錄尚未加入或不使用 App 的旅伴支出
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleAddMember} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">名稱</label>
            <Input
              type="text"
              placeholder="例：小明（最多15字）"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              maxLength={15}
              disabled={adding}
            />
            {addError && (
              <p className="text-sm text-destructive mt-1">{addError}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={adding}
            >
              取消
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={adding || !newMemberName.trim()}
            >
              {adding ? "新增中..." : "新增成員"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
