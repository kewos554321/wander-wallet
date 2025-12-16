"use client"

import { use, useEffect, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useLiff, useAuthFetch } from "@/components/auth/liff-provider"
import { AppLayout } from "@/components/layout/app-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { User, Copy, Share2, UserMinus, Check, UserPlus } from "lucide-react"
import { parseAvatarString, getAvatarIcon, getAvatarColor } from "@/components/avatar-picker"

interface ProjectMember {
  id: string
  userId: string | null
  role: string
  displayName: string
  claimedAt: string | null
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
  } | null
}

interface Project {
  id: string
  name: string
  shareCode: string
  creator: {
    id: string
    name: string | null
    email: string
  }
  members: ProjectMember[]
}

export default function MembersPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { user } = useLiff()
  const authFetch = useAuthFetch()
  const { id } = use(params)

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [showAddMember, setShowAddMember] = useState(false)
  const [copied, setCopied] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const [newMemberName, setNewMemberName] = useState("")
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState("")
  const [claiming, setClaiming] = useState<string | null>(null)

  useEffect(() => {
    fetchProject()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function fetchProject() {
    try {
      const res = await authFetch(`/api/projects/${id}`)
      if (res.ok) {
        const data = await res.json()
        setProject(data)
      } else {
        router.push("/projects")
      }
    } catch {
      console.error("獲取專案錯誤")
    } finally {
      setLoading(false)
    }
  }

  async function handleCopyLink() {
    if (!project) return
    const shareUrl = `${window.location.origin}/projects/join?code=${project.shareCode}`
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleCopyCode() {
    if (!project) return
    await navigator.clipboard.writeText(project.shareCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleShare() {
    if (!project) return
    const shareUrl = `${window.location.origin}/projects/join?code=${project.shareCode}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: `加入「${project.name}」`,
          text: `使用分享碼 ${project.shareCode} 加入旅行專案`,
          url: shareUrl,
        })
      } catch {
        // cancelled
      }
    } else {
      handleCopyLink()
    }
  }

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault()
    if (!newMemberName.trim()) return

    setAdding(true)
    setAddError("")
    try {
      const res = await authFetch(`/api/projects/${id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newMemberName.trim() }),
      })

      if (res.ok) {
        setNewMemberName("")
        setShowAddMember(false)
        fetchProject()
      } else {
        const data = await res.json()
        setAddError(data.error || "新增失敗")
      }
    } catch {
      setAddError("新增失敗")
    } finally {
      setAdding(false)
    }
  }

  async function handleRemoveMember(memberId: string) {
    if (!confirm("確定要移除這位成員嗎？")) return

    setRemoving(memberId)
    try {
      const res = await authFetch(`/api/projects/${id}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId }),
      })

      if (res.ok) {
        fetchProject()
      } else {
        const data = await res.json()
        alert(data.error || "移除失敗")
      }
    } catch {
      alert("移除失敗")
    } finally {
      setRemoving(null)
    }
  }

  async function handleClaimMember(memberId: string) {
    if (!confirm("確定要認領這個身份嗎？認領後此成員的所有費用記錄將與你的帳號關聯。")) return

    setClaiming(memberId)
    try {
      const res = await authFetch(`/api/projects/${id}/members/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId }),
      })

      if (res.ok) {
        fetchProject()
      } else {
        const data = await res.json()
        alert(data.error || "認領失敗")
      }
    } catch {
      alert("認領失敗")
    } finally {
      setClaiming(null)
    }
  }

  if (loading) {
    return (
      <AppLayout title="成員" showBack>
        <div className="text-center py-8 text-muted-foreground">載入中...</div>
      </AppLayout>
    )
  }

  if (!project) {
    return (
      <AppLayout title="成員" showBack>
        <div className="text-center py-8 text-muted-foreground">專案不存在</div>
      </AppLayout>
    )
  }

  const isOwner = project.creator?.id === user?.id
  const shareUrl = `${window.location.origin}/projects/join?code=${project.shareCode}`

  return (
    <AppLayout title="成員管理" showBack>
      <div className="space-y-4 pb-20">
        {/* 新增成員區塊 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">新增成員</h3>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setShowInvite(true)}>
                  <Share2 className="h-4 w-4 mr-1" />
                  分享
                </Button>
                <Button size="sm" onClick={() => setShowAddMember(true)}>
                  <UserPlus className="h-4 w-4 mr-1" />
                  新增
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              直接輸入 Email 新增成員，或分享連結邀請朋友加入
            </p>
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 bg-secondary rounded-lg px-3 py-2">
                <span className="text-sm font-mono">{project.shareCode}</span>
              </div>
              <Button variant="outline" size="sm" onClick={handleCopyCode}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 成員列表 */}
        <div>
          <h3 className="font-semibold mb-3">{project.members.length} 位成員</h3>
          <Card>
            <CardContent className="p-0 divide-y">
              {project.members.map((member) => {
                const isUnclaimed = !member.userId
                const isCurrentUser = member.user?.id === user?.id
                const canClaim = isUnclaimed && !project.members.some(m => m.user?.id === user?.id)
                const avatarData = parseAvatarString(member.user?.image)
                const isCustomAvatar = avatarData !== null
                const hasExternalImage = member.user?.image && !member.user.image.startsWith("avatar:")

                return (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-4"
                  >
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
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center overflow-hidden ${isUnclaimed ? 'bg-muted' : 'bg-primary/10'}`}>
                        {hasExternalImage ? (
                          <Image
                            src={member.user!.image!}
                            alt=""
                            width={40}
                            height={40}
                            className="rounded-full object-cover"
                          />
                        ) : (
                          <User className={`h-5 w-5 ${isUnclaimed ? 'text-muted-foreground' : 'text-primary'}`} />
                        )}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {member.displayName}
                        {member.role === "owner" && (
                          <span className="ml-2 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                            建立者
                          </span>
                        )}
                        {isCurrentUser && (
                          <span className="ml-2 text-xs bg-secondary px-1.5 py-0.5 rounded">
                            你
                          </span>
                        )}
                        {isUnclaimed && (
                          <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                            未認領
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground truncate">
                        {member.user?.email || '等待認領...'}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {canClaim && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleClaimMember(member.id)}
                          disabled={claiming === member.id}
                        >
                          {claiming === member.id ? "認領中..." : "認領"}
                        </Button>
                      )}
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
      </div>

      {/* 邀請對話框 */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>邀請成員加入</DialogTitle>
            <DialogDescription>
              分享以下連結或分享碼給你的朋友
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* 分享碼 */}
            <div>
              <label className="text-sm font-medium mb-2 block">分享碼</label>
              <div className="flex gap-2">
                <div className="flex-1 bg-secondary rounded-lg px-4 py-3 text-center">
                  <span className="text-2xl font-mono font-bold tracking-wider">
                    {project.shareCode}
                  </span>
                </div>
                <Button variant="outline" onClick={handleCopyCode}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* 分享連結 */}
            <div>
              <label className="text-sm font-medium mb-2 block">分享連結</label>
              <div className="flex gap-2">
                <Input
                  value={shareUrl}
                  readOnly
                  className="text-sm"
                />
                <Button variant="outline" onClick={handleCopyLink}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* 分享按鈕 */}
            <Button className="w-full" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" />
              分享給朋友
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 新增成員對話框 */}
      <Dialog open={showAddMember} onOpenChange={(open) => {
        setShowAddMember(open)
        if (!open) {
          setNewMemberName("")
          setAddError("")
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增成員</DialogTitle>
            <DialogDescription>
              輸入成員名稱，之後他們可以透過分享連結加入並認領身份
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddMember} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">名稱</label>
              <Input
                type="text"
                placeholder="例：小明"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
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
                onClick={() => setShowAddMember(false)}
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
    </AppLayout>
  )
}
