"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { AppLayout } from "@/components/layout/app-layout"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Check, User } from "lucide-react"

interface Member {
  id: string
  role: string
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
  }
}

interface ParticipantShare {
  userId: string
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

export default function NewExpense({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id } = use(params)

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
    fetchMembers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function fetchMembers() {
    try {
      const res = await fetch(`/api/projects/${id}/members`)
      if (res.ok) {
        const data = await res.json()
        setMembers(data)
        // 預設選取所有成員為參與者
        const allUserIds = new Set<string>(data.map((m: Member) => m.user.id))
        setSelectedParticipants(allUserIds)
        // 預設付款人為第一位成員
        if (data.length > 0) {
          setPaidBy(data[0].user.id)
        }
      }
    } catch (error) {
      console.error("獲取成員列表錯誤:", error)
    } finally {
      setLoading(false)
    }
  }

  function toggleParticipant(userId: string) {
    const newSelected = new Set(selectedParticipants)
    if (newSelected.has(userId)) {
      newSelected.delete(userId)
    } else {
      newSelected.add(userId)
    }
    setSelectedParticipants(newSelected)
  }

  function selectAllParticipants() {
    const allUserIds = new Set(members.map((m) => m.user.id))
    setSelectedParticipants(allUserIds)
  }

  function calculateShares(): ParticipantShare[] {
    const amountNum = Number(amount) || 0
    const participantCount = selectedParticipants.size

    if (participantCount === 0) return []

    if (splitMode === "equal") {
      const sharePerPerson = Math.round((amountNum / participantCount) * 100) / 100
      const shares = Array.from(selectedParticipants).map((userId) => ({
        userId,
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
      return Array.from(selectedParticipants).map((userId) => ({
        userId,
        shareAmount: Number(customShares[userId]) || 0,
      }))
    }
  }

  function getCustomSharesTotal(): number {
    return Array.from(selectedParticipants).reduce(
      (sum, userId) => sum + (Number(customShares[userId]) || 0),
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
      const res = await fetch(`/api/projects/${id}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paidBy,
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
        alert(data.error || "新增失敗")
      }
    } catch (error) {
      console.error("新增支出錯誤:", error)
      alert("新增失敗")
    } finally {
      setSubmitting(false)
    }
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
          <div className="grid grid-cols-2 gap-2">
            {members.map((member) => (
              <button
                key={member.user.id}
                type="button"
                onClick={() => setPaidBy(member.user.id)}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  paidBy === member.user.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                    {member.user.image ? (
                      <Image
                        src={member.user.image}
                        alt={member.user.name || ""}
                        width={32}
                        height={32}
                        className="rounded-full object-cover"
                      />
                    ) : (
                      <User className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <span className="text-sm font-medium truncate">
                    {member.user.name || member.user.email?.split("@")[0]}
                  </span>
                  {paidBy === member.user.id && (
                    <Check className="h-4 w-4 text-primary ml-auto" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 分擔者 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium">誰要分擔？ *</label>
            <button
              type="button"
              onClick={selectAllParticipants}
              className="text-xs text-primary hover:underline"
            >
              全選
            </button>
          </div>
          <Card>
            <CardContent className="p-3 space-y-2">
              {members.map((member) => {
                const isSelected = selectedParticipants.has(member.user.id)
                return (
                  <div
                    key={member.user.id}
                    className={`flex items-center justify-between p-2 rounded-lg transition-colors cursor-pointer ${
                      isSelected ? "bg-primary/5" : "hover:bg-secondary/50"
                    }`}
                    onClick={() => toggleParticipant(member.user.id)}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-5 w-5 rounded border flex items-center justify-center ${
                          isSelected ? "bg-primary border-primary" : "border-border"
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                        {member.user.image ? (
                          <Image
                            src={member.user.image}
                            alt={member.user.name || ""}
                            width={28}
                            height={28}
                            className="rounded-full object-cover"
                          />
                        ) : (
                          <User className="h-3.5 w-3.5 text-primary" />
                        )}
                      </div>
                      <span className="text-sm">
                        {member.user.name || member.user.email?.split("@")[0]}
                      </span>
                    </div>
                    {isSelected && splitMode === "equal" && amountNum > 0 && (
                      <span className="text-sm text-muted-foreground">
                        ${sharePerPerson.toFixed(2)}
                      </span>
                    )}
                    {isSelected && splitMode === "custom" && (
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0"
                        value={customShares[member.user.id] || ""}
                        onChange={(e) => {
                          e.stopPropagation()
                          setCustomShares({
                            ...customShares,
                            [member.user.id]: e.target.value,
                          })
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-24 h-8 text-right"
                      />
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>
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
    </AppLayout>
  )
}


