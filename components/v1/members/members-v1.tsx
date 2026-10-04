"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { useLiff } from "@/components/auth/liff-provider"
import { AppLayout } from "@/components/layout/app-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { User, Share2, UserMinus, Check, UserPlus, Trash2, X, CheckSquare, MessageCircle, Link2, MoreHorizontal } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { parseAvatarString, getAvatarIcon, getAvatarColor } from "@/components/avatar-picker"
import { getProjectShareUrl } from "@/lib/utils"
import { AddMemberDialog } from "@/components/members/add-member-dialog"
import { useProjectMembers, type ManagedMember as ProjectMember } from "@/lib/hooks/useProjectMembers"

export function MembersV1({ projectId: id }: { projectId: string }) {
  const { user } = useLiff()
  const { project, loading, removing, addMember, removeMember, batchRemove } = useProjectMembers(id)

  const [showInvite, setShowInvite] = useState(false)
  const [showAddMember, setShowAddMember] = useState(false)
  const [copied, setCopied] = useState(false)
  const [canNativeShare, setCanNativeShare] = useState(false)
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set())
  const [batchMode, setBatchMode] = useState(false)
  const [showBatchDeleteDialog, setShowBatchDeleteDialog] = useState(false)

  useEffect(() => {
    // Unchanged from the original page; the rule only surfaced after the move.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCanNativeShare(typeof navigator !== "undefined" && !!navigator.share)
  }, [])

  async function handleCopyLink() {
    if (!project) return
    const shareUrl = getProjectShareUrl(project.id)
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleShareToLine() {
    if (!project) return
    const shareUrl = getProjectShareUrl(project.id)
    const text = `一起來分帳吧！加入「${project.name}」\n${shareUrl}`
    const lineShareUrl = `https://line.me/R/share?text=${encodeURIComponent(text)}`
    window.open(lineShareUrl, "_blank")
  }

  async function handleNativeShare() {
    if (!project) return
    const shareUrl = getProjectShareUrl(project.id)

    if (navigator.share) {
      try {
        await navigator.share({
          title: `加入「${project.name}」`,
          text: "點擊連結加入旅行專案",
          url: shareUrl,
        })
      } catch {
        // cancelled
      }
    } else {
      handleCopyLink()
    }
  }

  async function handleRemoveMember(memberId: string) {
    if (!confirm("確定要移除這位成員嗎？")) return
    await removeMember(memberId)
  }

  // 批次刪除成員
  async function handleBatchRemove() {
    if (selectedMembers.size === 0) return
    setShowBatchDeleteDialog(false)
    await batchRemove(Array.from(selectedMembers))
    setSelectedMembers(new Set())
    setBatchMode(false)
  }

  // 切換單一成員選擇
  function toggleMemberSelection(memberId: string) {
    setSelectedMembers(prev => {
      const newSet = new Set(prev)
      if (newSet.has(memberId)) {
        newSet.delete(memberId)
      } else {
        newSet.add(memberId)
      }
      return newSet
    })
  }

  // 全選/取消全選（排除自己和建立者）
  function toggleSelectAll(selectableMembers: ProjectMember[]) {
    const selectableIds = selectableMembers.map(m => m.id)
    const allSelected = selectableIds.every(id => selectedMembers.has(id))

    if (allSelected) {
      setSelectedMembers(new Set())
    } else {
      setSelectedMembers(new Set(selectableIds))
    }
  }

  // 退出批次模式
  function exitBatchMode() {
    setBatchMode(false)
    setSelectedMembers(new Set())
  }

  const backHref = `/projects/${id}`

  if (loading) {
    return (
      <AppLayout title="成員" showBack backHref={backHref}>
        <div className="text-center py-8 text-muted-foreground">載入中...</div>
      </AppLayout>
    )
  }

  if (!project) {
    return (
      <AppLayout title="成員" showBack backHref={backHref}>
        <div className="text-center py-8 text-muted-foreground">專案不存在</div>
      </AppLayout>
    )
  }

  const isOwner = project.createdBy === user?.id || project.creator?.id === user?.id
  const shareUrl = getProjectShareUrl(project.id)

  // 可選擇的成員（排除自己）
  const selectableMembers = project.members.filter(
    member => member.user?.id !== user?.id
  )

  return (
    <AppLayout title="成員管理" showBack backHref={backHref}>
      <div className="space-y-4 pb-20">
        {/* 操作列 */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{project.members.length} 位成員</h3>
          <div className="flex gap-2">
            {isOwner && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => batchMode ? exitBatchMode() : setBatchMode(true)}
                title={batchMode ? "取消批次" : "批次管理"}
              >
                {batchMode ? <X className="h-4 w-4" /> : <CheckSquare className="h-4 w-4" />}
              </Button>
            )}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowInvite(true)}
              title="邀請成員"
            >
              <Share2 className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowAddMember(true)}
              title="手動新增"
            >
              <UserPlus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* 批次操作列 */}
        {batchMode && (
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl border border-border">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={selectableMembers.length > 0 && selectableMembers.every(m => selectedMembers.has(m.id))}
                onCheckedChange={() => toggleSelectAll(selectableMembers)}
              />
              <span className="text-sm font-medium">全選</span>
            </label>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowBatchDeleteDialog(true)}
              disabled={selectedMembers.size === 0 || removing === "batch"}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              移除 {selectedMembers.size > 0 ? `(${selectedMembers.size})` : ""}
            </Button>
          </div>
        )}

        {/* 成員列表 */}
        <Card>
          <CardContent className="p-0 divide-y">
            {project.members.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                尚無成員
              </div>
            ) : project.members.map((member) => {
                const isUnclaimed = !member.userId
                const isCurrentUser = member.user?.id === user?.id
                const avatarData = parseAvatarString(member.user?.image)
                const isCustomAvatar = avatarData !== null
                const hasExternalImage = member.user?.image && !member.user.image.startsWith("avatar:")
                const canSelect = !isCurrentUser // 不能選擇自己

                return (
                  <div
                    key={member.id}
                    className={`flex items-center gap-3 p-4 ${batchMode && selectedMembers.has(member.id) ? 'bg-destructive/5' : ''} ${batchMode && canSelect ? 'cursor-pointer active:bg-muted/50' : ''}`}
                    onClick={() => {
                      if (batchMode && canSelect) {
                        toggleMemberSelection(member.id)
                      }
                    }}
                  >
                    {/* 批次模式 checkbox */}
                    {batchMode && (
                      <div onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedMembers.has(member.id)}
                          onCheckedChange={() => toggleMemberSelection(member.id)}
                          disabled={!canSelect}
                          className={!canSelect ? "opacity-30" : ""}
                        />
                      </div>
                    )}
                    {isCustomAvatar ? (
                      <div
                        className="h-10 w-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: getAvatarColor(avatarData.colorId) }}
                      >
                        {(() => {
                          const Icon = getAvatarIcon(avatarData.iconId)
                          return <Icon className="size-5 text-white" />
                        })()}
                      </div>
                    ) : (
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center overflow-hidden ${isUnclaimed ? 'bg-slate-100 dark:bg-slate-800' : 'bg-brand-100 dark:bg-brand-900'}`}>
                        {hasExternalImage ? (
                          <Image
                            src={member.user!.image!}
                            alt=""
                            width={40}
                            height={40}
                            className="rounded-full object-cover"
                          />
                        ) : (
                          <User className={`h-5 w-5 ${isUnclaimed ? 'text-slate-400 dark:text-slate-500' : 'text-brand-600 dark:text-brand-400'}`} />
                        )}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {member.displayName}
                        {member.role === "owner" && (
                          <span className="ml-2 text-xs bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300 px-1.5 py-0.5 rounded">
                            建立者
                          </span>
                        )}
                        {isCurrentUser && (
                          <span className="ml-2 text-xs bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400 px-1.5 py-0.5 rounded border border-brand-200 dark:border-brand-800">
                            你
                          </span>
                        )}
                        {isUnclaimed && (
                          <span className="ml-2 text-xs bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 px-1.5 py-0.5 rounded">
                            佔位成員
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground truncate">
                        {member.user?.email || ''}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {isOwner && !isCurrentUser && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleRemoveMember(member.id)}
                          disabled={removing === member.id}
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
      </div>

      {/* 邀請對話框 */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>邀請成員加入</DialogTitle>
            <DialogDescription>
              選擇分享方式邀請朋友加入專案
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* 平台分享按鈕 */}
            <div className={`grid gap-3 ${canNativeShare ? "grid-cols-3" : "grid-cols-2"}`}>
              <button
                onClick={handleShareToLine}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="h-12 w-12 rounded-full bg-[#06C755] flex items-center justify-center">
                  <MessageCircle className="h-6 w-6 text-white" />
                </div>
                <span className="text-sm font-medium">LINE</span>
              </button>

              <button
                onClick={handleCopyLink}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="h-12 w-12 rounded-full bg-slate-500 flex items-center justify-center">
                  {copied ? <Check className="h-6 w-6 text-white" /> : <Link2 className="h-6 w-6 text-white" />}
                </div>
                <span className="text-sm font-medium">{copied ? "已複製" : "複製連結"}</span>
              </button>

              {canNativeShare && (
                <button
                  onClick={handleNativeShare}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="h-12 w-12 rounded-full bg-blue-500 flex items-center justify-center">
                    <MoreHorizontal className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-sm font-medium">更多</span>
                </button>
              )}
            </div>

            {/* 連結預覽 */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">分享連結</p>
              <p className="text-sm text-slate-700 dark:text-slate-300 break-all">{shareUrl}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 新增成員對話框 */}
      <AddMemberDialog open={showAddMember} onOpenChange={setShowAddMember} onAdd={addMember} />

      {/* 批次刪除確認對話框 */}
      <Dialog open={showBatchDeleteDialog} onOpenChange={setShowBatchDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>確認批量移除</DialogTitle>
            <DialogDescription>
              確定要移除選取的 {selectedMembers.size} 位成員嗎？此操作無法復原。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowBatchDeleteDialog(false)}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleBatchRemove}
              disabled={removing === "batch"}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              {removing === "batch" ? "移除中..." : `移除 (${selectedMembers.size})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </AppLayout>
  )
}
