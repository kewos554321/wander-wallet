/* c8 ignore start */
"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
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
import { useMediaRecorderSpeech } from "@/lib/media-recorder-speech"
import { useAuthFetch, useLiff } from "@/components/auth/liff-provider"
import { sendExpenseNotificationToChat, sendBatchExpenseNotificationToChat } from "@/lib/liff"
import { mergePreferences } from "@/types/user-preferences"
import { Checkbox } from "@/components/ui/checkbox"
import { parseAvatarString, getAvatarIcon, getAvatarColor } from "@/components/avatar-picker"
import type { ExpenseItemResult, ParseExpensesResult } from "@/lib/ai/expense-parser"
import { derivePayerShares, primaryPayerId } from "@/lib/expense-payers"
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
  MapPin,
  CalendarIcon,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { ImagePicker, type ImagePickerValue } from "@/components/ui/image-picker"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { CATEGORIES } from "@/lib/constants/expenses"
import { Calendar } from "@/components/ui/calendar"
import { uploadImageToR2 } from "@/lib/image-utils"
import { format } from "date-fns"
import { zhTW } from "date-fns/locale"
import { formatCurrency, DEFAULT_CURRENCY, type CurrencyCode } from "@/lib/constants/currencies"
import { CurrencySelect } from "@/components/ui/currency-select"

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
  projectName: string
  members: Member[]
  currentUserMemberId: string
  onSuccess: () => void
  currency?: string
}


type Step = "input" | "processing" | "confirm" | "saving"

export function VoiceExpenseDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
  members,
  currentUserMemberId,
  onSuccess,
  currency = DEFAULT_CURRENCY,
}: VoiceExpenseDialogProps) {
  const authFetch = useAuthFetch()
  const webSpeech = useSpeechRecognition()
  const mediaRecorder = useMediaRecorderSpeech()
  const { isDevMode, canSendMessages, user } = useLiff()

  // 決定使用哪個語音引擎：Web Speech API 優先，iOS LIFF 用 MediaRecorder
  const useMediaRecorder = !webSpeech.isSupported && mediaRecorder.isSupported

  // Debug: 顯示使用哪個引擎
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("🎤 語音引擎狀態:", {
        platform: webSpeech.platform,
        webSpeechSupported: webSpeech.isSupported,
        webSpeechReason: webSpeech.supportStatus.reason,
        mediaRecorderSupported: mediaRecorder.isSupported,
        useMediaRecorder,
        finalChoice: useMediaRecorder ? "MediaRecorder + Groq" : "Web Speech API"
      })
    }
  }, [webSpeech.isSupported, webSpeech.platform, webSpeech.supportStatus, mediaRecorder.isSupported, useMediaRecorder])

  // 獲取用戶偏好設定
  const userPreferences = mergePreferences(user?.preferences)

  // 拖拉狀態
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartX, setDragStartX] = useState(0)
  const [dragOffset, setDragOffset] = useState(0)

  const [step, setStep] = useState<Step>("input")
  const [textInput, setTextInput] = useState("")
  const [error, setError] = useState<string | null>(null)

  // Debug 狀態
  const [debugInfo, setDebugInfo] = useState<string | null>(null)
  const [debugExpanded, setDebugExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  // 輸入階段的圖片（用於 AI 收據辨識）
  const [inputImage, setInputImage] = useState<ImagePickerValue>({
    image: null,
    pendingFile: null,
    preview: null,
  })
  const [parsingImage, setParsingImage] = useState(false)

  // 多筆費用解析結果（每筆費用有獨立的 payers 和 participantIds）
  const [expenses, setExpenses] = useState<ExpenseItemResult[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)

  // 儲存進度
  const [saveProgress, setSaveProgress] = useState({ current: 0, total: 0 })

  // LINE 通知
  const [notifyLine, setNotifyLine] = useState(true)

  // 每筆費用的額外資料（圖片、地點、日期）
  interface ExpenseExtras {
    imageValue: ImagePickerValue
    location: string | null
    latitude: number | null
    longitude: number | null
    expenseDate: Date
  }
  const [expenseExtras, setExpenseExtras] = useState<Record<string, ExpenseExtras>>({})
  const [gettingLocationFor, setGettingLocationFor] = useState<string | null>(null) // 正在獲取位置的費用 ID

  // 重置狀態
  function resetState() {
    setStep("input")
    setTextInput("")
    setRecordedTranscript("")
    setIsTranscribing(false)
    setError(null)
    setDebugInfo(null)
    setDebugExpanded(false)
    setCopied(false)
    setExpenses([])
    setCurrentIndex(0)
    setSaveProgress({ current: 0, total: 0 })
    setExpenseExtras({})
    setNotifyLine(true)
    if (webSpeech.resetTranscript) webSpeech.resetTranscript()
    if (mediaRecorder.reset) mediaRecorder.reset()
    // 清除輸入圖片
    if (inputImage.preview) {
      URL.revokeObjectURL(inputImage.preview)
    }
    setInputImage({ image: null, pendingFile: null, preview: null })
    setParsingImage(false)
  }

  // 複製錯誤訊息
  async function copyDebugInfo() {
    if (!debugInfo) return
    try {
      await navigator.clipboard.writeText(debugInfo)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
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
            imageValue: { image: null, pendingFile: null, preview: null },
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

  // 更新指定費用的圖片
  function updateExpenseImage(expenseId: string, imageValue: ImagePickerValue) {
    setExpenseExtras((prev) => ({
      ...prev,
      [expenseId]: {
        ...prev[expenseId],
        imageValue,
      },
    }))
  }

  // MediaRecorder 轉文字中狀態
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [recordedTranscript, setRecordedTranscript] = useState("")

  // 取得完整輸入文字（文字輸入 + 語音）
  const fullTranscript = textInput + recordedTranscript + webSpeech.transcript + webSpeech.interimTranscript

  // 送出解析
  async function handleParse() {
    const transcript = (textInput + recordedTranscript + webSpeech.transcript).trim()
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
          defaultCurrency: currency,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "解析失敗")
      }

      const parsed: ParseExpensesResult = data.data

      // 填入解析結果（每筆費用已包含獨立的 payers 和 participantIds）
      setExpenses(parsed.expenses)
      setCurrentIndex(0)
      setStep("confirm")
    } catch (err) {
      setError(err instanceof Error ? err.message : "解析失敗，請重試")
      setStep("input")
    }
  }

  // 將 File 轉換為 base64 data URL
  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  // 處理圖片收據辨識
  async function handleImageParse() {
    if (!inputImage.pendingFile) {
      setError("請先選擇或拍攝收據圖片")
      return
    }

    setParsingImage(true)
    setError(null)

    try {
      // 1. 將圖片轉換為 base64
      const imageData = await fileToBase64(inputImage.pendingFile)

      // 2. 調用 AI 解析收據（使用 base64）
      const res = await authFetch("/api/receipt/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageData }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "收據辨識失敗")
      }

      const parsed = data.data as {
        amount: number
        description: string
        category: string
        date: string | null
        confidence: number
      }

      // 3. 轉換為 ExpenseItemResult 格式
      const allMemberIds = members.map((m) => m.id)
      const expense: ExpenseItemResult = {
        id: `receipt-${Date.now()}`,
        amount: parsed.amount,
        description: parsed.description,
        category: parsed.category as ExpenseItemResult["category"],
        currency: currency, // 使用專案預設幣別
        // 收據辨識維持單一付款人（目前使用者、全額）
        payers: [{ memberId: currentUserMemberId, amount: parsed.amount }],
        participantIds: allMemberIds,
        selected: true,
      }

      // 4. 設定費用並進入確認階段
      setExpenses([expense])
      setCurrentIndex(0)
      setStep("confirm")

      // 5. 初始化該費用的額外資料，保留 pendingFile 供儲存時上傳，並使用現有的 preview
      const expenseDate = parsed.date ? new Date(parsed.date) : new Date()
      setExpenseExtras({
        [expense.id]: {
          imageValue: {
            image: null,
            pendingFile: inputImage.pendingFile,
            preview: inputImage.preview,
          },
          location: null,
          latitude: null,
          longitude: null,
          expenseDate,
        },
      })

      // 6. 清除輸入圖片 state（但不 revoke preview，因為已轉移到 expenseExtras）
      setInputImage({ image: null, pendingFile: null, preview: null })
      // 清除 debug info on success
      setDebugInfo(null)
      setDebugExpanded(false)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "收據辨識失敗，請重試"
      setError(errorMessage)

      // 建立詳細的 debug 資訊
      const debugDetails = {
        timestamp: new Date().toISOString(),
        error: errorMessage,
        stack: err instanceof Error ? err.stack : undefined,
        file: inputImage.pendingFile ? {
          name: inputImage.pendingFile.name,
          type: inputImage.pendingFile.type,
          size: `${(inputImage.pendingFile.size / 1024).toFixed(2)} KB`,
        } : null,
      }
      setDebugInfo(JSON.stringify(debugDetails, null, 2))
    } finally {
      setParsingImage(false)
    }
  }

  // 更新費用欄位
  function updateExpense(expenseId: string, field: keyof ExpenseItemResult, value: string | number | string[]) {
    setExpenses((prev) =>
      prev.map((e) => {
        if (e.id !== expenseId) return e
        // 改金額時以均分重新推算付款人，確保合計 = 金額
        if (field === "amount") {
          const amount = Number(value) || 0
          const payerIds = (e.payers ?? []).map((p) => p.memberId)
          return { ...e, amount, payers: derivePayerShares({ amount, payerIds, pinned: {} }).shares }
        }
        return { ...e, [field]: value }
      })
    )
  }

  // 切換單筆費用的付款人（多選；均分）
  function toggleExpensePayer(expenseId: string, memberId: string) {
    setExpenses((prev) =>
      prev.map((e) => {
        if (e.id !== expenseId) return e
        const current = e.payers ?? []
        const has = current.some((p) => p.memberId === memberId)
        const payerIds = has
          ? current.map((p) => p.memberId).filter((id) => id !== memberId)
          : [...current.map((p) => p.memberId), memberId]
        return { ...e, payers: derivePayerShares({ amount: e.amount, payerIds, pinned: {} }).shares }
      })
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
        currency: currency,
        payers: [{ memberId: currentUserMemberId, amount: 50 }],
        participantIds: allMemberIds,
        selected: true,
      },
      {
        id: `test-${Date.now()}-2`,
        amount: 60,
        description: "午餐",
        category: "food" as const,
        currency: currency,
        payers: [{ memberId: currentUserMemberId, amount: 60 }],
        participantIds: allMemberIds,
        selected: true,
      },
      {
        id: `test-${Date.now()}-3`,
        amount: 100,
        description: "晚餐",
        category: "food" as const,
        currency: currency,
        payers: [{ memberId: members[1]?.id || currentUserMemberId, amount: 100 }],
        participantIds: allMemberIds,
        selected: true,
      },
      {
        id: `test-${Date.now()}-4`,
        amount: 90,
        description: "交通",
        category: "transport" as const,
        currency: currency,
        payers: [{ memberId: members[1]?.id || currentUserMemberId, amount: 90 }],
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
      if (!expense.payers || expense.payers.length === 0) {
        setError(`第 ${i + 1} 筆費用請選擇付款人`)
        setCurrentIndex(i)
        return
      }
      const payerSum = expense.payers.reduce((sum, p) => sum + Number(p.amount), 0)
      if (Math.abs(payerSum - expense.amount) > 0.01) {
        setError(`第 ${i + 1} 筆費用的付款金額與支出金額不符`)
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
      // 逐筆儲存，每筆使用獨立的 payers 和 participantIds
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
          imageValue: { image: null, pendingFile: null, preview: null },
          location: null,
          latitude: null,
          longitude: null,
          expenseDate: new Date(),
        }

        // 如果有待上傳的圖片，先上傳到 R2
        let finalImageUrl = extras.imageValue.image
        if (extras.imageValue.pendingFile) {
          try {
            const result = await uploadImageToR2(extras.imageValue.pendingFile, projectId, authFetch)
            finalImageUrl = result.url
          } catch (error) {
            console.error(`第 ${i + 1} 筆圖片上傳失敗:`, error)
            // 圖片上傳失敗不阻止儲存，繼續執行
          }
        }

        const res = await authFetch(`/api/projects/${projectId}/expenses`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            payers: expense.payers,
            amount: expense.amount,
            currency: expense.currency,
            description: expense.description.trim() || null,
            category: expense.category,
            image: finalImageUrl,
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

      // 發送 LINE 通知（檢查用戶偏好）
      if (notifyLine && canSendMessages && !isDevMode && expenses.length > 0 && userPreferences.notifications.expenseCreated) {
        if (expenses.length === 1) {
          // 單筆時使用單筆模板
          const expense = expenses[0]
          sendExpenseNotificationToChat({
            operationType: "create",
            projectName,
            projectId,
            payerName: members.find((m) => m.id === primaryPayerId(expense.payers))?.displayName || "未知",
            amount: expense.amount,
            description: expense.description || undefined,
            category: expense.category || undefined,
            participantCount: expense.participantIds.length,
          }).catch(() => {
            // 發送失敗時靜默處理，不影響使用者體驗
          })
        } else {
          // 多筆時使用批次模板
          sendBatchExpenseNotificationToChat({
            projectName,
            projectId,
            expenses: expenses.map((expense) => ({
              amount: expense.amount,
              description: expense.description || undefined,
              category: expense.category || undefined,
              payerName: members.find((m) => m.id === primaryPayerId(expense.payers))?.displayName || "未知",
              participantCount: expense.participantIds.length,
            })),
          }).catch(() => {
            // 發送失敗時靜默處理，不影響使用者體驗
          })
        }
      }

      onSuccess()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "儲存失敗，請重試")
      setStep("confirm")
    }
  }

  // 當 MediaRecorder 錄音完成時，自動轉文字
  useEffect(() => {
    if (useMediaRecorder && mediaRecorder.audioBlob && !isTranscribing) {
      handleTranscribe(mediaRecorder.audioBlob)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaRecorder.audioBlob, useMediaRecorder])

  // 將錄音轉成文字
  async function handleTranscribe(audioBlob: Blob) {
    setIsTranscribing(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("file", audioBlob, "audio.webm")

      const res = await authFetch("/api/voice/transcribe", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "轉換失敗")
      }

      setRecordedTranscript(prev => prev + data.text)
      mediaRecorder.reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : "語音轉文字失敗")
    } finally {
      setIsTranscribing(false)
    }
  }

  // 切換錄音
  function toggleRecording() {
    if (webSpeech.isRecording || mediaRecorder.isRecording) {
      if (useMediaRecorder) {
        mediaRecorder.stopRecording()
      } else {
        webSpeech.stopRecording()
      }
    } else {
      if (useMediaRecorder) {
        mediaRecorder.startRecording()
      } else {
        webSpeech.startRecording()
      }
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
                <PopoverContent side="bottom" align="center" sideOffset={4} collisionPadding={16} className="w-auto max-w-[280px] p-3 text-xs">
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
                    setRecordedTranscript("")
                    webSpeech.resetTranscript()
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
                  setRecordedTranscript("")
                  webSpeech.resetTranscript()
                }}
                className="min-h-[100px] resize-none pr-8"
              />
              {fullTranscript && (
                <button
                  type="button"
                  onClick={() => {
                    setTextInput("")
                    setRecordedTranscript("")
                    webSpeech.resetTranscript()
                  }}
                  className="absolute top-2 right-2 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* 語音按鈕 */}
            <div className="flex flex-col items-center gap-3">
              {/* 轉文字中提示 */}
              {isTranscribing && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>AI 轉文字中...</span>
                </div>
              )}

              {/* Debug 模式顯示使用的引擎 */}
              {process.env.NODE_ENV === "development" && (
                <div className="text-xs text-muted-foreground">
                  {useMediaRecorder ? "📱 MediaRecorder + Groq" : "🎤 Web Speech API"}
                </div>
              )}

              {webSpeech.isSupported || mediaRecorder.isSupported ? (
                // 支援語音輸入 - 水平排列
                <div className="flex items-center justify-center gap-3">
                  <Button
                    type="button"
                    variant={(webSpeech.isRecording || mediaRecorder.isRecording) ? "destructive" : "outline"}
                    size="lg"
                    className="gap-2"
                    onClick={toggleRecording}
                    disabled={isTranscribing}
                  >
                    {(webSpeech.isRecording || mediaRecorder.isRecording) ? (
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
              ) : webSpeech.platform.isIOS && (webSpeech.platform.isLIFF || webSpeech.platform.isWKWebView) ? (
                // iOS LIFF/WKWebView - 垂直排列，提供複製連結
                <div className="flex flex-col items-center gap-2 w-full">
                  <p className="text-xs text-muted-foreground text-center">
                    LINE 內無法使用語音，請在 Safari 開啟
                  </p>
                  <div className="flex items-center gap-2 w-full">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 gap-2 text-xs"
                      onClick={async () => {
                        // 複製連結到剪貼簿
                        try {
                          await navigator.clipboard.writeText(window.location.href)
                          alert("已複製連結，請在 Safari 中貼上開啟")
                        } catch {
                          // fallback: 顯示連結讓用戶手動複製
                          prompt("請複製此連結並在 Safari 中開啟：", window.location.href)
                        }
                      }}
                    >
                      <Copy className="h-4 w-4" />
                      複製連結
                    </Button>
                    <Button
                      type="button"
                      onClick={handleParse}
                      disabled={!fullTranscript.trim()}
                      className="flex-1 gap-2"
                    >
                      <Sparkles className="h-4 w-4" />
                      AI 解析
                    </Button>
                  </div>
                </div>
              ) : (
                // 其他不支援的情況
                <div className="flex flex-col items-center gap-2 w-full">
                  <p className="text-sm text-muted-foreground">
                    {webSpeech.platform.isIOS ? "請使用鍵盤上的 🎤 語音輸入" : "您的瀏覽器不支援語音輸入"}
                  </p>
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
              )}
            </div>

            {/* 分隔線 */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-700" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-background text-muted-foreground">或掃描收據</span>
              </div>
            </div>

            {/* 收據圖片上傳 */}
            {inputImage.preview ? (
              <div className="space-y-3">
                <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={inputImage.preview}
                    alt="收據預覽"
                    className="w-full h-auto max-h-48 object-contain bg-slate-50 dark:bg-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (inputImage.preview) {
                        URL.revokeObjectURL(inputImage.preview)
                      }
                      setInputImage({ image: null, pendingFile: null, preview: null })
                    }}
                    disabled={parsingImage}
                    className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/50 hover:bg-black/70 disabled:opacity-50 flex items-center justify-center text-white transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <Button
                  type="button"
                  onClick={handleImageParse}
                  disabled={parsingImage}
                  className="w-full gap-2"
                >
                  {parsingImage ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      AI 辨識中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      AI 收據辨識
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <ImagePicker
                value={inputImage}
                onChange={setInputImage}
                disabled={parsingImage}
              />
            )}

            {/* 錄音中動畫 */}
            {(webSpeech.isRecording || mediaRecorder.isRecording) && (
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center justify-center gap-2 text-destructive">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
                  </span>
                  <span className="text-sm">錄音中...</span>
                </div>
                {/* iOS Safari 提示：說完會自動停止 */}
                {!useMediaRecorder && webSpeech.platform.isIOS && webSpeech.supportStatus.reason === "ios-safari" && (
                  <span className="text-xs text-muted-foreground">說完後會自動停止</span>
                )}
              </div>
            )}

            {/* 錯誤訊息與 Debug 區塊 */}
            {(error || webSpeech.error || mediaRecorder.error) && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/5 overflow-hidden">
                {/* 錯誤摘要 */}
                <div className="px-3 py-2 flex items-center justify-between gap-2">
                  <p className="text-sm text-destructive flex-1">
                    {error || webSpeech.error || mediaRecorder.error}
                  </p>
                  {/* Debug 展開按鈕 - 僅開發環境顯示 */}
                  {process.env.NODE_ENV === "development" && debugInfo && (
                    <button
                      type="button"
                      onClick={() => setDebugExpanded(!debugExpanded)}
                      className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {debugExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>

                {/* Debug 詳細資訊 - 僅開發環境顯示 */}
                {process.env.NODE_ENV === "development" && debugInfo && debugExpanded && (
                  <div className="border-t border-destructive/30 bg-slate-900 dark:bg-slate-950">
                    <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-700">
                      <span className="text-xs text-slate-400">Debug Info</span>
                      <button
                        type="button"
                        onClick={copyDebugInfo}
                        className="flex items-center gap-1 px-2 py-0.5 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors"
                      >
                        {copied ? (
                          <>
                            <Check className="h-3 w-3" />
                            已複製
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            複製
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="p-3 text-xs text-slate-300 overflow-x-auto max-h-40 overflow-y-auto font-mono whitespace-pre-wrap break-all">
                      {debugInfo}
                    </pre>
                  </div>
                )}
              </div>
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

                              {/* 金額與幣別 */}
                              <div className="flex items-stretch gap-2">
                                <CurrencySelect
                                  value={expense.currency as CurrencyCode}
                                  onChange={(value) => updateExpense(expense.id, "currency", value)}
                                  showName={false}
                                  className="w-24 text-lg font-bold"
                                />
                                <Input
                                  type="number"
                                  value={expense.amount}
                                  onChange={(e) => updateExpense(expense.id, "amount", Number(e.target.value))}
                                  className="text-2xl font-bold flex-1"
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

                            {/* 付款人（多選） */}
                            <div>
                              <label className="block text-xs text-muted-foreground mb-2">
                                誰付的錢？（{expense.payers.length}人）
                              </label>
                              <div role="group" aria-label="付款成員" className="flex flex-wrap gap-1.5">
                                {members.map((member) => {
                                  const avatarData = parseAvatarString(member.user?.image)
                                  const isSelected = expense.payers.some((p) => p.memberId === member.id)
                                  return (
                                    <button
                                      key={member.id}
                                      type="button"
                                      onClick={() => toggleExpensePayer(expense.id, member.id)}
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
                                幫誰付？（{expense.participantIds.length}人均分 · 每人 {expense.currency} {expense.participantIds.length > 0 ? Math.round(expense.amount / expense.participantIds.length) : 0}）
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
                                  className="flex-1 min-w-0 flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-sm hover:border-primary/50 transition-colors text-left overflow-hidden"
                                >
                                  {gettingLocationFor === expense.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground flex-shrink-0" />
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
                              <ImagePicker
                                value={expenseExtras[expense.id]?.imageValue || { image: null, pendingFile: null, preview: null }}
                                onChange={(value) => updateExpenseImage(expense.id, value)}
                              />
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

                {/* 總計 */}
                <div className="flex items-center justify-between py-2 px-3 bg-primary/5 rounded-xl">
                  <span className="text-sm text-muted-foreground">
                    共 {expenses.length} 筆
                  </span>
                  <span className="text-lg font-bold text-primary">
                    {formatCurrency(totalAmount, currency)}
                  </span>
                </div>

                {/* LINE 通知選項 - 只在可以發送時顯示 */}
                {canSendMessages && !isDevMode && (
                  <label className="flex items-center gap-3 cursor-pointer py-2 px-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                    <Checkbox
                      checked={notifyLine}
                      onCheckedChange={(checked) => setNotifyLine(checked === true)}
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium">通知 LINE 群組</span>
                      <p className="text-xs text-muted-foreground">新增後自動發送通知到群組</p>
                    </div>
                  </label>
                )}

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
/* c8 ignore stop */
