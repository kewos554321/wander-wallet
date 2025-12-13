"use client"

import { use, useEffect, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
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
import { User, Copy, Share2, UserMinus, Check, QrCode } from "lucide-react"

interface ProjectMember {
  id: string
  role: string
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
  }
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
  const { data: session } = useSession()
  const { id } = use(params)

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [copied, setCopied] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)

  useEffect(() => {
    fetchProject()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function fetchProject() {
    try {
      const res = await fetch(`/api/projects/${id}`)
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

  async function handleRemoveMember(userId: string) {
    if (!confirm("確定要移除這位成員嗎？")) return

    setRemoving(userId)
    try {
      const res = await fetch(`/api/projects/${id}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
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

  const isOwner = project.creator?.id === session?.user?.id
  const shareUrl = `${window.location.origin}/projects/join?code=${project.shareCode}`

  return (
    <AppLayout title="成員管理" showBack>
      <div className="space-y-4 pb-20">
        {/* 邀請區塊 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">邀請成員</h3>
              <Button size="sm" onClick={() => setShowInvite(true)}>
                <Share2 className="h-4 w-4 mr-1" />
                邀請
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              分享連結或分享碼給朋友，讓他們加入這個專案
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
              {project.members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-4"
                >
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                    {member.user.image ? (
                      <Image
                        src={member.user.image}
                        alt=""
                        width={40}
                        height={40}
                        className="rounded-full object-cover"
                      />
                    ) : (
                      <User className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {member.user.name || member.user.email?.split("@")[0]}
                      {member.role === "owner" && (
                        <span className="ml-2 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                          建立者
                        </span>
                      )}
                      {member.user.id === session?.user?.id && (
                        <span className="ml-2 text-xs bg-secondary px-1.5 py-0.5 rounded">
                          你
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground truncate">
                      {member.user.email}
                    </div>
                  </div>
                  {isOwner && member.user.id !== session?.user?.id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleRemoveMember(member.user.id)}
                      disabled={removing === member.user.id}
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
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
    </AppLayout>
  )
}
