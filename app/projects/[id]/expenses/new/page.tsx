"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { AppLayout } from "@/components/layout/app-layout"
import { useAuthFetch, useLiff } from "@/components/auth/liff-provider"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { parseAvatarString, getAvatarIcon, getAvatarColor } from "@/components/avatar-picker"
import { shareExpenseToLine, isShareTargetPickerAvailable } from "@/lib/liff"
import { Send, Check } from "lucide-react"

interface Member {
  id: string
  role: string
  displayName: string
  userId: string | null
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
  } | null
}

interface ParticipantShare {
  memberId: string
  shareAmount: number
}

const CATEGORIES = [
  { value: "food", label: "餐飲" },
  { value: "transport", label: "交通" },
  { value: "accommodation", label: "住宿" },
  { value: "entertainment", label: "娛樂" },
  { value: "shopping", label: "購物" },
  { value: "other", label: "其他" },
]

interface CreatedExpense {
  projectName: string
  payerName: string
  amount: number
  description?: string
  category?: string
  participantCount: number
}

export default function NewExpense({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id } = use(params)
  const authFetch = useAuthFetch()
  const { isDevMode } = useLiff()

  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [category, setCategory] = useState("")
  const [paidBy, setPaidBy] = useState("")
  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(new Set())
  const [splitMode, setSplitMode] = useState<"equal" | "custom">("equal")
  const [customShares, setCustomShares] = useState<Record<string, string>>({})

  // 分享相關狀態
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [createdExpense, setCreatedExpense] = useState<CreatedExpense | null>(null)
  const [sharing, setSharing] = useState(false)
  const [projectName, setProjectName] = useState("")

  useEffect(() => {
    fetchProjectAndMembers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function fetchProjectAndMembers() {
    try {
      // 同時獲取專案和成員資料
      const [projectRes, membersRes] = await Promise.all([
        authFetch(`/api/projects/${id}`),
        authFetch(`/api/projects/${id}/members`),
      ])

      if (projectRes.ok) {
        const projectData = await projectRes.json()
        setProjectName(projectData.name)
      }

      if (membersRes.ok) {
        const data = await membersRes.json()
        // 取得所有成員（包含未認領的）
        setMembers(data)
        // 預設選取所有成員為參與者
        const allMemberIds = new Set<string>(data.map((m: Member) => m.id))
        setSelectedParticipants(allMemberIds)
        // 預設付款人為第一位成員
        if (data.length > 0) {
          setPaidBy(data[0].id)
        }
      }
    } catch (error) {
      console.error("獲取資料錯誤:", error)
    } finally {
      setLoading(false)
    }
  }

  function toggleParticipant(memberId: string) {
    const newSelected = new Set(selectedParticipants)
    if (newSelected.has(memberId)) {
      newSelected.delete(memberId)
    } else {
      newSelected.add(memberId)
    }
    setSelectedParticipants(newSelected)
  }

  function selectAllParticipants() {
    const allMemberIds = new Set(members.map((m) => m.id))
    setSelectedParticipants(allMemberIds)
  }

  function calculateShares(): ParticipantShare[] {
    const amountNum = Number(amount) || 0
    const participantCount = selectedParticipants.size

    if (participantCount === 0) return []

    if (splitMode === "equal") {
      const sharePerPerson = Math.round((amountNum / participantCount) * 100) / 100
      const shares = Array.from(selectedParticipants).map((memberId) => ({
        memberId,
        shareAmount: sharePerPerson,
      }))
      // 處理尾差
      const totalShare = shares.reduce((sum, s) => sum + s.shareAmount, 0)
      const diff = Math.round((amountNum - totalShare) * 100) / 100
      if (diff !== 0 && shares.length > 0) {
        shares[0].shareAmount = Math.round((shares[0].shareAmount + diff) * 100) / 100
      }
      return shares
    } else {
      return Array.from(selectedParticipants).map((memberId) => ({
        memberId,
        shareAmount: Number(customShares[memberId]) || 0,
      }))
    }
  }

  function getCustomSharesTotal(): number {
    return Array.from(selectedParticipants).reduce(
      (sum, memberId) => sum + (Number(customShares[memberId]) || 0),
      0
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const amountNum = Number(amount)
    if (!amountNum || amountNum <= 0) {
      alert("請輸入有效金額")
      return
    }

    if (!paidBy) {
      alert("請選擇付款人")
      return
    }

    if (selectedParticipants.size === 0) {
      alert("請選擇至少一位分擔者")
      return
    }

    const participants = calculateShares()
    const totalShare = participants.reduce((sum, p) => sum + p.shareAmount, 0)

    if (Math.abs(totalShare - amountNum) > 0.01) {
      alert(`分擔總額 ($${totalShare.toFixed(2)}) 與支出金額 ($${amountNum.toFixed(2)}) 不符`)
      return
    }

    setSubmitting(true)
    try {
      const res = await authFetch(`/api/projects/${id}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paidByMemberId: paidBy,
          amount: amountNum,
          description: description.trim() || null,
          category: category || null,
          participants,
        }),
      })

      if (res.ok) {
        // 取得付款人名稱
        const payerMember = members.find((m) => m.id === paidBy)
        const payerName = payerMember?.displayName || "未知"

        // 檢查是否可以分享（在 LINE App 內且非開發模式）
        const canShare = !isDevMode && isShareTargetPickerAvailable()

        if (canShare) {
          // 顯示分享對話框
          setCreatedExpense({
            projectName,
            payerName,
            amount: amountNum,
            description: description.trim() || undefined,
            category: category || undefined,
            participantCount: participants.length,
          })
          setShowShareDialog(true)
        } else {
          // 直接跳轉
          router.push(`/projects/${id}/expenses`)
        }
      } else {
        const data = await res.json()
        alert(data.error || "新增失敗")
      }
    } catch (error) {
      console.error("新增支出錯誤:", error)
      alert("新增失敗")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleShareToLine() {
    if (!createdExpense) return

    setSharing(true)
    try {
      await shareExpenseToLine({
        ...createdExpense,
        projectId: id,
      })
    } catch (error) {
      console.error("分享失敗:", error)
    } finally {
      setSharing(false)
      router.push(`/projects/${id}/expenses`)
    }
  }

  function handleSkipShare() {
    setShowShareDialog(false)
    router.push(`/projects/${id}/expenses`)
  }

  if (loading) {
    return (
      <AppLayout title="新增支出" showBack>
        <div className="text-center py-8 text-muted-foreground">載入中...</div>
      </AppLayout>
    )
  }

  const amountNum = Number(amount) || 0
  const sharePerPerson = selectedParticipants.size > 0 ? amountNum / selectedParticipants.size : 0

  return (
    <AppLayout title="新增支出" showBack>
      <form onSubmit={handleSubmit} className="space-y-6 pb-20">
        {/* 金額 */}
        <div>
          <label className="block text-sm font-medium mb-2">金額 *</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-medium">$</span>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="pl-8 text-2xl h-14 font-bold"
              required
            />
          </div>
        </div>

        {/* 描述 */}
        <div>
          <label className="block text-sm font-medium mb-2">描述</label>
          <Input
            placeholder="例如：午餐、計程車費"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* 類別 */}
        <div>
          <label className="block text-sm font-medium mb-2">類別</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setCategory(category === cat.value ? "" : cat.value)}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  category === cat.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary hover:bg-secondary/80"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* 付款人 */}
        <div>
          <label className="block text-sm font-medium mb-2">誰付的錢？ *</label>
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              沒有成員，請先新增成員
            </p>
          ) : (
            <Select value={paidBy} onValueChange={setPaidBy}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="選擇付款人" />
              </SelectTrigger>
              <SelectContent>
                {members.map((member) => {
                  const avatarData = parseAvatarString(member.user?.image)
                  const hasExternalImage = member.user?.image && !member.user.image.startsWith("avatar:")
                  return (
                    <SelectItem key={member.id} value={member.id}>
                      <div className="flex items-center gap-2">
                        {avatarData ? (
                          <div
                            className="h-6 w-6 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: getAvatarColor(avatarData.colorId) }}
                          >
                            {(() => { const Icon = getAvatarIcon(avatarData.iconId); return <Icon className="h-3 w-3 text-white" /> })()}
                          </div>
                        ) : (
                          <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden">
                            {hasExternalImage ? (
                              <Image
                                src={member.user!.image!}
                                alt={member.displayName}
                                width={24}
                                height={24}
                                className="rounded-full object-cover"
                              />
                            ) : (
                              <span className="text-xs font-medium text-slate-500">
                                {member.displayName.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                        )}
                        <span>{member.displayName}</span>
                        {!member.userId && <span className="text-xs text-muted-foreground">(未認領)</span>}
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* 分擔者 */}
        <div>
          <label className="block text-sm font-medium mb-2">幫誰付？ *</label>
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              沒有成員，請先新增成員
            </p>
          ) : (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-0 divide-y divide-slate-100">
                {/* 全選選項 */}
                <label className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedParticipants.size === members.length}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          selectAllParticipants()
                        } else {
                          setSelectedParticipants(new Set())
                        }
                      }}
                    />
                    <span className="font-medium">全部成員</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {selectedParticipants.size}/{members.length} 人
                  </span>
                </label>

                {/* 成員列表 */}
                {members.map((member) => {
                  const isSelected = selectedParticipants.has(member.id)
                  const avatarData = parseAvatarString(member.user?.image)
                  const hasExternalImage = member.user?.image && !member.user.image.startsWith("avatar:")
                  return (
                    <label
                      key={member.id}
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleParticipant(member.id)}
                        />
                        {avatarData ? (
                          <div
                            className="h-8 w-8 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: getAvatarColor(avatarData.colorId) }}
                          >
                            {(() => { const Icon = getAvatarIcon(avatarData.iconId); return <Icon className="h-4 w-4 text-white" /> })()}
                          </div>
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden">
                            {hasExternalImage ? (
                              <Image
                                src={member.user!.image!}
                                alt={member.displayName}
                                width={32}
                                height={32}
                                className="rounded-full object-cover"
                              />
                            ) : (
                              <span className="text-sm font-medium text-slate-500">
                                {member.displayName.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{member.displayName}</span>
                          {!member.userId && <span className="text-xs text-muted-foreground">(未認領)</span>}
                        </div>
                      </div>
                      {isSelected && splitMode === "equal" && amountNum > 0 && (
                        <span className="text-sm text-muted-foreground tabular-nums">
                          ${sharePerPerson.toFixed(2)}
                        </span>
                      )}
                      {isSelected && splitMode === "custom" && (
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0"
                          value={customShares[member.id] || ""}
                          onChange={(e) => {
                            e.stopPropagation()
                            setCustomShares({
                              ...customShares,
                              [member.id]: e.target.value,
                            })
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-24 h-8 text-right"
                        />
                      )}
                    </label>
                  )
                })}
              </CardContent>
            </Card>
          )}
        </div>

        {/* 分擔方式 */}
        <div>
          <label className="block text-sm font-medium mb-2">分擔方式</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSplitMode("equal")}
              className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
                splitMode === "equal"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary hover:bg-secondary/80"
              }`}
            >
              均分
            </button>
            <button
              type="button"
              onClick={() => setSplitMode("custom")}
              className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
                splitMode === "custom"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary hover:bg-secondary/80"
              }`}
            >
              自訂金額
            </button>
          </div>
          {splitMode === "custom" && amountNum > 0 && (
            <div className="mt-2 text-sm">
              <span className={getCustomSharesTotal() === amountNum ? "text-green-600" : "text-red-600"}>
                已分配: ${getCustomSharesTotal().toFixed(2)} / ${amountNum.toFixed(2)}
              </span>
            </div>
          )}
        </div>

        {/* 按鈕 */}
        <div className="flex gap-2">
          <Button type="submit" className="flex-1" disabled={submitting}>
            {submitting ? "儲存中..." : "儲存"}
          </Button>
          <Link href={`/projects/${id}/expenses`} className="flex-1">
            <Button type="button" variant="outline" className="w-full">
              取消
            </Button>
          </Link>
        </div>
      </form>

      {/* 分享到 LINE 對話框 */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              新增成功
            </DialogTitle>
            <DialogDescription>
              要分享這筆消費到 LINE 群組嗎？
            </DialogDescription>
          </DialogHeader>
          {createdExpense && (
            <div className="bg-muted rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">付款人</span>
                <span>{createdExpense.payerName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">金額</span>
                <span className="font-bold">
                  {new Intl.NumberFormat("zh-TW", {
                    style: "currency",
                    currency: "TWD",
                    minimumFractionDigits: 0,
                  }).format(createdExpense.amount)}
                </span>
              </div>
              {createdExpense.description && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">備註</span>
                  <span>{createdExpense.description}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">分攤人數</span>
                <span>{createdExpense.participantCount} 人</span>
              </div>
            </div>
          )}
          <div className="flex gap-2 mt-4">
            <Button
              onClick={handleShareToLine}
              disabled={sharing}
              className="flex-1"
            >
              <Send className="h-4 w-4 mr-2" />
              {sharing ? "分享中..." : "分享到 LINE"}
            </Button>
            <Button
              variant="outline"
              onClick={handleSkipShare}
              disabled={sharing}
              className="flex-1"
            >
              略過
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}


