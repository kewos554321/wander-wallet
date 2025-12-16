"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { AppLayout } from "@/components/layout/app-layout"
import { useAuthFetch } from "@/components/auth/liff-provider"
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
import { Checkbox } from "@/components/ui/checkbox"
import { parseAvatarString, getAvatarIcon, getAvatarColor } from "@/components/avatar-picker"

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

interface ExpenseParticipant {
  id: string
  shareAmount: number
  member: {
    id: string
    displayName: string
    userId: string | null
    user: {
      id: string
      name: string | null
      email: string
      image: string | null
    } | null
  }
}

interface Expense {
  id: string
  amount: number
  description: string | null
  category: string | null
  paidByMemberId: string
  payer: {
    id: string
    displayName: string
    user: {
      id: string
      name: string | null
      email: string
      image: string | null
    } | null
  }
  participants: ExpenseParticipant[]
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

export default function EditExpense({ params }: { params: Promise<{ id: string; expenseId: string }> }) {
  const router = useRouter()
  const { id, expenseId } = use(params)
  const authFetch = useAuthFetch()

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

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, expenseId])

  async function fetchData() {
    try {
      // 同時獲取支出詳情和成員列表
      const [expenseRes, membersRes] = await Promise.all([
        authFetch(`/api/projects/${id}/expenses/${expenseId}`),
        authFetch(`/api/projects/${id}/members`),
      ])

      if (membersRes.ok) {
        const membersData = await membersRes.json()
        setMembers(membersData)
      }

      if (expenseRes.ok) {
        const expense: Expense = await expenseRes.json()

        // 填充表單數據
        setDescription(expense.description || "")
        setAmount(String(expense.amount))
        setCategory(expense.category || "")
        setPaidBy(expense.payer.id)

        // 設置參與者
        const participantIds = new Set<string>(expense.participants.map(p => p.member.id))
        setSelectedParticipants(participantIds)

        // 檢查是否為均分
        const shares = expense.participants.map(p => p.shareAmount)
        const allEqual = shares.every(s => Math.abs(s - shares[0]) < 0.01)

        if (allEqual && shares.length > 0) {
          const expectedShare = Number(expense.amount) / shares.length
          if (Math.abs(shares[0] - expectedShare) < 0.01) {
            setSplitMode("equal")
          } else {
            setSplitMode("custom")
            const customSharesMap: Record<string, string> = {}
            expense.participants.forEach(p => {
              customSharesMap[p.member.id] = String(p.shareAmount)
            })
            setCustomShares(customSharesMap)
          }
        } else {
          setSplitMode("custom")
          const customSharesMap: Record<string, string> = {}
          expense.participants.forEach(p => {
            customSharesMap[p.member.id] = String(p.shareAmount)
          })
          setCustomShares(customSharesMap)
        }
      } else {
        alert("無法載入支出資料")
        router.push(`/projects/${id}/expenses`)
      }
    } catch (error) {
      console.error("獲取資料錯誤:", error)
      alert("載入失敗")
      router.push(`/projects/${id}/expenses`)
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
      const res = await authFetch(`/api/projects/${id}/expenses/${expenseId}`, {
        method: "PUT",
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
        router.push(`/projects/${id}/expenses`)
      } else {
        const data = await res.json()
        alert(data.error || "更新失敗")
      }
    } catch (error) {
      console.error("更新支出錯誤:", error)
      alert("更新失敗")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <AppLayout title="編輯支出" showBack>
        <div className="text-center py-8 text-muted-foreground">載入中...</div>
      </AppLayout>
    )
  }

  const amountNum = Number(amount) || 0
  const sharePerPerson = selectedParticipants.size > 0 ? amountNum / selectedParticipants.size : 0

  return (
    <AppLayout title="編輯支出" showBack>
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
            {submitting ? "儲存中..." : "儲存變更"}
          </Button>
          <Link href={`/projects/${id}/expenses`} className="flex-1">
            <Button type="button" variant="outline" className="w-full">
              取消
            </Button>
          </Link>
        </div>
      </form>
    </AppLayout>
  )
}
