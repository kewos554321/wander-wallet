"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { AppLayout } from "@/components/layout/app-layout"
import { useAuthFetch, useLiff } from "@/components/auth/liff-provider"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
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
import { Send, Check, Utensils, Car, Home, Gamepad2, ShoppingBag, MoreHorizontal, User, Calculator, Delete, Ticket, Heart, Wifi, Coffee, Gift } from "lucide-react"

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
  { value: "food", label: "餐飲", icon: Utensils, color: "bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400" },
  { value: "drinks", label: "飲品", icon: Coffee, color: "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400" },
  { value: "transport", label: "交通", icon: Car, color: "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400" },
  { value: "accommodation", label: "住宿", icon: Home, color: "bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400" },
  { value: "entertainment", label: "娛樂", icon: Gamepad2, color: "bg-pink-100 text-pink-600 dark:bg-pink-950 dark:text-pink-400" },
  { value: "shopping", label: "購物", icon: ShoppingBag, color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400" },
  { value: "ticket", label: "票券", icon: Ticket, color: "bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400" },
  { value: "gift", label: "禮物", icon: Gift, color: "bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400" },
  { value: "medical", label: "醫療", icon: Heart, color: "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400" },
  { value: "other", label: "其他", icon: MoreHorizontal, color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" },
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

  // 計算機狀態
  const [showCalculator, setShowCalculator] = useState(false)
  const [calcExpression, setCalcExpression] = useState("")
  const [calcResult, setCalcResult] = useState<number | null>(null)

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

  // 計算機功能
  function handleCalcInput(value: string) {
    const operators = ["+", "-", "×", "÷"]
    const lastChar = calcExpression.slice(-1)

    // 如果按下運算符
    if (operators.includes(value)) {
      // 如果表達式為空或最後一個字元是運算符，不做任何事
      if (calcExpression === "" || operators.includes(lastChar)) {
        return
      }
    }

    // 如果按下小數點
    if (value === ".") {
      // 找到最後一個數字部分
      const parts = calcExpression.split(/[+\-×÷]/)
      const lastPart = parts[parts.length - 1]
      // 如果已經有小數點，不做任何事
      if (lastPart.includes(".")) {
        return
      }
    }

    const newExpression = calcExpression + value
    setCalcExpression(newExpression)
    evaluateExpression(newExpression)
  }

  function handleCalcDelete() {
    const newExpression = calcExpression.slice(0, -1)
    setCalcExpression(newExpression)
    evaluateExpression(newExpression)
  }

  function handleCalcClear() {
    setCalcExpression("")
    setCalcResult(null)
  }

  function evaluateExpression(expr: string) {
    if (!expr) {
      setCalcResult(null)
      return
    }

    try {
      // 替換運算符為 JS 可識別的格式
      const jsExpr = expr.replace(/×/g, "*").replace(/÷/g, "/")
      // 移除尾部的運算符
      const cleanExpr = jsExpr.replace(/[+\-*/]$/, "")
      if (!cleanExpr) {
        setCalcResult(null)
        return
      }
      // 使用 Function 來安全計算
      const result = new Function(`return ${cleanExpr}`)()
      if (typeof result === "number" && !isNaN(result) && isFinite(result)) {
        setCalcResult(Math.round(result * 100) / 100)
      } else {
        setCalcResult(null)
      }
    } catch {
      setCalcResult(null)
    }
  }

  function applyCalcResult() {
    if (calcResult !== null) {
      setAmount(calcResult.toString())
      setShowCalculator(false)
      setCalcExpression("")
      setCalcResult(null)
    }
  }

  const backHref = `/projects/${id}`

  if (loading) {
    return (
      <AppLayout title="新增支出" showBack backHref={backHref}>
        <div className="text-center py-8 text-muted-foreground">載入中...</div>
      </AppLayout>
    )
  }

  const amountNum = Number(amount) || 0
  const sharePerPerson = selectedParticipants.size > 0 ? amountNum / selectedParticipants.size : 0

  return (
    <AppLayout title="新增支出" showBack backHref={backHref}>
      <form onSubmit={handleSubmit} className="space-y-5 pb-40">
        {/* 金額輸入區 - 突出顯示 */}
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-muted-foreground">輸入金額</label>
            <button
              type="button"
              onClick={() => setShowCalculator(!showCalculator)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                showCalculator
                  ? "bg-primary text-primary-foreground"
                  : "bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800"
              }`}
            >
              <Calculator className="h-3.5 w-3.5" />
              計算機
            </button>
          </div>

          {showCalculator ? (
            /* 計算機 UI */
            <div className="space-y-3">
              {/* 顯示區 */}
              <div className="bg-white dark:bg-slate-900 rounded-xl p-4">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground min-h-[20px] font-mono">
                    {calcExpression || "0"}
                  </p>
                  <p className="text-3xl font-bold text-primary tabular-nums">
                    {calcResult !== null ? `= ${calcResult.toLocaleString("zh-TW")}` : ""}
                  </p>
                </div>
              </div>

              {/* 按鈕區 */}
              <div className="grid grid-cols-4 gap-2">
                {["C", "÷", "×", "⌫", "7", "8", "9", "−", "4", "5", "6", "+", "1", "2", "3", "=", "0", "0", ".", "="].map((btn, idx) => {
                  // 跳過重複的按鈕位置
                  if ((idx === 17) || (idx === 19)) return null

                  const isOperator = ["÷", "×", "−", "+"].includes(btn)
                  const isClear = btn === "C"
                  const isDelete = btn === "⌫"
                  const isEquals = btn === "="
                  const isZero = btn === "0" && idx === 16

                  let className = "h-11 rounded-xl font-semibold text-lg transition-all active:scale-95 "

                  if (isClear) {
                    className += "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200"
                  } else if (isOperator || isDelete) {
                    className += "bg-slate-100 dark:bg-slate-700 text-primary hover:bg-slate-200 dark:hover:bg-slate-600"
                  } else if (isEquals) {
                    className += "bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  } else {
                    className += "bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700"
                  }

                  if (isZero) className += " col-span-2"

                  const handleClick = () => {
                    if (isClear) handleCalcClear()
                    else if (isDelete) handleCalcDelete()
                    else if (isEquals) applyCalcResult()
                    else if (isOperator) handleCalcInput(btn === "−" ? "-" : btn)
                    else handleCalcInput(btn)
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={handleClick}
                      disabled={isEquals && calcResult === null}
                      className={className}
                    >
                      {isDelete ? <Delete className="h-5 w-5 mx-auto" /> : isEquals ? <Check className="h-5 w-5 mx-auto" /> : btn}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            /* 一般金額輸入 */
            <>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold text-primary">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="text-4xl h-16 font-bold border-0 bg-transparent shadow-none focus-visible:ring-0 p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  required
                />
              </div>
              {amountNum > 0 && selectedParticipants.size > 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  每人分攤 ${sharePerPerson.toFixed(2)}
                </p>
              )}
            </>
          )}
        </div>

        {/* 描述 */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
          <label className="block text-xs font-medium text-muted-foreground mb-2">描述</label>
          <Input
            placeholder="例如：午餐、計程車費"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="border-0 p-0 h-auto text-base shadow-none focus-visible:ring-0"
          />
        </div>

        {/* 類別 */}
        <div>
          <label className="block text-sm font-medium mb-3">類別</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon
              const isSelected = category === cat.value
              return (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(category === cat.value ? "" : cat.value)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-full transition-all ${
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-md"
                      : `${cat.color} hover:opacity-80`
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">{cat.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* 付款人 */}
        <div>
          <label className="block text-sm font-medium mb-3">誰付的錢？</label>
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              沒有成員，請先新增成員
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {members.map((member) => {
                const avatarData = parseAvatarString(member.user?.image)
                const hasExternalImage = member.user?.image && !member.user.image.startsWith("avatar:")
                const isSelected = paidBy === member.id
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => setPaidBy(member.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-full transition-all ${
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-primary/50"
                    }`}
                  >
                    {avatarData ? (
                      <div
                        className="h-6 w-6 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: isSelected ? 'rgba(255,255,255,0.3)' : getAvatarColor(avatarData.colorId) }}
                      >
                        {(() => { const Icon = getAvatarIcon(avatarData.iconId); return <Icon className="h-3 w-3 text-white" /> })()}
                      </div>
                    ) : (
                      <div className={`h-6 w-6 rounded-full flex items-center justify-center overflow-hidden ${isSelected ? 'bg-white/30' : 'bg-slate-100 dark:bg-slate-800'}`}>
                        {hasExternalImage ? (
                          <Image
                            src={member.user!.image!}
                            alt={member.displayName}
                            width={24}
                            height={24}
                            className="rounded-full object-cover"
                          />
                        ) : (
                          <User className={`h-3 w-3 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
                        )}
                      </div>
                    )}
                    <span className="text-sm font-medium">{member.displayName}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* 分擔者 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium">幫誰付？</label>
            <button
              type="button"
              onClick={() => {
                if (selectedParticipants.size === members.length) {
                  setSelectedParticipants(new Set())
                } else {
                  selectAllParticipants()
                }
              }}
              className="text-xs text-primary font-medium"
            >
              {selectedParticipants.size === members.length ? "取消全選" : "全選"}
            </button>
          </div>
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              沒有成員，請先新增成員
            </p>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
              {members.map((member) => {
                const isSelected = selectedParticipants.has(member.id)
                const avatarData = parseAvatarString(member.user?.image)
                const hasExternalImage = member.user?.image && !member.user.image.startsWith("avatar:")
                return (
                  <label
                    key={member.id}
                    className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${
                      isSelected ? "bg-primary/5" : "hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
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
                        <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                          {hasExternalImage ? (
                            <Image
                              src={member.user!.image!}
                              alt={member.displayName}
                              width={32}
                              height={32}
                              className="rounded-full object-cover"
                            />
                          ) : (
                            <User className="h-4 w-4 text-slate-500" />
                          )}
                        </div>
                      )}
                      <span className="text-sm font-medium">{member.displayName}</span>
                    </div>
                    {isSelected && splitMode === "equal" && amountNum > 0 && (
                      <span className="text-sm font-medium text-primary tabular-nums">
                        ${sharePerPerson.toFixed(2)}
                      </span>
                    )}
                    {isSelected && splitMode === "custom" && (
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-muted-foreground">$</span>
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
                          className="w-20 h-8 text-right"
                        />
                      </div>
                    )}
                  </label>
                )
              })}
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-2 text-center">
            已選 {selectedParticipants.size} 人
          </p>
        </div>

        {/* 分擔方式 */}
        <div>
          <label className="block text-sm font-medium mb-3">分擔方式</label>
          <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setSplitMode("equal")}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                splitMode === "equal"
                  ? "bg-white dark:bg-slate-900 shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              均分
            </button>
            <button
              type="button"
              onClick={() => setSplitMode("custom")}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                splitMode === "custom"
                  ? "bg-white dark:bg-slate-900 shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              自訂金額
            </button>
          </div>
          {splitMode === "custom" && amountNum > 0 && (
            <div className="mt-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">已分配金額</span>
                <span className={`font-medium ${getCustomSharesTotal() === amountNum ? "text-emerald-600" : "text-red-500"}`}>
                  ${getCustomSharesTotal().toFixed(2)} / ${amountNum.toFixed(2)}
                </span>
              </div>
              {getCustomSharesTotal() !== amountNum && (
                <p className="text-xs text-red-500 mt-1">
                  {getCustomSharesTotal() > amountNum ? "超出" : "還差"} ${Math.abs(getCustomSharesTotal() - amountNum).toFixed(2)}
                </p>
              )}
            </div>
          )}
        </div>

        {/* 固定在底部導航上方的按鈕 - 計算機開啟時隱藏 */}
        {!showCalculator && (
          <div className="fixed bottom-14 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t border-slate-200 dark:border-slate-800">
            <div className="max-w-screen-2xl mx-auto flex gap-3">
              <Link href={backHref} className="flex-1">
                <Button type="button" variant="outline" className="w-full h-12">
                  取消
                </Button>
              </Link>
              <Button type="submit" className="flex-1 h-12" disabled={submitting}>
                {submitting ? "儲存中..." : "儲存支出"}
              </Button>
            </div>
          </div>
        )}
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


