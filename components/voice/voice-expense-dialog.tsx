"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
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
  Trash2,
  X,
  Info,
  ImagePlus,
  MapPin,
  CalendarIcon,
} from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { CATEGORIES } from "@/lib/constants/expenses"
import { Calendar } from "@/components/ui/calendar"
import { compressImage } from "@/lib/image-utils"
import { format } from "date-fns"
import { zhTW } from "date-fns/locale"

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

  // 拖拉狀態
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartX, setDragStartX] = useState(0)
  const [dragOffset, setDragOffset] = useState(0)

  const [step, setStep] = useState<Step>("input")
  const [textInput, setTextInput] = useState("")
  const [error, setError] = useState<string | null>(null)

  // 多筆費用解析結果（每筆費用有獨立的 payerId 和 participantIds）
  const [expenses, setExpenses] = useState<ExpenseItemResult[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)

  // 儲存進度
  const [saveProgress, setSaveProgress] = useState({ current: 0, total: 0 })

  // 每筆費用的額外資料（圖片、地點、日期）
  interface ExpenseExtras {
    image: string | null
    location: string | null
    latitude: number | null
    longitude: number | null
    expenseDate: Date
  }
  const [expenseExtras, setExpenseExtras] = useState<Record<string, ExpenseExtras>>({})
  const [uploadingImage, setUploadingImage] = useState<string | null>(null) // 正在上傳的費用 ID
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [currentUploadExpenseId, setCurrentUploadExpenseId] = useState<string | null>(null)
  const [gettingLocationFor, setGettingLocationFor] = useState<string | null>(null) // 正在獲取位置的費用 ID

  // 重置狀態
  function resetState() {
    setStep("input")
    setTextInput("")
    setError(null)
    setExpenses([])
    setCurrentIndex(0)
    setSaveProgress({ current: 0, total: 0 })
    setExpenseExtras({})
    speech.resetTranscript()
  }

  // 當 Dialog 開啟時重置
  useEffect(() => {
    if (open) {
      resetState()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // 初始化費用的額外資料（解析完成後）
  useEffect(() => {
    if (expenses.length > 0) {
      const newExtras: Record<string, ExpenseExtras> = {}
      expenses.forEach((expense) => {
        if (!expenseExtras[expense.id]) {
          newExtras[expense.id] = {
            image: null,
            location: null,
            latitude: null,
            longitude: null,
            expenseDate: new Date(),
          }
        }
      })
      if (Object.keys(newExtras).length > 0) {
        setExpenseExtras((prev) => ({ ...prev, ...newExtras }))
        // 為每筆費用自動獲取位置
        expenses.forEach((expense) => {
          if (!expenseExtras[expense.id]) {
            getLocationForExpense(expense.id)
          }
        })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenses])

  // 獲取指定費用的當下位置
  const getLocationForExpense = useCallback(async (expenseId: string) => {
    if (!navigator.geolocation) return

    setGettingLocationFor(expenseId)
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        })
      })

      const { latitude, longitude } = position.coords

      // 反向地理編碼取得地址
      const response = await fetch(`/api/geocode?lat=${latitude}&lon=${longitude}`)
      const data = await response.json()

      if (response.ok) {
        setExpenseExtras((prev) => ({
          ...prev,
          [expenseId]: {
            ...prev[expenseId],
            location: data.displayName,
            latitude: data.lat,
            longitude: data.lon,
          },
        }))
      } else {
        setExpenseExtras((prev) => ({
          ...prev,
          [expenseId]: {
            ...prev[expenseId],
            location: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
            latitude,
            longitude,
          },
        }))
      }
    } catch {
      // 靜默失敗，不影響使用
    } finally {
      setGettingLocationFor(null)
    }
  }, [])

  // 清除指定費用的位置
  function clearLocationForExpense(expenseId: string) {
    setExpenseExtras((prev) => ({
      ...prev,
      [expenseId]: {
        ...prev[expenseId],
        location: null,
        latitude: null,
        longitude: null,
      },
    }))
  }

  // 更新指定費用的日期
  function updateExpenseDate(expenseId: string, date: Date) {
    setExpenseExtras((prev) => ({
      ...prev,
      [expenseId]: {
        ...prev[expenseId],
        expenseDate: date,
      },
    }))
  }

  // 圖片上傳處理
  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !currentUploadExpenseId) return

    if (!file.type.startsWith("image/")) {
      setError("請選擇圖片檔案")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("圖片大小不能超過 5MB")
      return
    }

    setUploadingImage(currentUploadExpenseId)
    setError(null)

    try {
      const compressedBase64 = await compressImage(file, 800, 800, 0.6)
      const estimatedBytes = compressedBase64.length * 0.73
      const maxBytes = 200 * 1024

      const finalImage = estimatedBytes > maxBytes
        ? await compressImage(file, 600, 600, 0.5)
        : compressedBase64

      setExpenseExtras((prev) => ({
        ...prev,
        [currentUploadExpenseId]: {
          ...prev[currentUploadExpenseId],
          image: finalImage,
        },
      }))
    } catch {
      setError("圖片處理失敗，請重試")
    } finally {
      setUploadingImage(null)
      setCurrentUploadExpenseId(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  function handleRemoveImage(expenseId: string) {
    setExpenseExtras((prev) => ({
      ...prev,
      [expenseId]: {
        ...prev[expenseId],
        image: null,
      },
    }))
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  function triggerImageUpload(expenseId: string) {
    setCurrentUploadExpenseId(expenseId)
    fileInputRef.current?.click()
  }

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
    if (index >= 0 && index < expenses.length && index !== currentIndex) {
      // 切換前先 blur，收起虛擬鍵盤
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur()
      }
      setCurrentIndex(index)
    }
  }

  // 拖拉事件處理
  const dragStartYRef = useRef(0)
  const isHorizontalDragRef = useRef<boolean | null>(null)

  function handleDragStart(e: React.TouchEvent) {
    // 如果觸控的是 input 或 button，不啟動拖拉
    const target = e.target as HTMLElement
    if (target.tagName === "INPUT" || target.tagName === "BUTTON" || target.closest("button")) {
      return
    }

    setIsDragging(true)
    setDragStartX(e.touches[0].clientX)
    dragStartYRef.current = e.touches[0].clientY
    isHorizontalDragRef.current = null
    setDragOffset(0)
  }

  function handleDragMove(e: React.TouchEvent) {
    if (!isDragging) return

    const deltaX = e.touches[0].clientX - dragStartX
    const deltaY = e.touches[0].clientY - dragStartYRef.current

    // 判斷是水平還是垂直滑動（只判斷一次）
    if (isHorizontalDragRef.current === null) {
      if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
        isHorizontalDragRef.current = Math.abs(deltaX) > Math.abs(deltaY)
      }
    }

    // 只有水平滑動才更新 offset
    if (isHorizontalDragRef.current) {
      setDragOffset(deltaX)
    }
  }

  function handleDragEnd() {
    if (!isDragging) return
    setIsDragging(false)

    // 只有確認是水平拖拉才切換
    if (isHorizontalDragRef.current) {
      const threshold = 50
      const willSwitch =
        (dragOffset > threshold && currentIndex > 0) ||
        (dragOffset < -threshold && currentIndex < expenses.length - 1)

      if (willSwitch) {
        // 切換前先 blur，收起虛擬鍵盤
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur()
        }

        if (dragOffset > threshold && currentIndex > 0) {
          setCurrentIndex(currentIndex - 1)
        } else if (dragOffset < -threshold && currentIndex < expenses.length - 1) {
          setCurrentIndex(currentIndex + 1)
        }
      }
    }

    setDragOffset(0)
    isHorizontalDragRef.current = null
  }

  // 測試用：直接進入預覽（開發模式）
  function handleTestPreview() {
    const allMemberIds = members.map((m) => m.id)
    const mockExpenses = [
      {
        id: `test-${Date.now()}-1`,
        amount: 50,
        description: "早餐",
        category: "food" as const,
        payerId: currentUserMemberId,
        participantIds: allMemberIds,
        selected: true,
      },
      {
        id: `test-${Date.now()}-2`,
        amount: 60,
        description: "午餐",
        category: "food" as const,
        payerId: currentUserMemberId,
        participantIds: allMemberIds,
        selected: true,
      },
      {
        id: `test-${Date.now()}-3`,
        amount: 100,
        description: "晚餐",
        category: "food" as const,
        payerId: members[1]?.id || currentUserMemberId,
        participantIds: allMemberIds,
        selected: true,
      },
      {
        id: `test-${Date.now()}-4`,
        amount: 90,
        description: "交通",
        category: "transport" as const,
        payerId: members[1]?.id || currentUserMemberId,
        participantIds: members.slice(0, 2).map((m) => m.id),
        selected: true,
      },
    ]
    setExpenses(mockExpenses)
    setCurrentIndex(0)
    setStep("confirm")
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

        const extras = expenseExtras[expense.id] || {
          image: null,
          location: null,
          latitude: null,
          longitude: null,
          expenseDate: new Date(),
        }

        const res = await authFetch(`/api/projects/${projectId}/expenses`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paidByMemberId: expense.payerId,
            amount: expense.amount,
            description: expense.description.trim() || null,
            category: expense.category,
            image: extras.image,
            location: extras.location,
            latitude: extras.latitude,
            longitude: extras.longitude,
            expenseDate: extras.expenseDate.toISOString(),
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
      <DialogContent className="w-[calc(100%-2rem)] max-w-md max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI 快速記帳
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: 輸入階段 */}
        {step === "input" && (
          <div className="space-y-4">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <span>支援多筆消費和不同付款人</span>
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" className="text-muted-foreground hover:text-foreground">
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent side="bottom" align="start" className="w-auto max-w-[280px] p-3 text-xs">
                  <p className="font-medium mb-1">範例格式：</p>
                  <ul className="space-y-0.5 text-muted-foreground">
                    <li>• 早餐 50、午餐 60，我付</li>
                    <li>• 晚餐 100，小明付</li>
                    <li>• 交通 90，小美幫她跟小華付</li>
                    <li>• 咖啡 120 我幫大家付</li>
                  </ul>
                </PopoverContent>
              </Popover>
            </div>

            {/* 快速範例 - 按情境分類 */}
            <div className="flex flex-wrap gap-1">
              {[
                { label: "我付全", value: "早餐 100 我付" },
                { label: "我付他", value: "早餐 100 我幫小明付" },
                { label: "他付他", value: "早餐 100 小明幫小華付" },
                { label: "他付全", value: "早餐 100 小明付" },
                { label: "混合1", value: "早餐 50、午餐 80、飲料 35 我付" },
                { label: "混合2", value: "早餐 50 我付、午餐 100 小明付" },
                { label: "混合3", value: "高鐵 1490 我付、Uber 250 小明付、晚餐 600 大家分" },
              ].map((item, index) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    setTextInput(item.value)
                    speech.resetTranscript()
                  }}
                  className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] bg-slate-100 dark:bg-slate-800 hover:bg-primary hover:text-primary-foreground rounded transition-colors"
                >
                  <span className="text-muted-foreground">#{index + 1}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>

            {/* 文字輸入 */}
            <div className="relative">
              <Textarea
                placeholder="輸入消費內容..."
                value={fullTranscript}
                onChange={(e) => {
                  setTextInput(e.target.value)
                  speech.resetTranscript()
                }}
                className="min-h-[100px] resize-none pr-8"
              />
              {fullTranscript && (
                <button
                  type="button"
                  onClick={() => {
                    setTextInput("")
                    speech.resetTranscript()
                  }}
                  className="absolute top-2 right-2 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

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

            {/* 開發測試按鈕 */}
            {process.env.NODE_ENV === "development" && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={handleTestPreview}
              >
                🧪 測試預覽 (Dev)
              </Button>
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
          <div className="space-y-4 overflow-hidden">
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
                <div className="relative overflow-hidden">
                  {/* 標題與頁數 */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium">
                      支出明細
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {currentIndex + 1} / {expenses.length}
                    </span>
                  </div>

                  {/* 輪播容器 - 整個區域可拖拉 */}
                  <div
                    className="overflow-hidden w-full"
                    onTouchStart={handleDragStart}
                    onTouchMove={handleDragMove}
                    onTouchEnd={handleDragEnd}
                  >
                    <div
                      className="flex transition-transform ease-out w-full"
                      style={{
                        transform: `translateX(calc(-${currentIndex * 100}% + ${dragOffset}px))`,
                        transitionDuration: isDragging ? "0ms" : "300ms",
                      }}
                    >
                      {expenses.map((expense) => {
                        return (
                          <div key={expense.id} className="w-full flex-shrink-0 min-w-full">
                            <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-4">
                              {/* 頂部：刪除按鈕 */}
                              <div className="flex items-center justify-end">
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
                              <div className="flex items-center gap-2">
                                <span className="text-2xl font-bold">$</span>
                                <Input
                                  type="number"
                                  value={expense.amount}
                                  onChange={(e) => updateExpense(expense.id, "amount", Number(e.target.value))}
                                  className="text-2xl font-bold h-12"
                                />
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

                            {/* 類別 */}
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
                              <label className="block text-xs text-muted-foreground mb-2">誰付的錢？</label>
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
                                幫誰付？（{expense.participantIds.length}人均分 · 每人 ${expense.participantIds.length > 0 ? Math.round(expense.amount / expense.participantIds.length) : 0}）
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

                            {/* 分隔線 */}
                            <hr className="border-slate-200 dark:border-slate-700" />

                            {/* 支出日期 */}
                            <div>
                              <label className="block text-xs text-muted-foreground mb-2">支出日期</label>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button
                                    type="button"
                                    className="flex items-center gap-2 px-3 py-2 w-full bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-sm hover:border-primary/50 transition-colors"
                                  >
                                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                                    <span>{format(expenseExtras[expense.id]?.expenseDate || new Date(), "MM/dd (EEE)", { locale: zhTW })}</span>
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={expenseExtras[expense.id]?.expenseDate}
                                    onSelect={(date) => date && updateExpenseDate(expense.id, date)}
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>

                            {/* 消費地點 */}
                            <div>
                              <label className="block text-xs text-muted-foreground mb-2">消費地點</label>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => getLocationForExpense(expense.id)}
                                  disabled={gettingLocationFor === expense.id}
                                  className="flex-1 flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-sm hover:border-primary/50 transition-colors text-left"
                                >
                                  {gettingLocationFor === expense.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                  ) : (
                                    <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  )}
                                  <span className="truncate text-xs">
                                    {expenseExtras[expense.id]?.location || "點擊獲取位置"}
                                  </span>
                                </button>
                                {expenseExtras[expense.id]?.location && (
                                  <button
                                    type="button"
                                    onClick={() => clearLocationForExpense(expense.id)}
                                    className="p-2 text-muted-foreground hover:text-foreground"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* 收據圖片 */}
                            <div>
                              <label className="block text-xs text-muted-foreground mb-2">收據/消費圖片</label>
                              {expenseExtras[expense.id]?.image ? (
                                <div className="relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                                  <Image
                                    src={expenseExtras[expense.id].image!}
                                    alt="收據"
                                    width={200}
                                    height={100}
                                    className="w-full h-20 object-cover"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveImage(expense.id)}
                                    className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => triggerImageUpload(expense.id)}
                                  disabled={uploadingImage === expense.id}
                                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
                                >
                                  {uploadingImage === expense.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <ImagePlus className="h-4 w-4" />
                                  )}
                                  <span>{uploadingImage === expense.id ? "處理中..." : "點擊上傳"}</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                        )
                      })}
                    </div>
                  </div>

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

                {/* 隱藏的圖片上傳 input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />

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
