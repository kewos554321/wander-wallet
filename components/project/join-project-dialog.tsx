"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { JoinInfo } from "@/lib/project-overview"

// Re-exported so existing imports of JoinInfo from this file keep working.
export type { JoinInfo }

interface JoinProjectDialogProps {
  info: JoinInfo
  joining: boolean
  onJoin: () => void
  onClaim: (memberId: string) => void
  onCancel: () => void
}

export function JoinProjectDialog({ info, joining, onJoin, onClaim, onCancel }: JoinProjectDialogProps) {
  const [selectedMemberToClaim, setSelectedMemberToClaim] = useState<string | null>(null)
  const { joinMode, unclaimedMembers } = info
  const canCreate = joinMode === "both" || joinMode === "create_only"
  const canClaim = (joinMode === "both" || joinMode === "claim_only") && unclaimedMembers.length > 0

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>加入「{info.name}」</DialogTitle>
          <DialogDescription>
            {joinMode === "claim_only"
              ? "請選擇你要認領的佔位成員"
              : joinMode === "create_only"
              ? "你將以新成員身份加入此專案"
              : "選擇加入方式"}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          {canClaim && (
            <div>
              <p className="text-sm font-medium mb-2">認領現有成員</p>
              <p className="text-xs text-muted-foreground mb-3">
                如果專案創建者已經幫你新增了佔位成員，請選擇你的名字
              </p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {unclaimedMembers.map((member) => (
                  <label
                    key={member.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                      selectedMemberToClaim === member.id
                        ? "border-primary bg-primary/5"
                        : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                    }`}
                  >
                    <input
                      type="radio"
                      name="claimMember"
                      value={member.id}
                      checked={selectedMemberToClaim === member.id}
                      onChange={() => setSelectedMemberToClaim(member.id)}
                      className="accent-primary"
                    />
                    <span className="text-sm font-medium">{member.displayName}</span>
                  </label>
                ))}
              </div>
              {selectedMemberToClaim && (
                <Button onClick={() => onClaim(selectedMemberToClaim)} disabled={joining} className="w-full mt-3">
                  {joining ? "認領中..." : "確認認領"}
                </Button>
              )}
            </div>
          )}

          {canCreate && canClaim && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200 dark:border-slate-700" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-background px-2 text-muted-foreground">或</span>
              </div>
            </div>
          )}

          {canCreate && (
            <div>
              {canClaim && <p className="text-sm font-medium mb-2">建立新成員</p>}
              <p className="text-xs text-muted-foreground mb-3">
                以新成員身份加入，可查看支出記錄、新增支出並參與分帳
              </p>
              <Button
                onClick={onJoin}
                disabled={joining}
                variant={canClaim ? "outline" : "default"}
                className="w-full"
              >
                {joining ? "加入中..." : "以新成員加入"}
              </Button>
            </div>
          )}

          {!canCreate && !canClaim && (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">
                此專案目前沒有可認領的佔位成員，請聯繫專案創建者
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={joining} className="w-full">
            取消
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
