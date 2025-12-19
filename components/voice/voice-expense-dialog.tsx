"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useSpeechRecognition } from "@/lib/speech"
import { useAuthFetch } from "@/components/auth/liff-provider"
import { parseAvatarString, getAvatarIcon, getAvatarColor } from "@/components/avatar-picker"
import type { ExpenseItemResult, ParseExpensesResult } from "@/lib/ai/expense-parser"
import {
  Mic,
  MicOff,
  Loader2,
  Sparkles,
  Send,
  RotateCcw,
  User,
  Utensils,
  Car,
  Home,
  Gamepad2,
  ShoppingBag,
  Wallet,
  Ticket,
  Gift,
  Trash2,
} from "lucide-react"

interface Member {
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

interface VoiceExpenseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  members: Member[]
  currentUserMemberId: string
  onSuccess: () => void
}

const CATEGORIES = [
  { value: "food", label: "餐飲", icon: Utensils, color: "bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400" },
  { value: "transport", label: "交通", icon: Car, color: "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400" },
  { value: "accommodation", label: "住宿", icon: Home, color: "bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-400" },
  { value: "ticket", label: "票券", icon: Ticket, color: "bg-cyan-100 text-cyan-600 dark:bg-cyan-950 dark:text-cyan-400" },
  { value: "shopping", label: "購物", icon: ShoppingBag, color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400" },
  { value: "entertainment", label: "娛樂", icon: Gamepad2, color: "bg-pink-100 text-pink-600 dark:bg-pink-950 dark:text-pink-400" },
  { value: "gift", label: "禮品", icon: Gift, color: "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400" },
  { value: "other", label: "其他", icon: Wallet, color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" },
]

function getCategoryInfo(value: string) {
  return CATEGORIES.find((c) => c.value === value) || CATEGORIES[CATEGORIES.length - 1]
}

type Step = "input" | "processing" | "confirm" | "saving"

export function VoiceExpenseDialog({
  open,
  onOpenChange,
  projectId,
  members,
  currentUserMemberId,
  onSuccess,
}: VoiceExpenseDialogProps) {
  const authFetch = useAuthFetch()
  const speech = useSpeechRecognition()

  const [step, setStep] = useState<Step>("input")
  const [textInput, setTextInput] = useState("")
  const [error, setError] = useState<string | null>(null)

  // 多筆費用解析結果（每筆費用有獨立的 payerId 和 participantIds）
  const [expenses, setExpenses] = useState<ExpenseItemResult[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)

  // 儲存進度
  const [saveProgress, setSaveProgress] = useState({ current: 0, total: 0 })

  // 重置狀態
  function resetState() {
    setStep("input")
    setTextInput("")
    setError(null)
    setExpenses([])
    setCurrentIndex(0)
    setSaveProgress({ current: 0, total: 0 })
    speech.resetTranscript()
  }

  // 當 Dialog 開啟時重置
  useEffect(() => {
    if (open) {
      resetState()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // 取得完整輸入文字（文字輸入 + 語音）
  const fullTranscript = textInput + speech.transcript + speech.interimTranscript

  // 送出解析
  async function handleParse() {
    const transcript = (textInput + speech.transcript).trim()
    if (!transcript) {
      setError("請輸入或說出消費內容")
      return
    }

    setStep("processing")
    setError(null)

    try {
      const res = await authFetch("/api/voice/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          members: members.map((m) => ({ id: m.id, displayName: m.displayName })),
          currentUserMemberId,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "解析失敗")
      }

      const parsed: ParseExpensesResult = data.data

      // 填入解析結果（每筆費用已包含獨立的 payerId 和 participantIds）
      setExpenses(parsed.expenses)
      setCurrentIndex(0)
      setStep("confirm")
    } catch (err) {
      setError(err instanceof Error ? err.message : "解析失敗，請重試")
      setStep("input")
    }
  }

  // 更新費用欄位
  function updateExpense(expenseId: string, field: keyof ExpenseItemResult, value: string | number | string[]) {
    setExpenses((prev) =>
      prev.map((e) =>
        e.id === expenseId ? { ...e, [field]: value } : e
      )
    )
  }

  // 切換單筆費用的分擔者
  function toggleExpenseParticipant(expenseId: string, memberId: string) {
    setExpenses((prev) =>
      prev.map((e) => {
        if (e.id !== expenseId) return e
        const current = new Set(e.participantIds)
        if (current.has(memberId)) {
          current.delete(memberId)
        } else {
          current.add(memberId)
        }
        return { ...e, participantIds: Array.from(current) }
      })
    )
  }

  // 刪除費用
  function removeExpense(expenseId: string) {
    setExpenses((prev) => {
      const newExpenses = prev.filter((e) => e.id !== expenseId)
      // 調整 currentIndex
      if (currentIndex >= newExpenses.length && newExpenses.length > 0) {
        setCurrentIndex(newExpenses.length - 1)
      }
      return newExpenses
    })
  }

  // 切換到指定費用
  function goToExpense(index: number) {
    if (index >= 0 && index < expenses.length) {
      setCurrentIndex(index)
    }
  }

  // 計算總金額
  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0)

  // 批次儲存支出
  async function handleSave() {
    if (expenses.length === 0) {
      setError("沒有要儲存的費用")
      return
    }

    // 檢查每筆費用是否都有付款人和分擔者
    for (let i = 0; i < expenses.length; i++) {
      const expense = expenses[i]
      if (!expense.payerId) {
        setError(`第 ${i + 1} 筆費用請選擇付款人`)
        setCurrentIndex(i)
        return
      }
      if (expense.participantIds.length === 0) {
        setError(`第 ${i + 1} 筆費用請選擇至少一位分擔者`)
        setCurrentIndex(i)
        return
      }
    }

    setStep("saving")
    setError(null)
    setSaveProgress({ current: 0, total: expenses.length })

    try {
      // 逐筆儲存，每筆使用獨立的 payerId 和 participantIds
      for (let i = 0; i < expenses.length; i++) {
        const expense = expenses[i]
        setSaveProgress({ current: i + 1, total: expenses.length })

        const participantCount = expense.participantIds.length
        // 計算均分金額
        const shareAmount = Math.round((expense.amount / participantCount) * 100) / 100
        const participants = expense.participantIds.map((memberId, idx) => {
          const isFirst = idx === 0
          const remainder = Math.round((expense.amount - shareAmount * participantCount) * 100) / 100
          return {
            memberId,
            shareAmount: isFirst ? shareAmount + remainder : shareAmount,
          }
        })

        const res = await authFetch(`/api/projects/${projectId}/expenses`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paidByMemberId: expense.payerId,
            amount: expense.amount,
            description: expense.description.trim() || null,
            category: expense.category,
            expenseDate: new Date().toISOString(),
            participants,
          }),
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || `儲存第 ${i + 1} 筆失敗`)
        }
      }

      onSuccess()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "儲存失敗，請重試")
      setStep("confirm")
    }
  }

  // 切換錄音
  function toggleRecording() {
    if (speech.isRecording) {
      speech.stopRecording()
    } else {
      speech.startRecording()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI 快速記帳
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: 輸入階段 */}
        {step === "input" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              支援多筆消費和不同付款人，例如：「早餐 50、午餐 60，我付；晚餐 100，小華付；交通 90，小美幫她跟小華付」
            </p>

            {/* 文字輸入 */}
            <Textarea
              placeholder="輸入消費內容..."
              value={fullTranscript}
              onChange={(e) => {
                setTextInput(e.target.value)
                speech.resetTranscript()
              }}
              className="min-h-[100px] resize-none"
            />

            {/* 語音按鈕 */}
            <div className="flex items-center justify-center gap-4">
              {speech.isSupported ? (
                <Button
                  type="button"
                  variant={speech.isRecording ? "destructive" : "outline"}
                  size="lg"
                  className="gap-2"
                  onClick={toggleRecording}
                >
                  {speech.isRecording ? (
                    <>
                      <MicOff className="h-5 w-5" />
                      停止錄音
                    </>
                  ) : (
                    <>
                      <Mic className="h-5 w-5" />
                      語音輸入
                    </>
                  )}
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">
                  您的瀏覽器不支援語音輸入
                </p>
              )}

              <Button
                type="button"
                onClick={handleParse}
                disabled={!fullTranscript.trim()}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                AI 解析
              </Button>
            </div>

            {/* 錄音中動畫 */}
            {speech.isRecording && (
              <div className="flex items-center justify-center gap-2 text-destructive">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
                </span>
                <span className="text-sm">錄音中...</span>
              </div>
            )}

            {/* 錯誤訊息 */}
            {(error || speech.error) && (
              <p className="text-sm text-destructive text-center">
                {error || speech.error}
              </p>
            )}
          </div>
        )}

        {/* Step 2: 處理中 */}
        {step === "processing" && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">AI 分析中...</p>
          </div>
        )}

        {/* Step 3: 確認階段 */}
        {step === "confirm" && (
          <div className="space-y-4">
            {expenses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>沒有解析到任何費用</p>
                <Button variant="outline" className="mt-4" onClick={resetState}>
                  重新輸入
                </Button>
              </div>
            ) : (
              <>
                {/* 費用卡片輪播 */}
                <div className="relative">
                  {/* 標題與頁數 */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium">
                      支出明細
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {currentIndex + 1} / {expenses.length}
                    </span>
                  </div>

                  {/* 當前卡片 */}
                  {(() => {
                    const expense = expenses[currentIndex]
                    if (!expense) return null
                    const catInfo = getCategoryInfo(expense.category)
                    return (
                      <div className="w-full">
                        <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-4 space-y-4 border border-slate-200 dark:border-slate-800">
                            {/* 頂部：類別與刪除 */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${catInfo.color}`}>
                                  {(() => { const Icon = catInfo.icon; return <Icon className="h-5 w-5" /> })()}
                                </div>
                                <span className="font-medium">{catInfo.label}</span>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => removeExpense(expense.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>

                            {/* 金額 */}
                            <div>
                              <label className="block text-xs text-muted-foreground mb-1">金額</label>
                              <div className="flex items-center gap-2">
                                <span className="text-2xl font-bold">$</span>
                                <Input
                                  type="number"
                                  value={expense.amount}
                                  onChange={(e) => updateExpense(expense.id, "amount", Number(e.target.value))}
                                  className="text-2xl font-bold h-12"
                                />
                              </div>
                            </div>

                            {/* 描述 */}
                            <div>
                              <label className="block text-xs text-muted-foreground mb-1">描述</label>
                              <Input
                                value={expense.description}
                                onChange={(e) => updateExpense(expense.id, "description", e.target.value)}
                                placeholder="消費描述"
                              />
                            </div>

                            {/* 類別選擇 */}
                            <div>
                              <label className="block text-xs text-muted-foreground mb-2">類別</label>
                              <div className="grid grid-cols-4 gap-1.5">
                                {CATEGORIES.map((cat) => {
                                  const Icon = cat.icon
                                  const isSelected = expense.category === cat.value
                                  return (
                                    <button
                                      key={cat.value}
                                      type="button"
                                      onClick={() => updateExpense(expense.id, "category", cat.value)}
                                      className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg transition-all ${
                                        isSelected
                                          ? "bg-primary text-primary-foreground"
                                          : `${cat.color} hover:opacity-80`
                                      }`}
                                    >
                                      <Icon className="h-4 w-4" />
                                      <span className="text-[10px]">{cat.label}</span>
                                    </button>
                                  )
                                })}
                              </div>
                            </div>

                            {/* 付款人 */}
                            <div>
                              <label className="block text-xs text-muted-foreground mb-2">付款人</label>
                              <div className="flex flex-wrap gap-1.5">
                                {members.map((member) => {
                                  const avatarData = parseAvatarString(member.user?.image)
                                  const isSelected = expense.payerId === member.id
                                  return (
                                    <button
                                      key={member.id}
                                      type="button"
                                      onClick={() => updateExpense(expense.id, "payerId", member.id)}
                                      className={`flex items-center gap-1 px-2 py-1 rounded-full transition-all text-xs ${
                                        isSelected
                                          ? "bg-primary text-primary-foreground"
                                          : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700"
                                      }`}
                                    >
                                      {avatarData ? (
                                        <div
                                          className="h-4 w-4 rounded-full flex items-center justify-center"
                                          style={{ backgroundColor: isSelected ? 'rgba(255,255,255,0.3)' : getAvatarColor(avatarData.colorId) }}
                                        >
                                          {(() => { const IconComp = getAvatarIcon(avatarData.iconId); return <IconComp className="h-2 w-2 text-white" /> })()}
                                        </div>
                                      ) : member.user?.image ? (
                                        <Image
                                          src={member.user.image}
                                          alt={member.displayName}
                                          width={16}
                                          height={16}
                                          className="rounded-full"
                                        />
                                      ) : (
                                        <div className={`h-4 w-4 rounded-full flex items-center justify-center ${isSelected ? 'bg-white/30' : 'bg-slate-200 dark:bg-slate-700'}`}>
                                          <User className="h-2 w-2" />
                                        </div>
                                      )}
                                      <span className="font-medium">{member.displayName}</span>
                                    </button>
                                  )
                                })}
                              </div>
                            </div>

                            {/* 分擔者 */}
                            <div>
                              <label className="block text-xs text-muted-foreground mb-2">
                                分擔者（{expense.participantIds.length}人均分 · 每人 ${expense.participantIds.length > 0 ? Math.round(expense.amount / expense.participantIds.length) : 0}）
                              </label>
                              <div className="flex flex-wrap gap-1.5">
                                {members.map((member) => {
                                  const avatarData = parseAvatarString(member.user?.image)
                                  const isSelected = expense.participantIds.includes(member.id)
                                  return (
                                    <button
                                      key={member.id}
                                      type="button"
                                      onClick={() => toggleExpenseParticipant(expense.id, member.id)}
                                      className={`flex items-center gap-1 px-2 py-1 rounded-full transition-all text-xs ${
                                        isSelected
                                          ? "bg-emerald-500 text-white"
                                          : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700"
                                      }`}
                                    >
                                      {avatarData ? (
                                        <div
                                          className="h-4 w-4 rounded-full flex items-center justify-center"
                                          style={{ backgroundColor: isSelected ? 'rgba(255,255,255,0.3)' : getAvatarColor(avatarData.colorId) }}
                                        >
                                          {(() => { const IconComp = getAvatarIcon(avatarData.iconId); return <IconComp className="h-2 w-2 text-white" /> })()}
                                        </div>
                                      ) : member.user?.image ? (
                                        <Image
                                          src={member.user.image}
                                          alt={member.displayName}
                                          width={16}
                                          height={16}
                                          className="rounded-full"
                                        />
                                      ) : (
                                        <div className={`h-4 w-4 rounded-full flex items-center justify-center ${isSelected ? 'bg-white/30' : 'bg-slate-200 dark:bg-slate-700'}`}>
                                          <User className="h-2 w-2" />
                                        </div>
                                      )}
                                      <span className="font-medium">{member.displayName}</span>
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                    )
                  })()}

                  {/* 分頁指示器 */}
                  {expenses.length > 1 && (
                    <div className="flex items-center justify-center gap-1.5 mt-3">
                      {expenses.map((_, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => goToExpense(index)}
                          className={`h-2 rounded-full transition-all ${
                            index === currentIndex
                              ? "w-6 bg-primary"
                              : "w-2 bg-slate-300 dark:bg-slate-700"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* 總計 */}
                <div className="flex items-center justify-between py-2 px-3 bg-primary/5 rounded-xl">
                  <span className="text-sm text-muted-foreground">
                    共 {expenses.length} 筆
                  </span>
                  <span className="text-lg font-bold text-primary">
                    ${totalAmount.toLocaleString()}
                  </span>
                </div>

                {/* 錯誤訊息 */}
                {error && (
                  <p className="text-sm text-destructive text-center">{error}</p>
                )}

                {/* 按鈕 */}
                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={resetState}
                  >
                    <RotateCcw className="h-4 w-4" />
                    重新輸入
                  </Button>
                  <Button
                    type="button"
                    className="flex-1 gap-2"
                    onClick={handleSave}
                    disabled={expenses.length === 0}
                  >
                    <Send className="h-4 w-4" />
                    新增 {expenses.length} 筆
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 4: 儲存中 */}
        {step === "saving" && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">
              儲存中... ({saveProgress.current}/{saveProgress.total})
            </p>
            {/* 進度條 */}
            <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{
                  width: `${(saveProgress.current / saveProgress.total) * 100}%`,
                }}
              />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
