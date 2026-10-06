/* c8 ignore start */
"use client"

import { useEffect, useState } from "react"
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
import { LocationPicker } from "@/components/location-picker"
import { Calculator as CalculatorIcon, CalendarIcon, Trash2, Plus, X, Pin, PinOff, CheckCircle2 } from "lucide-react"
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog"
import { ImagePicker, type ImagePickerValue } from "@/components/ui/image-picker"
import { Calculator } from "@/components/ui/calculator"
import { CurrencySelect } from "@/components/ui/currency-select"
import { CATEGORIES, EXPENSE_CATEGORIES } from "@/lib/constants/expenses"
import { type CurrencyCode, DEFAULT_CURRENCY, formatCurrency } from "@/lib/constants/currencies"
import { mergePreferences } from "@/types/user-preferences"
import {
  buildSplitDetail,
  computeShares,
  getV1SplitMode,
  isSameSplitDetail,
  splitDetailToInput,
  type ParticipantShare,
  type SplitDetail,
  type SplitInput,
} from "@/lib/expense-split"
import { buildExpenseChanges, type ExpenseSnapshot } from "@/lib/expense-changes"
import { derivePayerShares, primaryPayerId, PAYER_ERROR, type PayerShare } from "@/lib/expense-payers"
import { useSaveExpense } from "@/lib/hooks/useSaveExpense"
import { getCurrentLocation } from "@/lib/geolocation"

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

interface ExpensePayer {
  id: string
  expenseId: string
  memberId: string
  amount: number
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
  currency: string | null
  description: string | null
  category: string | null
  image: string | null
  location: string | null
  latitude: number | null
  longitude: number | null
  expenseDate: string
  payers: ExpensePayer[]
  participants: ExpenseParticipant[]
  splitDetail?: SplitDetail | null
}

interface OriginalExpenseData {
  amount: number
  currency: string
  description: string | null
  category: string | null
  payers: PayerShare[]
  payerLabel: string
  expenseDate: Date
  location: string | null
  image: string | null
  participantIds: Set<string>
  participantShares: Map<string, number> // memberId -> shareAmount
}


// Must match the splitDetail limits enforced by the API (lib/expense-split.ts)
const MAX_PERSONAL_ITEMS = 20
const MAX_PERSONAL_ITEM_NAME = 30

interface ExpenseFormProps {
  projectId: string
  expenseId?: string
  mode: "create" | "edit"
}

export function ExpenseForm({ projectId, expenseId, mode }: ExpenseFormProps) {
  const router = useRouter()
  const authFetch = useAuthFetch()
  const { isDevMode, canSendMessages, user } = useLiff()

  // 獲取用戶偏好設定
  const userPreferences = mergePreferences(user?.preferences)

  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const { save, remove, saving: submitting, uploadingImage, deleting: removing } = useSaveExpense(projectId)

  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [category, setCategory] = useState("")
  const [customCategory, setCustomCategory] = useState("")
  // 付款人：多選（payerIds 含順序）+ 自訂（pin）金額（不存在 = 自動均分）
  const [payerIds, setPayerIds] = useState<string[]>([])
  const [pinnedPayerAmounts, setPinnedPayerAmounts] = useState<Record<string, string>>({})
  const [expenseDate, setExpenseDate] = useState<Date>(new Date())
  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(new Set())
  const [splitMode, setSplitMode] = useState<"equal" | "custom">("equal")
  const [customShares, setCustomShares] = useState<Record<string, string>>({})
  const [fixedMembers, setFixedMembers] = useState<Set<string>>(new Set())

  // 個人項目 + 均攤模式相關狀態
  const [customMode, setCustomMode] = useState<"full" | "personal">("full")

  // 個人項目資料結構：{ memberId: [{ id, name, amount }, ...] }
  interface PersonalItem {
    id: string
    name: string
    amount: string
  }
  const [personalItems, setPersonalItems] = useState<Record<string, PersonalItem[]>>({})

  // 圖片上傳相關狀態
  const [imageValue, setImageValue] = useState<ImagePickerValue>({
    image: null,
    pendingFile: null,
    preview: null,
  })

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

  // Split detail baseline used for change detection, and read-only guard
  // for expenses whose split cannot be represented by the v1 form.
  const [originalSplitDetail, setOriginalSplitDetail] = useState<SplitDetail | null>(null)
  const [readOnlyReason, setReadOnlyReason] = useState<string | null>(null)

  // 待刪除的圖片 URL（儲存成功後才實際刪除）
  const [pendingImageDelete, setPendingImageDelete] = useState<string | null>(null)

  // 計算機狀態
  const [showCalculator, setShowCalculator] = useState(false)

  // 幣別相關狀態
  const [currency, setCurrency] = useState<CurrencyCode>(DEFAULT_CURRENCY)
  const [projectCurrency, setProjectCurrency] = useState<CurrencyCode>(DEFAULT_CURRENCY)
  const [exchangeRate, setExchangeRate] = useState<number | null>(null)
  const [customRates, setCustomRates] = useState<Record<string, number> | null>(null)
  const [isCustomRate, setIsCustomRate] = useState(false)
  const [precision, setPrecision] = useState(2)

  useEffect(() => {
    if (mode === "create") {
      fetchProjectAndMembers()
      // 新增模式時自動獲取當下地點
      getCurrentLocation().then((loc) => {
        if (loc) setLocationData(loc)
      })
    } else {
      fetchExpenseData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, expenseId, mode])

  // 當幣別變更時，獲取匯率（優先使用自訂匯率）
  useEffect(() => {
    async function fetchExchangeRate() {
      if (currency === projectCurrency) {
        setExchangeRate(null)
        setIsCustomRate(false)
        return
      }

      // 優先使用自訂匯率
      if (customRates && customRates[currency]) {
        setExchangeRate(customRates[currency])
        setIsCustomRate(true)
        return
      }

      // 否則獲取即時匯率
      try {
        const res = await authFetch(`/api/exchange-rates?from=${currency}&to=${projectCurrency}&amount=1`)
        if (res.ok) {
          const data = await res.json()
          setExchangeRate(data.exchangeRate)
          setIsCustomRate(false)
        }
      } catch (error) {
        console.error("獲取匯率失敗:", error)
      }
    }
    fetchExchangeRate()
  }, [currency, projectCurrency, customRates, authFetch])

  async function fetchProjectAndMembers() {
    try {
      const [projectRes, membersRes] = await Promise.all([
        authFetch(`/api/projects/${projectId}`),
        authFetch(`/api/projects/${projectId}/members`),
      ])

      if (projectRes.ok) {
        const projectData = await projectRes.json()
        setProjectName(projectData.name)
        // 設定專案幣別
        const projCurrency = projectData.currency || DEFAULT_CURRENCY
        setProjectCurrency(projCurrency)
        // 幣別優先順序：用戶偏好 > 專案設定 > 預設
        const defaultCurrency = userPreferences.defaultCurrency || projCurrency
        setCurrency(defaultCurrency as CurrencyCode)
        // 設定自訂匯率
        if (projectData.customRates) {
          setCustomRates(projectData.customRates)
        }
        // 設定精度
        setPrecision(projectData.exchangeRatePrecision ?? 2)
      }

      if (membersRes.ok) {
        const data = await membersRes.json()
        setMembers(data)
        const allMemberIds = new Set<string>(data.map((m: Member) => m.id))
        setSelectedParticipants(allMemberIds)
        if (data.length > 0) {
          // 新增支出預設付款人為第一位成員（與既有行為一致）
          setPayerIds([data[0].id])
        }
        // 設定分帳方式為用戶偏好
        setSplitMode(userPreferences.defaultSplitMode)
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
        // 設定專案幣別
        const projCurrency = projectData.currency || DEFAULT_CURRENCY
        setProjectCurrency(projCurrency)
        // 設定自訂匯率
        if (projectData.customRates) {
          setCustomRates(projectData.customRates)
        }
        // 設定精度
        setPrecision(projectData.exchangeRatePrecision ?? 2)
      }

      if (expenseRes.ok) {
        const expense: Expense = await expenseRes.json()

        setDescription(expense.description || "")
        setAmount(String(expense.amount))
        // 設定費用幣別
        const expCurrency = expense.currency || projectCurrency || DEFAULT_CURRENCY
        setCurrency(expCurrency as CurrencyCode)
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
        // 付款人：依成員順序載入；只有非「純均分」才 seed pin，確保再存檔不漂移
        const loadedPayerIds = (expense.payers ?? []).map((p) => p.memberId)
        setPayerIds(loadedPayerIds)
        const equalPayers = derivePayerShares({
          amount: Number(expense.amount) || 0,
          payerIds: loadedPayerIds,
          pinned: {},
        }).shares
        const isEqualPayerSplit =
          loadedPayerIds.length > 0 &&
          expense.payers.length === equalPayers.length &&
          expense.payers.every((p, i) => Math.abs(Number(p.amount) - equalPayers[i].amount) <= 0.01)
        const pinnedPayerAmountsMap: Record<string, string> = {}
        if (!isEqualPayerSplit) {
          for (const p of expense.payers) pinnedPayerAmountsMap[p.memberId] = String(Number(p.amount))
        }
        setPinnedPayerAmounts(pinnedPayerAmountsMap)
        setExpenseDate(expense.expenseDate ? new Date(expense.expenseDate) : new Date())

        const participantIds = new Set<string>(expense.participants.map(p => p.member.id))
        setSelectedParticipants(participantIds)

        const shares = expense.participants.map(p => p.shareAmount)
        const allEqual = shares.every(s => Math.abs(s - shares[0]) < 0.01)
        // Fixed members chosen by the legacy detection below (null = equal split)
        let legacyFixed: Set<string> | null = null

        if (allEqual && shares.length > 0) {
          const expectedShare = Number(expense.amount) / shares.length
          if (Math.abs(shares[0] - expectedShare) < 0.01) {
            setSplitMode("equal")
          } else {
            // 所有人金額相同，但不等於均分金額
            setSplitMode("custom")
            const customSharesMap: Record<string, string> = {}
            expense.participants.forEach(p => {
              customSharesMap[p.member.id] = String(p.shareAmount)
            })
            setCustomShares(customSharesMap)
            // 將所有人標記為固定，這樣 UI 才會顯示 customShares 中的值
            const allFixed = new Set<string>(expense.participants.map(p => p.member.id))
            setFixedMembers(allFixed)
            legacyFixed = allFixed
          }
        } else {
          // 金額不相等，可能是混合模式
          setSplitMode("custom")
          const customSharesMap: Record<string, string> = {}
          expense.participants.forEach(p => {
            customSharesMap[p.member.id] = String(p.shareAmount)
          })
          setCustomShares(customSharesMap)

          // 嘗試識別均分成員
          const shareCounts = new Map<number, number>()
          shares.forEach(s => {
            const rounded = Math.round(s * 100) / 100
            shareCounts.set(rounded, (shareCounts.get(rounded) || 0) + 1)
          })

          // 找出最多的重複金額（可能是均分金額）
          let maxCount = 0
          let equalShareAmount = 0
          shareCounts.forEach((count, amount) => {
            if (count > maxCount) {
              maxCount = count
              equalShareAmount = amount
            }
          })

          // 如果有至少 2 人金額相同，標記為均分成員
          if (maxCount >= 2) {
            const newFixed = new Set<string>()
            expense.participants.forEach(p => {
              const amount = Math.round(p.shareAmount * 100) / 100
              if (Math.abs(amount - equalShareAmount) > 0.01) {
                // 金額不等於均分金額，標記為固定
                newFixed.add(p.member.id)
              }
            })
            setFixedMembers(newFixed)
            legacyFixed = newFixed
          } else {
            // 沒有識別到混合模式，將所有人標記為固定
            // 這樣 UI 才會顯示 customShares 中的值
            const allFixed = new Set<string>(expense.participants.map(p => p.member.id))
            setFixedMembers(allFixed)
            legacyFixed = allFixed
          }
        }

        const detail = expense.splitDetail ?? null
        const v1Mode = getV1SplitMode(detail)
        if (v1Mode === "personal" && detail) {
          const { personalItems: items } = splitDetailToInput(detail)
          setSplitMode("custom")
          setCustomMode("personal")
          setFixedMembers(new Set())
          setPersonalItems(
            Object.fromEntries(
              Object.entries(items).map(([id, list]) => [
                id,
                list.map((i, idx) => ({ id: `item-${id}-${idx}`, name: i.name, amount: String(i.amount) })),
              ])
            )
          )
        } else if (v1Mode === "custom" && detail) {
          const { customShares: custom } = splitDetailToInput(detail)
          setSplitMode("custom")
          setCustomMode("full")
          setCustomShares(Object.fromEntries(Object.entries(custom).map(([id, v]) => [id, String(v)])))
          setFixedMembers(new Set(Object.keys(custom)))
        } else if (v1Mode === "unsupported") {
          setReadOnlyReason("此支出使用新版功能建立，請切換到新版編輯")
        }

        // Baseline for split change detection. Without a stored splitDetail,
        // use the detail the legacy detection above implies, so an untouched
        // legacy expense still reports "no changes".
        if (v1Mode === "none") {
          const ids = expense.participants.map(p => p.member.id)
          const fixed = legacyFixed
          const fixedIds = fixed === null ? [] : fixed.size > 0 ? ids.filter(id => fixed.has(id)) : ids
          const legacyCustom: SplitInput["customShares"] = {}
          expense.participants.forEach(p => {
            if (fixedIds.includes(p.member.id)) legacyCustom[p.member.id] = Number(String(p.shareAmount)) || 0
          })
          setOriginalSplitDetail(
            buildSplitDetail({ amount: Number(expense.amount) || 0, participantIds: ids, personalItems: {}, customShares: legacyCustom })
          )
        } else {
          setOriginalSplitDetail(detail)
        }

        // 儲存原始資料用於計算變更（確保 amount 是數字類型）
        const participantShares = new Map<string, number>()
        expense.participants.forEach(p => {
          participantShares.set(p.member.id, Number(p.shareAmount))
        })

        setOriginalData({
          amount: Number(expense.amount),
          currency: expCurrency,
          description: expense.description,
          category: expense.category,
          payers: (expense.payers ?? []).map((p) => ({ memberId: p.memberId, amount: Number(p.amount) })),
          payerLabel: (expense.payers ?? []).map((p) => p.member.displayName).join("、") || "無",
          expenseDate: expense.expenseDate ? new Date(expense.expenseDate) : new Date(),
          location: expense.location,
          image: expense.image,
          participantIds: new Set(expense.participants.map(p => p.member.id)),
          participantShares: participantShares,
        })
      } else {
        const errorData = await expenseRes.json().catch(() => ({}))
        const errorMsg = errorData.error || `載入失敗 (${expenseRes.status})`
        console.error("載入支出失敗:", expenseRes.status, errorData)
        alert(`無法載入支出資料：${errorMsg}`)
        router.push(`/projects/${projectId}/expenses`)
      }
    } catch (error) {
      console.error("獲取資料錯誤:", error)
      alert(`載入失敗：${error instanceof Error ? error.message : "未知錯誤"}`)
      router.push(`/projects/${projectId}/expenses`)
    } finally {
      setLoading(false)
    }
  }

  function toggleParticipant(memberId: string) {
    const newSelected = new Set(selectedParticipants)
    if (newSelected.has(memberId)) {
      newSelected.delete(memberId)
      // 取消勾選時，同時移除固定標記
      const newFixed = new Set(fixedMembers)
      newFixed.delete(memberId)
      setFixedMembers(newFixed)
      // 清除個人項目
      if (customMode === "personal") {
        const newItems = { ...personalItems }
        delete newItems[memberId]
        setPersonalItems(newItems)
      }
    } else {
      newSelected.add(memberId)
      // 初始化個人項目為空陣列
      if (customMode === "personal") {
        setPersonalItems({...personalItems, [memberId]: []})
      }
    }
    setSelectedParticipants(newSelected)
  }

  function selectAllParticipants() {
    const allMemberIds = new Set(members.map((m) => m.id))
    setSelectedParticipants(allMemberIds)
  }

  // ---- 付款人（多人）相關操作 ----
  // 單一真實來源的推算邏輯在 lib/expense-payers.ts；此處只負責狀態/UI。
  function getPayerResult() {
    const pinned: Record<string, number> = {}
    for (const [id, value] of Object.entries(pinnedPayerAmounts)) {
      pinned[id] = Number(value) || 0
    }
    return derivePayerShares({ amount: Number(amount) || 0, payerIds, pinned })
  }

  function togglePayer(memberId: string) {
    if (payerIds.includes(memberId)) {
      setPayerIds(payerIds.filter((id) => id !== memberId))
      // 移除付款人時連帶移除其 pin
      const next = { ...pinnedPayerAmounts }
      delete next[memberId]
      setPinnedPayerAmounts(next)
    } else {
      setPayerIds([...payerIds, memberId])
    }
  }

  function setAllPayers(selectAll: boolean) {
    if (selectAll) {
      setPayerIds(members.map((m) => m.id))
    } else {
      setPayerIds([])
      setPinnedPayerAmounts({})
    }
  }

  // 設值即 pin；清空即取消 pin
  function setPayerAmount(memberId: string, value: string) {
    setPinnedPayerAmounts((prev) => {
      const next = { ...prev }
      if (value.trim() === "") delete next[memberId]
      else next[memberId] = value
      return next
    })
  }

  function clearPayerAmount(memberId: string) {
    setPinnedPayerAmounts((prev) => {
      const next = { ...prev }
      delete next[memberId]
      return next
    })
  }

  function memberName(memberId: string): string {
    return members.find((m) => m.id === memberId)?.displayName || ""
  }

  function payerLabel(payers: PayerShare[]): string {
    return payers.map((p) => memberName(p.memberId)).join("、") || "無"
  }

  function payersKey(payers: PayerShare[]): string {
    return [...payers]
      .sort((a, b) => (a.memberId < b.memberId ? -1 : a.memberId > b.memberId ? 1 : 0))
      .map((p) => `${p.memberId}:${p.amount}`)
      .join(",")
  }

  // 個人項目模式：獲取單個成員的個人項目總額
  function getMemberPersonalTotal(memberId: string): number {
    const items = personalItems[memberId] || []
    return items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
  }

  // 個人項目模式：獲取所有成員的個人項目總額
  function getPersonalTotal(): number {
    return Array.from(selectedParticipants).reduce(
      (sum, id) => sum + getMemberPersonalTotal(id),
      0
    )
  }

  // 個人項目模式：獲取剩餘金額
  function getRemainingAmount(): number {
    return (Number(amount) || 0) - getPersonalTotal()
  }

  // 個人項目模式：獲取均攤額
  function getEqualShareAmount(): number {
    const remaining = getRemainingAmount()
    const count = selectedParticipants.size
    return count > 0 ? Math.round((remaining / count) * 100) / 100 : 0
  }

  // 個人項目模式：獲取單個成員最終金額
  function getFinalShareAmount(memberId: string): number {
    const personal = getMemberPersonalTotal(memberId)
    return Math.round((personal + getEqualShareAmount()) * 100) / 100
  }

  // 新增個人項目
  function addPersonalItem(memberId: string) {
    const items = personalItems[memberId] || []
    if (items.length >= MAX_PERSONAL_ITEMS) return
    const newItem: PersonalItem = {
      id: `item-${Date.now()}-${Math.random()}`,
      name: "",
      amount: "0"
    }
    setPersonalItems({
      ...personalItems,
      [memberId]: [...items, newItem]
    })
  }

  // 刪除個人項目
  function removePersonalItem(memberId: string, itemId: string) {
    const items = personalItems[memberId] || []
    setPersonalItems({
      ...personalItems,
      [memberId]: items.filter(item => item.id !== itemId)
    })
  }

  // 更新個人項目
  function updatePersonalItem(memberId: string, itemId: string, field: "name" | "amount", value: string) {
    const items = personalItems[memberId] || []
    setPersonalItems({
      ...personalItems,
      [memberId]: items.map(item =>
        item.id === itemId ? { ...item, [field]: value } : item
      )
    })
  }

  // Maps the v1 split modes onto the shared split input.
  function currentSplitInput(): SplitInput {
    const participantIds = Array.from(selectedParticipants)
    const base = { amount: Number(amount) || 0, participantIds, personalItems: {}, customShares: {} }
    if (splitMode === "equal") return base
    if (customMode === "personal") {
      const items: SplitInput["personalItems"] = {}
      participantIds.forEach((id) => {
        const list = (personalItems[id] || []).map((i) => ({ name: i.name.trim(), amount: Number(i.amount) || 0 }))
        if (list.length > 0) items[id] = list
      })
      return { ...base, personalItems: items }
    }
    const fixedIds = fixedMembers.size > 0 ? participantIds.filter((id) => fixedMembers.has(id)) : participantIds
    const custom: SplitInput["customShares"] = {}
    fixedIds.forEach((id) => {
      custom[id] = Number(customShares[id]) || 0
    })
    return { ...base, customShares: custom }
  }

  function calculateShares(): ParticipantShare[] {
    return computeShares(currentSplitInput())
  }

  function getCustomSharesTotal(): number {
    return Array.from(selectedParticipants).reduce(
      (sum, memberId) => sum + (Number(customShares[memberId]) || 0),
      0
    )
  }

  // 獲取固定金額總和
  function getFixedSharesTotal(): number {
    return Array.from(fixedMembers).reduce(
      (sum, memberId) => sum + (Number(customShares[memberId]) || 0),
      0
    )
  }

  // 獲取均分成員數量
  function getEqualSplitCount(): number {
    return Array.from(selectedParticipants)
      .filter(id => !fixedMembers.has(id)).length
  }

  // 計算單個均分成員應付金額
  function calculateEqualSplitAmount(): number {
    const amountNum = Number(amount) || 0
    const fixedTotal = getFixedSharesTotal()
    const remaining = amountNum - fixedTotal
    const count = getEqualSplitCount()
    return count > 0 ? Math.round((remaining / count) * 100) / 100 : 0
  }

  // 切換固定成員標記
  function toggleFixedMember(memberId: string): void {
    const newFixed = new Set(fixedMembers)
    if (newFixed.has(memberId)) {
      newFixed.delete(memberId)
    } else {
      newFixed.add(memberId)
    }
    setFixedMembers(newFixed)
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

    // 幣別變更
    if (originalData.currency !== currency) return true

    // 描述變更
    if (originalData.description !== newDescription) return true

    // 類別變更
    if (originalData.category !== finalCategory) return true

    // 付款人變更（多付款人；排序後比較成員與金額）
    if (payersKey(originalData.payers) !== payersKey(getPayerResult().shares)) return true

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

    // 分攤金額變更 - 比較每個參與者的分攤金額
    const currentShares = calculateShares()
    for (const share of currentShares) {
      const originalShare = originalData.participantShares.get(share.memberId)
      if (originalShare === undefined) return true // 新增的參與者
      // 使用 0.01 的容差來處理浮點數比較
      if (Math.abs(originalShare - share.shareAmount) > 0.01) return true
    }

    // 分攤明細變更（個人項目 / 指定金額）
    if (!isSameSplitDetail(originalSplitDetail, buildSplitDetail(currentSplitInput()))) return true

    return false
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (readOnlyReason) return

    const amountNum = Number(amount)
    if (isNaN(amountNum) || amountNum < 0) {
      alert("請輸入有效金額")
      return
    }

    // 付款人多人驗證：至少一位、pin 合計不可超過、合計必須等於支出金額
    const payerResult = getPayerResult()
    if (payerIds.length === 0) {
      alert(PAYER_ERROR.none)
      return
    }
    if (!payerResult.ok) {
      alert(PAYER_ERROR.over)
      return
    }
    const payerTotal = payerResult.shares.reduce((sum, p) => sum + p.amount, 0)
    if (Math.abs(payerTotal - amountNum) > 0.01) {
      alert(PAYER_ERROR.mismatch)
      return
    }

    if (selectedParticipants.size === 0) {
      alert("請選擇至少一位分擔者")
      return
    }

    // 個人項目 + 均攤模式驗證
    if (splitMode === "custom" && customMode === "personal") {
      const personalTotal = getPersonalTotal()

      // 驗證每位成員的個人項目
      for (const memberId of selectedParticipants) {
        const member = members.find(m => m.id === memberId)
        const items = personalItems[memberId] || []

        // 檢查每個項目
        for (const item of items) {
          // 驗證項目名稱不可為空
          if (!item.name.trim()) {
            alert(`${member?.displayName} 有個人項目未填寫名稱`)
            return
          }

          // 驗證金額格式
          const itemAmount = Number(item.amount)
          if (isNaN(itemAmount)) {
            alert(`${member?.displayName} 的「${item.name}」金額格式不正確`)
            return
          }

          // 驗證金額不可為負數
          if (itemAmount < 0) {
            alert(`${member?.displayName} 的「${item.name}」金額不可為負數`)
            return
          }
        }
      }

      // 驗證個人項目總額不可超過總金額
      if (personalTotal > amountNum) {
        alert(
          `個人項目總額 ($${personalTotal.toFixed(2)}) ` +
          `不可超過支出總額 ($${amountNum.toFixed(2)})`
        )
        return
      }
    }

    // 混合模式驗證
    if (splitMode === "custom" && fixedMembers.size > 0) {
      const fixedTotal = getFixedSharesTotal()
      const equalSplitCount = getEqualSplitCount()

      // 驗證 1：固定金額不能超過總金額
      if (fixedTotal > amountNum) {
        alert(`固定金額總和 ($${fixedTotal.toFixed(2)}) 不能超過支出金額 ($${amountNum.toFixed(2)})`)
        return
      }

      // 驗證 2：如果固定金額 < 總金額，至少要有一個均分成員
      if (equalSplitCount === 0 && Math.abs(fixedTotal - amountNum) > 0.01) {
        alert("請至少選擇一位成員進行均分，或確保固定金額總和等於支出金額")
        return
      }
    }

    const participants = calculateShares()
    const totalShare = participants.reduce((sum, p) => sum + p.shareAmount, 0)

    if (Math.abs(totalShare - amountNum) > 0.01) {
      alert(`分擔總額 ($${totalShare.toFixed(2)}) 與支出金額 ($${amountNum.toFixed(2)}) 不符`)
      return
    }

    // 如果選擇「其他」且有自訂類別，使用自訂類別；未選擇類別預設為 other
    const finalCategory = category === "other" && customCategory.trim()
      ? customCategory.trim()
      : category || "other"
    const payerName = members.find((m) => m.id === primaryPayerId(payerResult.shares))?.displayName || "未知"
    const nextSnapshot: ExpenseSnapshot = {
      amount: amountNum,
      currency,
      description: description.trim() || null,
      category: finalCategory,
      payers: payerResult.shares,
      payerLabel: payerLabel(payerResult.shares),
      expenseDate,
      location: locationData.location,
      // A pending upload always yields an image URL once saved
      image: imageValue.pendingFile ? "pending" : imageValue.image,
      participantIds: participants.map((p) => p.memberId),
    }
    const changes =
      mode === "edit" && originalData
        ? buildExpenseChanges(
            { ...originalData, participantIds: Array.from(originalData.participantIds) },
            nextSnapshot,
            { imageReplaced: imageValue.pendingFile !== null }
          )
        : []

    const result = await save({
      mode,
      expenseId,
      payload: {
        payers: payerResult.shares,
        amount: amountNum,
        currency,
        description: description.trim() || null,
        category: finalCategory,
        location: locationData.location,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        expenseDate: expenseDate.toISOString(),
        participants,
        splitDetail: buildSplitDetail(currentSplitInput()),
      },
      image: { url: imageValue.image, pendingFile: imageValue.pendingFile, pendingDeleteUrl: pendingImageDelete },
      notification: { requested: notifyLine, projectName, payerName, changes },
    })
    if (!result.ok) {
      alert(result.error)
      return
    }
    router.push(`/projects/${projectId}/expenses`)
  }

  // 刪除支出
  async function handleDelete() {
    if (!expenseId || mode !== "edit") return

    const result = await remove({
      expenseId,
      notification: {
        // v1 only notified when the original data was loaded
        requested: notifyLine && !!originalData,
        projectName,
        payerName:
          members.find((m) => m.id === primaryPayerId(originalData?.payers ?? []))?.displayName ||
          originalData?.payerLabel ||
          "",
        amount: originalData?.amount ?? 0,
        description: originalData?.description ?? null,
        category: originalData?.category ?? null,
        participantCount: originalData?.participantIds.size ?? 0,
      },
    })
    setShowDeleteDialog(false)
    if (!result.ok) {
      alert(result.error)
      return
    }
    router.push(`/projects/${projectId}/expenses`)
  }

  // 移除圖片時的處理（只標記待刪除，儲存成功後才實際刪除）
  function handleRemoveImage() {
    if (mode === "edit" && imageValue.image) {
      // 記錄待刪除的圖片 URL，儲存成功後才刪除
      setPendingImageDelete(imageValue.image)
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

  // 付款人推算（均分/pin），共用 lib/expense-payers.ts 的演算法
  const payerResult = getPayerResult()
  const payerShares = payerResult.shares
  const payerTotal = payerShares.reduce((sum, p) => sum + p.amount, 0)
  const payerMatches = payerResult.ok && Math.abs(payerTotal - amountNum) <= 0.01

  return (
    <AppLayout title={title} showBack backHref={backHref}>
      <form onSubmit={handleSubmit} className="space-y-5 pb-40">
        {readOnlyReason && (
          <div role="alert" className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            {readOnlyReason}
          </div>
        )}
        {/* 編輯模式顯示刪除按鈕 */}
        {mode === "edit" && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowDeleteDialog(true)}
              className="p-2 rounded-full text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
              title="刪除此筆"
            >
              <Trash2 className="h-4 w-4" />
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
              <div className="flex items-center gap-3">
                <CurrencySelect
                  value={currency}
                  onChange={setCurrency}
                  showName={false}
                  className="shrink-0 h-12 min-w-[5rem] border-0 bg-white/50 dark:bg-slate-800/50 rounded-xl [&>span]:text-base [&>span]:font-semibold"
                />
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="flex-1 text-4xl h-14 font-bold border-0 bg-transparent shadow-none focus-visible:ring-0 px-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  required
                />
              </div>
              {/* 匯率預覽 */}
              {exchangeRate && amountNum > 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  ≈ {formatCurrency(amountNum * exchangeRate, projectCurrency)}
                  <span className={`text-xs ml-1.5 ${isCustomRate ? "text-amber-600 dark:text-amber-400" : "opacity-70"}`}>
                    ({isCustomRate ? "自訂" : "即時"}匯率 1:{exchangeRate.toFixed(precision)})
                  </span>
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

        {/* 付款成員（多人） */}
        <div role="group" aria-label="付款成員">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium">誰付的錢？</label>
            {members.length > 1 && (
              <button
                type="button"
                onClick={() => setAllPayers(payerIds.length !== members.length)}
                className="text-xs text-primary font-medium"
              >
                {payerIds.length === members.length ? "取消全選" : "全選"}
              </button>
            )}
          </div>
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              沒有成員，請先新增成員
            </p>
          ) : (
            <>
              {/* 成員 pills（多選） */}
              <div className="flex flex-wrap gap-1.5">
                {members.map((member) => {
                  const isSelected = payerIds.includes(member.id)
                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => togglePayer(member.id)}
                      aria-pressed={isSelected}
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

              {/* 付款明細：每人金額 + pin + 移除 */}
              {payerShares.length > 0 && (
                <div className="mt-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                  {payerShares.map((payer) => {
                    const member = members.find((m) => m.id === payer.memberId)
                    const isPinned = Object.prototype.hasOwnProperty.call(pinnedPayerAmounts, payer.memberId)
                    const value = isPinned ? pinnedPayerAmounts[payer.memberId] : String(payer.amount)
                    return (
                      <div key={payer.memberId} className="flex items-center gap-2 p-3">
                        <MemberAvatar
                          image={member?.user?.image}
                          name={member?.displayName || ""}
                          size="sm"
                        />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">
                          {member?.displayName}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">$</span>
                          <Input
                            inputMode="decimal"
                            value={value}
                            onChange={(e) => setPayerAmount(payer.memberId, e.target.value)}
                            aria-label={`${member?.displayName}的付款金額`}
                            className="w-20 h-8 text-right text-sm"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            isPinned
                              ? clearPayerAmount(payer.memberId)
                              : setPayerAmount(payer.memberId, String(payer.amount))
                          }
                          title={isPinned ? "還原均分" : "自訂金額"}
                          aria-label={
                            isPinned
                              ? `${member?.displayName}的付款金額已自訂，點擊還原均分`
                              : `${member?.displayName}的付款金額均分，點擊自訂`
                          }
                          className={`p-1.5 rounded-md transition-colors ${
                            isPinned
                              ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50"
                              : "border border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-blue-400 hover:text-blue-600 dark:hover:border-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          }`}
                        >
                          {isPinned ? <Pin className="h-3.5 w-3.5" /> : <PinOff className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => togglePayer(payer.memberId)}
                          aria-label={`移除${member?.displayName}`}
                          className="p-1.5 rounded-md text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* 付款摘要 */}
              <div className="mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">已選 {payerShares.length} 人</span>
                  {payerMatches ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                      金額相符
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-red-500">金額不符</span>
                  )}
                </div>
                {payerShares.length > 0 && (
                  <p className="mt-0.5 break-words text-xs text-muted-foreground">
                    {payerShares.map((p) => `$${p.amount.toFixed(2)}`).join(" + ")} = ${payerTotal.toFixed(2)} / $
                    {amountNum.toFixed(2)}
                  </p>
                )}
              </div>
            </>
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

          {/* 自訂模式 Tab 切換 */}
          {splitMode === "custom" && (
            <div className="flex gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg mb-2">
              <button
                type="button"
                onClick={() => setCustomMode("full")}
                className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-colors ${
                  customMode === "full"
                    ? "bg-white dark:bg-slate-900 text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                指定金額
              </button>
              <button
                type="button"
                onClick={() => setCustomMode("personal")}
                className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-colors ${
                  customMode === "personal"
                    ? "bg-white dark:bg-slate-900 text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                先扣再分
              </button>
            </div>
          )}

          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              沒有成員，請先新增成員
            </p>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
              {members.map((member) => {
                const isSelected = selectedParticipants.has(member.id)
                const memberItems = personalItems[member.id] || []
                const memberPersonalTotal = getMemberPersonalTotal(member.id)

                return (
                  <div
                    key={member.id}
                    className={`transition-colors ${
                      isSelected ? "bg-primary/5" : ""
                    }`}
                  >
                    {/* 成員基本資訊列 */}
                    <div className="flex items-center justify-between p-3">
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
                      {isSelected && splitMode === "custom" && customMode === "full" && (
                        <div className="flex items-center gap-2">
                          {fixedMembers.has(member.id) ? (
                            // 固定金額模式：顯示輸入框
                            <>
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-muted-foreground">$</span>
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
                                  className="w-20 h-8 text-right text-sm"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleFixedMember(member.id)
                                }}
                                className="p-1.5 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                                title="取消固定"
                              >
                                <Pin className="h-3.5 w-3.5" />
                              </button>
                            </>
                          ) : (
                            // 均分模式：顯示金額和固定按鈕
                            <>
                              <span className="text-sm font-medium text-primary tabular-nums">
                                ${calculateEqualSplitAmount().toFixed(2)}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleFixedMember(member.id)
                                }}
                                className="p-1.5 rounded-md border border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-blue-400 hover:text-blue-600 dark:hover:border-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                title="固定金額"
                              >
                                <PinOff className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      )}
                      {isSelected && splitMode === "custom" && customMode === "personal" && (
                        <div className="text-xs text-muted-foreground">
                          ${getFinalShareAmount(member.id).toFixed(2)}
                        </div>
                      )}
                    </div>

                    {/* 個人項目模式：展開的項目列表 */}
                    {isSelected && splitMode === "custom" && customMode === "personal" && (
                      <div className="px-3 pb-3 space-y-2">
                        {/* 個人項目列表 */}
                        {memberItems.map((item) => (
                          <div key={item.id} className="flex items-center gap-2 ml-12">
                            <Input
                              type="text"
                              placeholder="項目名稱"
                              maxLength={MAX_PERSONAL_ITEM_NAME}
                              value={item.name}
                              onChange={(e) => updatePersonalItem(member.id, item.id, "name", e.target.value)}
                              className="flex-1 h-8 text-xs"
                            />
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0"
                              value={item.amount}
                              onChange={(e) => updatePersonalItem(member.id, item.id, "amount", e.target.value)}
                              className="w-20 h-8 text-right text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => removePersonalItem(member.id, item.id)}
                              className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}

                        {/* 新增項目按鈕 */}
                        <button
                          type="button"
                          onClick={() => addPersonalItem(member.id)}
                          disabled={memberItems.length >= MAX_PERSONAL_ITEMS}
                          className="flex items-center gap-1 ml-12 text-xs text-primary hover:text-primary/80 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Plus className="h-3 w-3" />
                          新增項目
                        </button>

                        {/* 小計與最終金額 */}
                        {memberItems.length > 0 && (
                          <div className="ml-12 pt-2 border-t border-slate-200 dark:border-slate-700 space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">個人小計</span>
                              <span className="font-medium">${memberPersonalTotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">均攤額</span>
                              <span className="text-primary">${getEqualShareAmount().toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between font-semibold">
                              <span>最終金額</span>
                              <span>${getFinalShareAmount(member.id).toFixed(2)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* 個人項目 + 均攤模式：警告訊息 */}
          {splitMode === "custom" && customMode === "personal" && (
            <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-xs text-amber-800 dark:text-amber-200">
                個人項目明細（項目名稱）會隨支出一起儲存，編輯時可還原。
              </p>
            </div>
          )}

          {/* 個人項目 + 均攤模式即時反饋 */}
          {splitMode === "custom" && customMode === "personal" && amountNum > 0 && (
            <div className="mt-3 p-3 bg-primary/5 dark:bg-primary/10 rounded-lg space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">個人項目總額</span>
                <span className="font-medium">${getPersonalTotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">剩餘金額</span>
                <span className="font-medium text-primary">
                  ${getRemainingAmount().toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between border-t border-primary/20 pt-1.5">
                <span className="text-muted-foreground">
                  均攤 ({selectedParticipants.size}人)
                </span>
                <span className="font-semibold">
                  每人 ${getEqualShareAmount().toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* 底部資訊 */}
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <span>已選 {selectedParticipants.size} 人</span>
            {splitMode === "custom" && customMode === "full" && amountNum > 0 && (
              <span className={
                fixedMembers.size > 0
                  ? (getFixedSharesTotal() + calculateEqualSplitAmount() * getEqualSplitCount() === amountNum ? "text-emerald-600" : "text-red-500")
                  : (getEqualSplitCount() > 0 ? "text-emerald-600" : (getCustomSharesTotal() === amountNum ? "text-emerald-600" : "text-red-500"))
              }>
                {fixedMembers.size > 0 ? (
                  // 混合模式：顯示固定 + 均分
                  <>
                    固定 ${getFixedSharesTotal().toFixed(2)} +
                    均分 ${(calculateEqualSplitAmount() * getEqualSplitCount()).toFixed(2)}
                    ({getEqualSplitCount()}人) =
                    ${(getFixedSharesTotal() + calculateEqualSplitAmount() * getEqualSplitCount()).toFixed(2)} /
                    ${amountNum.toFixed(2)}
                  </>
                ) : getEqualSplitCount() > 0 ? (
                  // 全均分模式（沒有固定成員）
                  <>
                    均分 ${(calculateEqualSplitAmount() * getEqualSplitCount()).toFixed(2)}
                    ({getEqualSplitCount()}人) =
                    ${amountNum.toFixed(2)} / ${amountNum.toFixed(2)}
                  </>
                ) : (
                  // 全自訂模式（所有成員都已輸入固定金額）
                  <>
                    ${getCustomSharesTotal().toFixed(2)} / ${amountNum.toFixed(2)}
                    {getCustomSharesTotal() !== amountNum && (
                      <span className="ml-1">
                        ({getCustomSharesTotal() > amountNum ? "超出" : "還差"} ${Math.abs(getCustomSharesTotal() - amountNum).toFixed(2)})
                      </span>
                    )}
                  </>
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
                disabled={submitting || uploadingImage || !hasChanges() || !!readOnlyReason}
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
        loading={removing}
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
/* c8 ignore stop */
