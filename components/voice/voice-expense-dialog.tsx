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
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { useSpeechRecognition } from "@/lib/speech"
import { useAuthFetch } from "@/components/auth/liff-provider"
import { parseAvatarString, getAvatarIcon, getAvatarColor } from "@/components/avatar-picker"
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

interface ParsedExpense {
  amount: number
  description: string
  category: string
  payerId: string | null
  participantIds: string[]
  splitMode: "equal" | "custom"
  confidence: number
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

  // 解析後的資料（可編輯）
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("other")
  const [payerId, setPayerId] = useState("")
  const [participantIds, setParticipantIds] = useState<Set<string>>(new Set())

  // 重置狀態
  function resetState() {
    setStep("input")
    setTextInput("")
    setError(null)
    setAmount("")
    setDescription("")
    setCategory("other")
    setPayerId(currentUserMemberId)
    setParticipantIds(new Set(members.map((m) => m.id)))
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

      const parsed: ParsedExpense = data.data

      // 填入解析結果
      setAmount(String(parsed.amount))
      setDescription(parsed.description)
      setCategory(parsed.category)
      setPayerId(parsed.payerId || currentUserMemberId)
      setParticipantIds(new Set(parsed.participantIds))
      setStep("confirm")
    } catch (err) {
      setError(err instanceof Error ? err.message : "解析失敗，請重試")
      setStep("input")
    }
  }

  // 儲存支出
  async function handleSave() {
    const amountNum = Number(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("請輸入有效金額")
      return
    }

    if (!payerId) {
      setError("請選擇付款人")
      return
    }

    if (participantIds.size === 0) {
      setError("請選擇至少一位分擔者")
      return
    }

    setStep("saving")
    setError(null)

    try {
      // 計算均分金額
      const shareAmount = Math.round((amountNum / participantIds.size) * 100) / 100
      const participants = Array.from(participantIds).map((memberId, index) => {
        // 處理餘數，讓第一個人承擔
        const isFirst = index === 0
        const remainder = Math.round((amountNum - shareAmount * participantIds.size) * 100) / 100
        return {
          memberId,
          shareAmount: isFirst ? shareAmount + remainder : shareAmount,
        }
      })

      const res = await authFetch(`/api/projects/${projectId}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paidByMemberId: payerId,
          amount: amountNum,
          description: description.trim() || null,
          category,
          expenseDate: new Date().toISOString(),
          participants,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "儲存失敗")
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

  // 切換分擔者
  function toggleParticipant(memberId: string) {
    const newSet = new Set(participantIds)
    if (newSet.has(memberId)) {
      newSet.delete(memberId)
    } else {
      newSet.add(memberId)
    }
    setParticipantIds(newSet)
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
              輸入或說出消費內容，例如：「午餐吃拉麵 280 元，我先付，大家平分」
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
            {/* 金額 */}
            <div>
              <label className="block text-sm font-medium mb-2">金額</label>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold">$</span>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="text-xl font-bold"
                  placeholder="0"
                />
              </div>
            </div>

            {/* 描述 */}
            <div>
              <label className="block text-sm font-medium mb-2">描述</label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="消費描述"
              />
            </div>

            {/* 類別 */}
            <div>
              <label className="block text-sm font-medium mb-2">類別</label>
              <div className="grid grid-cols-4 gap-2">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon
                  const isSelected = category === cat.value
                  return (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setCategory(cat.value)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : `${cat.color} hover:opacity-80`
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-xs">{cat.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 付款人 */}
            <div>
              <label className="block text-sm font-medium mb-2">付款人</label>
              <div className="flex flex-wrap gap-2">
                {members.map((member) => {
                  const avatarData = parseAvatarString(member.user?.image)
                  const isSelected = payerId === member.id
                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => setPayerId(member.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all ${
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700"
                      }`}
                    >
                      {avatarData ? (
                        <div
                          className="h-5 w-5 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: isSelected ? 'rgba(255,255,255,0.3)' : getAvatarColor(avatarData.colorId) }}
                        >
                          {(() => { const Icon = getAvatarIcon(avatarData.iconId); return <Icon className="h-2.5 w-2.5 text-white" /> })()}
                        </div>
                      ) : member.user?.image ? (
                        <Image
                          src={member.user.image}
                          alt={member.displayName}
                          width={20}
                          height={20}
                          className="rounded-full"
                        />
                      ) : (
                        <div className={`h-5 w-5 rounded-full flex items-center justify-center ${isSelected ? 'bg-white/30' : 'bg-slate-200 dark:bg-slate-700'}`}>
                          <User className="h-2.5 w-2.5" />
                        </div>
                      )}
                      <span className="text-xs font-medium">{member.displayName}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 分擔者 */}
            <div>
              <label className="block text-sm font-medium mb-2">
                分擔者（均分）
              </label>
              <div className="space-y-2">
                {members.map((member) => {
                  const isSelected = participantIds.has(member.id)
                  const avatarData = parseAvatarString(member.user?.image)
                  return (
                    <label
                      key={member.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleParticipant(member.id)}
                      />
                      {avatarData ? (
                        <div
                          className="h-6 w-6 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: getAvatarColor(avatarData.colorId) }}
                        >
                          {(() => { const Icon = getAvatarIcon(avatarData.iconId); return <Icon className="h-3 w-3 text-white" /> })()}
                        </div>
                      ) : member.user?.image ? (
                        <Image
                          src={member.user.image}
                          alt={member.displayName}
                          width={24}
                          height={24}
                          className="rounded-full"
                        />
                      ) : (
                        <div className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                          <User className="h-3 w-3" />
                        </div>
                      )}
                      <span className="text-sm flex-1">{member.displayName}</span>
                      {isSelected && Number(amount) > 0 && (
                        <span className="text-sm text-primary font-medium">
                          ${(Number(amount) / participantIds.size).toFixed(0)}
                        </span>
                      )}
                    </label>
                  )
                })}
              </div>
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
              >
                <Send className="h-4 w-4" />
                確認新增
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: 儲存中 */}
        {step === "saving" && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">儲存中...</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
