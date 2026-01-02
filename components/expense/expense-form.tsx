"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { AppLayout } from "@/components/layout/app-layout"
import { useAuthFetch, useLiff } from "@/components/auth/liff-provider"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { zhTW } from "date-fns/locale"
import { MemberAvatar } from "@/components/member-avatar"
import { sendExpenseNotificationToChat, sendDeleteNotificationToChat, ExpenseChange } from "@/lib/liff"
import { uploadImageToR2 } from "@/lib/image-utils"
import { LocationPicker } from "@/components/location-picker"
import { Calculator as CalculatorIcon, CalendarIcon, Trash2 } from "lucide-react"
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog"
import { ImagePicker, type ImagePickerValue } from "@/components/ui/image-picker"
import { Calculator } from "@/components/ui/calculator"
import { CATEGORIES, EXPENSE_CATEGORIES } from "@/lib/constants/expenses"

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
  image: string | null
  location: string | null
  latitude: number | null
  longitude: number | null
  expenseDate: string
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

interface OriginalExpenseData {
  amount: number
  description: string | null
  category: string | null
  paidByMemberId: string
  payerName: string
  expenseDate: Date
  location: string | null
  image: string | null
  participantIds: Set<string>
}


interface ExpenseFormProps {
  projectId: string
  expenseId?: string
  mode: "create" | "edit"
}

export function ExpenseForm({ projectId, expenseId, mode }: ExpenseFormProps) {
  const router = useRouter()
  const authFetch = useAuthFetch()
  const { isDevMode, canSendMessages } = useLiff()

  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [category, setCategory] = useState("")
  const [customCategory, setCustomCategory] = useState("")
  const [paidBy, setPaidBy] = useState("")
  const [expenseDate, setExpenseDate] = useState<Date>(new Date())
  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(new Set())
  const [splitMode, setSplitMode] = useState<"equal" | "custom">("equal")
  const [customShares, setCustomShares] = useState<Record<string, string>>({})

  // 圖片上傳相關狀態
  const [imageValue, setImageValue] = useState<ImagePickerValue>({
    image: null,
    pendingFile: null,
    preview: null,
  })
  const [uploadingImage, setUploadingImage] = useState(false)

  // 位置相關狀態
  const [locationData, setLocationData] = useState<{
    location: string | null
    latitude: number | null
    longitude: number | null
  }>({ location: null, latitude: null, longitude: null })

  // LINE 通知相關狀態
  const [notifyLine, setNotifyLine] = useState(true)
  const [projectName, setProjectName] = useState("")

  // 編輯模式下的原始資料（用於計算變更）
  const [originalData, setOriginalData] = useState<OriginalExpenseData | null>(null)

  // 刪除相關狀態
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // 計算機狀態
  const [showCalculator, setShowCalculator] = useState(false)

  // 自動獲取當下地點
  const getCurrentLocation = useCallback(async () => {
    if (!navigator.geolocation) return

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
        setLocationData({
          location: data.displayName,
          latitude: data.lat,
          longitude: data.lon,
        })
      } else {
        setLocationData({
          location: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
          latitude,
          longitude,
        })
      }
    } catch {
      // 靜默失敗，不影響使用
    }
  }, [])

  useEffect(() => {
    if (mode === "create") {
      fetchProjectAndMembers()
      // 新增模式時自動獲取當下地點
      getCurrentLocation()
    } else {
      fetchExpenseData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, expenseId, mode])

  async function fetchProjectAndMembers() {
    try {
      const [projectRes, membersRes] = await Promise.all([
        authFetch(`/api/projects/${projectId}`),
        authFetch(`/api/projects/${projectId}/members`),
      ])

      if (projectRes.ok) {
        const projectData = await projectRes.json()
        setProjectName(projectData.name)
      }

      if (membersRes.ok) {
        const data = await membersRes.json()
        setMembers(data)
        const allMemberIds = new Set<string>(data.map((m: Member) => m.id))
        setSelectedParticipants(allMemberIds)
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

  async function fetchExpenseData() {
    try {
      const [expenseRes, membersRes, projectRes] = await Promise.all([
        authFetch(`/api/projects/${projectId}/expenses/${expenseId}`),
        authFetch(`/api/projects/${projectId}/members`),
        authFetch(`/api/projects/${projectId}`),
      ])

      if (membersRes.ok) {
        const membersData = await membersRes.json()
        setMembers(membersData)
      }

      if (projectRes.ok) {
        const projectData = await projectRes.json()
        setProjectName(projectData.name)
      }

      if (expenseRes.ok) {
        const expense: Expense = await expenseRes.json()

        setDescription(expense.description || "")
        setAmount(String(expense.amount))
        setImageValue({
          image: expense.image || null,
          pendingFile: null,
          preview: null,
        })
        setLocationData({
          location: expense.location || null,
          latitude: expense.latitude || null,
          longitude: expense.longitude || null,
        })
        // 檢查是否為預設類別，如果不是則設為「其他」並填入自訂值
        const isValidCategory = expense.category && (EXPENSE_CATEGORIES as readonly string[]).includes(expense.category)
        if (expense.category && !isValidCategory) {
          setCategory("other")
          setCustomCategory(expense.category)
        } else {
          setCategory(expense.category || "")
        }
        setPaidBy(expense.payer.id)
        setExpenseDate(expense.expenseDate ? new Date(expense.expenseDate) : new Date())

        const participantIds = new Set<string>(expense.participants.map(p => p.member.id))
        setSelectedParticipants(participantIds)

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

        // 儲存原始資料用於計算變更
        setOriginalData({
          amount: expense.amount,
          description: expense.description,
          category: expense.category,
          paidByMemberId: expense.payer.id,
          payerName: expense.payer.displayName,
          expenseDate: expense.expenseDate ? new Date(expense.expenseDate) : new Date(),
          location: expense.location,
          image: expense.image,
          participantIds: new Set(expense.participants.map(p => p.member.id)),
        })
      } else {
        alert("無法載入支出資料")
        router.push(`/projects/${projectId}/expenses`)
      }
    } catch (error) {
      console.error("獲取資料錯誤:", error)
      alert("載入失敗")
      router.push(`/projects/${projectId}/expenses`)
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

  // 計算編輯時的變更內容
  function calculateChanges(
    finalCategory: string,
    finalImageUrl: string | null,
    amountNum: number
  ): ExpenseChange[] {
    if (!originalData || mode !== "edit") return []

    const changes: ExpenseChange[] = []

    // 金額變更
    if (originalData.amount !== amountNum) {
      changes.push({
        field: "amount",
        label: "金額",
        oldValue: `$${originalData.amount.toLocaleString("zh-TW")}`,
        newValue: `$${amountNum.toLocaleString("zh-TW")}`,
      })
    }

    // 描述變更
    const newDescription = description.trim() || null
    if (originalData.description !== newDescription) {
      changes.push({
        field: "description",
        label: "描述",
        oldValue: originalData.description || "無",
        newValue: newDescription || "無",
      })
    }

    // 類別變更
    if (originalData.category !== finalCategory) {
      const getCategoryLabel = (cat: string | null) => {
        if (!cat) return "其他"
        const found = CATEGORIES.find(c => c.value === cat)
        return found ? found.label : cat
      }
      changes.push({
        field: "category",
        label: "類別",
        oldValue: getCategoryLabel(originalData.category),
        newValue: getCategoryLabel(finalCategory),
      })
    }

    // 付款人變更
    if (originalData.paidByMemberId !== paidBy) {
      const newPayerMember = members.find(m => m.id === paidBy)
      changes.push({
        field: "payer",
        label: "付款人",
        oldValue: originalData.payerName,
        newValue: newPayerMember?.displayName || "未知",
      })
    }

    // 日期變更
    const originalDateStr = format(originalData.expenseDate, "yyyy/MM/dd")
    const newDateStr = format(expenseDate, "yyyy/MM/dd")
    if (originalDateStr !== newDateStr) {
      changes.push({
        field: "date",
        label: "日期",
        oldValue: originalDateStr,
        newValue: newDateStr,
      })
    }

    // 地點變更
    if (originalData.location !== locationData.location) {
      changes.push({
        field: "location",
        label: "地點",
        oldValue: originalData.location || "無",
        newValue: locationData.location || "無",
      })
    }

    // 圖片變更
    const hasImageChanged = originalData.image !== finalImageUrl
    if (hasImageChanged) {
      changes.push({
        field: "image",
        label: "圖片",
        oldValue: originalData.image ? "有圖片" : "無",
        newValue: finalImageUrl ? "有圖片" : "無",
      })
    }

    // 分攤者變更
    const originalIds = Array.from(originalData.participantIds).sort()
    const newIds = Array.from(selectedParticipants).sort()
    const participantsChanged = originalIds.length !== newIds.length ||
      originalIds.some((id, i) => id !== newIds[i])

    if (participantsChanged) {
      changes.push({
        field: "participants",
        label: "分攤者",
        oldValue: `${originalData.participantIds.size}人`,
        newValue: `${selectedParticipants.size}人`,
      })
    }

    return changes
  }

  // 檢查是否有任何變更（用於編輯模式下的儲存按鈕）
  function hasChanges(): boolean {
    if (!originalData || mode !== "edit") return true // 新增模式永遠可以儲存

    const amountNum = Number(amount) || 0
    const newDescription = description.trim() || null

    // 計算 finalCategory（與 handleSubmit 中相同邏輯）
    const finalCategory = category === "other" && customCategory.trim()
      ? customCategory.trim()
      : category || "other"

    // 金額變更
    if (originalData.amount !== amountNum) return true

    // 描述變更
    if (originalData.description !== newDescription) return true

    // 類別變更
    if (originalData.category !== finalCategory) return true

    // 付款人變更
    if (originalData.paidByMemberId !== paidBy) return true

    // 日期變更
    const originalDateStr = format(originalData.expenseDate, "yyyy/MM/dd")
    const newDateStr = format(expenseDate, "yyyy/MM/dd")
    if (originalDateStr !== newDateStr) return true

    // 地點變更
    if (originalData.location !== locationData.location) return true

    // 圖片變更（有待上傳圖片或圖片 URL 不同）
    if (imageValue.pendingFile) return true
    if (originalData.image !== imageValue.image) return true

    // 分攤者變更
    const originalIds = Array.from(originalData.participantIds).sort()
    const newIds = Array.from(selectedParticipants).sort()
    if (originalIds.length !== newIds.length) return true
    if (originalIds.some((id, i) => id !== newIds[i])) return true

    return false
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const amountNum = Number(amount)
    if (isNaN(amountNum) || amountNum < 0) {
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
      // 如果有待上傳的圖片，先上傳到 R2
      let finalImageUrl = imageValue.image
      if (imageValue.pendingFile) {
        setUploadingImage(true)
        try {
          const result = await uploadImageToR2(imageValue.pendingFile, projectId, authFetch)
          finalImageUrl = result.url
        } catch (error) {
          console.error("圖片上傳失敗:", error)
          alert("圖片上傳失敗，請重試")
          setUploadingImage(false)
          setSubmitting(false)
          return
        }
        setUploadingImage(false)
      }

      const url = mode === "create"
        ? `/api/projects/${projectId}/expenses`
        : `/api/projects/${projectId}/expenses/${expenseId}`

      // 如果選擇「其他」且有自訂類別，使用自訂類別；未選擇類別預設為 other
      const finalCategory = category === "other" && customCategory.trim()
        ? customCategory.trim()
        : category || "other"

      const res = await authFetch(url, {
        method: mode === "create" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paidByMemberId: paidBy,
          amount: amountNum,
          description: description.trim() || null,
          category: finalCategory,
          image: finalImageUrl || null,
          location: locationData.location,
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          expenseDate: expenseDate.toISOString(),
          participants,
        }),
      })

      if (res.ok) {
        // 如果勾選了通知且可以發送訊息，則發送通知
        if (notifyLine && canSendMessages && !isDevMode) {
          const payerMember = members.find((m) => m.id === paidBy)
          const payerName = payerMember?.displayName || "未知"
          const operationType: "create" | "update" = mode === "create" ? "create" : "update"

          // 計算變更內容（編輯模式）
          const changes = calculateChanges(finalCategory, finalImageUrl, amountNum)

          sendExpenseNotificationToChat({
            operationType,
            projectName,
            projectId,
            payerName,
            amount: amountNum,
            description: description.trim() || undefined,
            category: finalCategory || undefined,
            participantCount: participants.length,
            changes: changes.length > 0 ? changes : undefined,
          }).catch(() => {
            // 發送失敗時靜默處理，不影響使用者體驗
          })
        }

        router.push(`/projects/${projectId}/expenses`)
      } else {
        const data = await res.json()
        alert(data.error || (mode === "create" ? "新增失敗" : "更新失敗"))
      }
    } catch (error) {
      console.error(mode === "create" ? "新增支出錯誤:" : "更新支出錯誤:", error)
      alert(mode === "create" ? "新增失敗" : "更新失敗")
    } finally {
      setSubmitting(false)
    }
  }

  // 刪除支出
  async function handleDelete() {
    if (!expenseId || mode !== "edit") return

    setDeleting(true)
    try {
      const res = await authFetch(`/api/projects/${projectId}/expenses/${expenseId}`, {
        method: "DELETE",
      })

      if (res.ok) {
        // 發送 LINE 通知
        if (notifyLine && canSendMessages && !isDevMode && originalData) {
          const payerMember = members.find((m) => m.id === originalData.paidByMemberId)
          sendDeleteNotificationToChat({
            projectName,
            projectId,
            payerName: payerMember?.displayName || originalData.payerName,
            amount: originalData.amount,
            description: originalData.description || undefined,
            category: originalData.category || undefined,
            participantCount: originalData.participantIds.size,
          }).catch(() => {
            // 發送失敗時靜默處理
          })
        }

        router.push(`/projects/${projectId}/expenses`)
      } else {
        const data = await res.json()
        alert(data.error || "刪除失敗")
      }
    } catch (error) {
      console.error("刪除支出錯誤:", error)
      alert("刪除失敗")
    } finally {
      setDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  // 移除圖片時的額外處理（刪除 R2 上的圖片）
  async function handleRemoveImage() {
    if (mode === "edit" && imageValue.image && imageValue.image.includes("r2.dev")) {
      try {
        await authFetch(`/api/upload?url=${encodeURIComponent(imageValue.image)}`, {
          method: "DELETE",
        })
      } catch (error) {
        console.error("刪除圖片失敗:", error)
      }
    }
  }

  const title = mode === "create" ? "新增支出" : "編輯支出"
  const backHref = mode === "create" ? `/projects/${projectId}` : `/projects/${projectId}/expenses`
  const submitText = mode === "create" ? "儲存支出" : "儲存變更"

  if (loading) {
    return (
      <AppLayout title={title} showBack backHref={backHref}>
        <div className="text-center py-8 text-muted-foreground">載入中...</div>
      </AppLayout>
    )
  }

  const amountNum = Number(amount) || 0
  const sharePerPerson = selectedParticipants.size > 0 ? amountNum / selectedParticipants.size : 0

  return (
    <AppLayout title={title} showBack backHref={backHref}>
      <form onSubmit={handleSubmit} className="space-y-5 pb-40">
        {/* 編輯模式顯示刪除按鈕 */}
        {mode === "edit" && (
          <div className="flex justify-end -mb-2">
            <button
              type="button"
              onClick={() => setShowDeleteDialog(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              刪除此筆
            </button>
          </div>
        )}

        {/* 金額輸入區 */}
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
              <CalculatorIcon className="h-3.5 w-3.5" />
              計算機
            </button>
          </div>

          {showCalculator ? (
            <Calculator
              initialValue={amount}
              onApply={(value) => setAmount(value.toString())}
              onClose={() => setShowCalculator(false)}
            />
          ) : (
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
        <div>
          <label className="block text-sm font-medium mb-3">描述</label>
          <Input
            placeholder="例如：午餐、計程車費"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="bg-white dark:bg-slate-900 rounded-xl px-4 py-3 border border-slate-200 dark:border-slate-800"
          />
        </div>

        {/* 類別 */}
        <div>
          <label className="block text-sm font-medium mb-3">類別</label>
          <div className="grid grid-cols-4 gap-2">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon
              const isSelected = category === cat.value
              return (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => {
                    if (category === cat.value) {
                      setCategory("")
                      if (cat.value === "other") setCustomCategory("")
                    } else {
                      setCategory(cat.value)
                    }
                  }}
                  className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-full transition-all ${
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
          {category === "other" && (
            <div className="mt-3">
              <Input
                placeholder="輸入自訂類別（最多4字）"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                maxLength={4}
                className="h-10"
                autoFocus
              />
            </div>
          )}
        </div>

        {/* 付款人 */}
        <div>
          <label className="block text-sm font-medium mb-3">誰付的錢？</label>
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              沒有成員，請先新增成員
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {members.map((member) => {
                const isSelected = paidBy === member.id
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => setPaidBy(member.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all ${
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-primary/50"
                    }`}
                  >
                    <MemberAvatar
                      image={member.user?.image}
                      name={member.displayName}
                      size="sm"
                      selected={isSelected}
                    />
                    <span className="text-xs font-medium">{member.displayName}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* 分擔者（含分擔方式） */}
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

          {/* 分擔方式切換 */}
          <div className="flex gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg mb-3">
            <button
              type="button"
              onClick={() => setSplitMode("equal")}
              className={`flex-1 py-2 rounded-md text-xs font-medium transition-all ${
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
              className={`flex-1 py-2 rounded-md text-xs font-medium transition-all ${
                splitMode === "custom"
                  ? "bg-white dark:bg-slate-900 shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              自訂金額
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
                      <MemberAvatar
                        image={member.user?.image}
                        name={member.displayName}
                        size="md"
                      />
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

          {/* 底部資訊 */}
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <span>已選 {selectedParticipants.size} 人</span>
            {splitMode === "custom" && amountNum > 0 && (
              <span className={getCustomSharesTotal() === amountNum ? "text-emerald-600" : "text-red-500"}>
                ${getCustomSharesTotal().toFixed(2)} / ${amountNum.toFixed(2)}
                {getCustomSharesTotal() !== amountNum && (
                  <span className="ml-1">
                    ({getCustomSharesTotal() > amountNum ? "超出" : "還差"} ${Math.abs(getCustomSharesTotal() - amountNum).toFixed(2)})
                  </span>
                )}
              </span>
            )}
          </div>
        </div>

        {/* 分隔線 */}
        <hr className="border-slate-200 dark:border-slate-800" />

        {/* 支出日期 */}
        <div>
          <label className="block text-sm font-medium mb-3">支出日期</label>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 px-4 py-3 w-full text-left bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-primary/50 transition-colors"
              >
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{format(expenseDate, "yyyy/MM/dd (EEEE)", { locale: zhTW })}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={expenseDate}
                onSelect={(date) => date && setExpenseDate(date)}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* 消費地點 */}
        <div>
          <label className="block text-sm font-medium mb-3">消費地點</label>
          <LocationPicker
            value={locationData}
            onChange={setLocationData}
          />
        </div>

        {/* 收據/消費圖片 */}
        <div>
          <label className="block text-sm font-medium mb-3">收據/消費圖片</label>
          <ImagePicker
            value={imageValue}
            onChange={setImageValue}
            onRemove={handleRemoveImage}
            disabled={uploadingImage}
          />
        </div>

        {/* LINE 通知選項 - 只在可以發送時顯示 */}
        {canSendMessages && !isDevMode && (
          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={notifyLine}
                onCheckedChange={(checked) => setNotifyLine(checked === true)}
              />
              <div>
                <span className="text-sm font-medium">通知 LINE 群組</span>
                <p className="text-xs text-muted-foreground">儲存後自動發送通知到群組</p>
              </div>
            </label>
          </div>
        )}

        {/* 固定在底部的按鈕 */}
        {!showCalculator && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t border-slate-200 dark:border-slate-800">
            <div className="max-w-screen-2xl mx-auto flex gap-3">
              <Link href={backHref} className="flex-1">
                <Button type="button" variant="outline" className="w-full h-12">
                  取消
                </Button>
              </Link>
              <Button
                type="submit"
                className="flex-1 h-12"
                disabled={submitting || uploadingImage || !hasChanges()}
              >
                {uploadingImage ? "上傳圖片中..." : submitting ? "儲存中..." : !hasChanges() ? "無變更" : submitText}
              </Button>
            </div>
          </div>
        )}
      </form>

      {/* 刪除確認對話框 */}
      <ConfirmDeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        description="確定要刪除這筆支出嗎？此操作無法復原。"
        onConfirm={handleDelete}
        loading={deleting}
      >
        {canSendMessages && !isDevMode && (
          <label className="flex items-center gap-3 cursor-pointer py-2">
            <Checkbox
              checked={notifyLine}
              onCheckedChange={(checked) => setNotifyLine(checked === true)}
            />
            <div>
              <span className="text-sm font-medium">通知 LINE 群組</span>
              <p className="text-xs text-muted-foreground">刪除後自動發送通知到群組</p>
            </div>
          </label>
        )}
      </ConfirmDeleteDialog>
    </AppLayout>
  )
}
