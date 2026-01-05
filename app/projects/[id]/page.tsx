"use client"

import { use, useEffect, useState, useMemo, useRef, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AppLayout } from "@/components/layout/app-layout"
import { Button } from "@/components/ui/button"
import { StatCard } from "@/components/dashboard/stat-card"
import { FeatureCard } from "@/components/dashboard/feature-card"
import { useAuthFetch, useLiff } from "@/components/auth/liff-provider"
import {
  Plus,
  Share2,
  Users,
  Calculator,
  Receipt,
  Utensils,
  Car,
  Home,
  Gamepad2,
  ShoppingBag,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
  Download,
  ArrowRightLeft,
  Settings,
  StickyNote,
  MessageCircle,
  Link2,
  MoreHorizontal,
  Check,
  Wallet,
  Sparkles,
  History,
  DollarSign,
  UserCheck,
} from "lucide-react"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getProjectShareUrl } from "@/lib/utils"
import { VoiceExpenseDialog } from "@/components/voice/voice-expense-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency, DEFAULT_CURRENCY } from "@/lib/constants/currencies"

interface ProjectMember {
  id: string
  role: string
  displayName: string
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
  } | null
}

interface ExpenseParticipant {
  id: string
  memberId: string
  shareAmount: number
}

interface Expense {
  id: string
  amount: number
  currency: string
  description: string | null
  category: string | null
  createdAt: string
  payer: {
    id: string
    displayName: string
    user: {
      name: string | null
      email: string
    } | null
  }
  participants: ExpenseParticipant[]
}

interface Project {
  id: string
  name: string
  description: string | null
  budget: string | null
  currency: string
  startDate: string | null
  endDate: string | null
  customRates: Record<string, number> | null
  creator: {
    id: string
    name: string | null
    email: string
  }
  members: ProjectMember[]
  expenses: Expense[]
}

// 類別圖標
function getCategoryIcon(category: string | null) {
  switch (category) {
    case "food":
      return <Utensils className="h-4 w-4" />
    case "transport":
      return <Car className="h-4 w-4" />
    case "accommodation":
      return <Home className="h-4 w-4" />
    case "entertainment":
      return <Gamepad2 className="h-4 w-4" />
    case "shopping":
      return <ShoppingBag className="h-4 w-4" />
    default:
      return <Wallet className="h-4 w-4" />
  }
}

// 類別顏色
function getCategoryColor(category: string | null) {
  switch (category) {
    case "food":
      return "bg-orange-50 text-orange-500 dark:bg-orange-950 dark:text-orange-400"
    case "transport":
      return "bg-blue-50 text-blue-500 dark:bg-blue-950 dark:text-blue-400"
    case "accommodation":
      return "bg-violet-50 text-violet-500 dark:bg-violet-950 dark:text-violet-400"
    case "entertainment":
      return "bg-pink-50 text-pink-500 dark:bg-pink-950 dark:text-pink-400"
    case "shopping":
      return "bg-amber-50 text-amber-500 dark:bg-amber-950 dark:text-amber-400"
    default:
      return "bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
  }
}

export default function ProjectOverview({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id } = use(params)
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const authFetch = useAuthFetch()
  const { user } = useLiff()

  // 非成員加入相關狀態
  const [showJoinDialog, setShowJoinDialog] = useState(false)
  const [projectBasicInfo, setProjectBasicInfo] = useState<{
    name: string
    description: string | null
    joinMode: string
    unclaimedMembers: { id: string; displayName: string }[]
  } | null>(null)
  const [joining, setJoining] = useState(false)
  const [selectedMemberToClaim, setSelectedMemberToClaim] = useState<string | null>(null)

  // 邀請分享相關狀態
  const [showInvite, setShowInvite] = useState(false)
  const [copied, setCopied] = useState(false)
  const [canNativeShare, setCanNativeShare] = useState(false)

  // AI 語音記帳相關狀態
  const [showVoiceDialog, setShowVoiceDialog] = useState(false)

  // 匯率相關狀態
  const [exchangeRates, setExchangeRates] = useState<Record<string, number> | null>(null)

  // 功能 carousel 相關
  const [currentPage, setCurrentPage] = useState(0)
  const carouselRef = useRef<HTMLDivElement>(null)
  const totalPages = 2

  const handleScroll = useCallback(() => {
    if (carouselRef.current) {
      const scrollLeft = carouselRef.current.scrollLeft
      const width = carouselRef.current.offsetWidth
      const newPage = Math.round(scrollLeft / width)
      setCurrentPage(newPage)
    }
  }, [])

  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && !!navigator.share)
  }, [])

  useEffect(() => {
    if (id) {
      fetchProject()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // 當有多種幣別時，獲取匯率
  useEffect(() => {
    if (project?.expenses) {
      const currencies = new Set(project.expenses.map(e => e.currency))
      if (currencies.size > 1) {
        fetchExchangeRates()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.expenses])

  async function fetchExchangeRates() {
    try {
      const res = await authFetch("/api/exchange-rates")
      if (res.ok) {
        const data = await res.json()
        setExchangeRates(data.rates)
      }
    } catch (error) {
      console.error("獲取匯率錯誤:", error)
    }
  }

  // 轉換單一金額到專案幣別（優先使用自訂匯率）
  const convertToProjectCurrency = useCallback((amount: number, fromCurrency: string): number => {
    if (!project) return amount
    const projectCurrency = project.currency || DEFAULT_CURRENCY
    if (fromCurrency === projectCurrency) return amount

    // 優先使用自訂匯率
    if (project.customRates && project.customRates[fromCurrency]) {
      return Math.round(amount * project.customRates[fromCurrency] * 100) / 100
    }

    // 無即時匯率時不轉換
    if (!exchangeRates) return amount

    // 透過 USD 作為中介轉換
    const fromRate = exchangeRates[fromCurrency] || 1
    const toRate = exchangeRates[projectCurrency] || 1
    return Math.round(amount * (toRate / fromRate) * 100) / 100
  }, [project, exchangeRates])

  async function fetchProject() {
    try {
      const res = await authFetch(`/api/projects/${id}`)
      if (!res.ok) {
        if (res.status === 404) {
          router.push("/projects")
          return
        }
        return
      }
      const data = await res.json()

      // 檢查是否為成員
      if (data.isMember === false) {
        // 非成員，顯示加入 Dialog
        setProjectBasicInfo({
          name: data.name,
          description: data.description,
          joinMode: data.joinMode || "both",
          unclaimedMembers: data.unclaimedMembers || [],
        })
        setShowJoinDialog(true)
        setLoading(false)
        return
      }

      setProject(data)
    } catch {
      console.error("獲取專案錯誤")
    } finally {
      setLoading(false)
    }
  }

  async function handleJoinProject() {
    setJoining(true)
    try {
      const res = await authFetch("/api/projects/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: id }),
      })

      if (res.ok) {
        setShowJoinDialog(false)
        // 重新獲取完整專案資料
        const projectRes = await authFetch(`/api/projects/${id}`)
        if (projectRes.ok) {
          const data = await projectRes.json()
          setProject(data)
        }
      } else {
        const data = await res.json()
        alert(data.error || "加入失敗")
      }
    } catch {
      alert("加入失敗")
    } finally {
      setJoining(false)
    }
  }

  async function handleClaimMember() {
    if (!selectedMemberToClaim) {
      alert("請選擇要認領的成員")
      return
    }
    setJoining(true)
    try {
      const res = await authFetch(`/api/projects/${id}/members/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: selectedMemberToClaim }),
      })

      if (res.ok) {
        setShowJoinDialog(false)
        // 重新獲取完整專案資料
        const projectRes = await authFetch(`/api/projects/${id}`)
        if (projectRes.ok) {
          const data = await projectRes.json()
          setProject(data)
        }
      } else {
        const data = await res.json()
        alert(data.error || "認領失敗")
      }
    } catch {
      alert("認領失敗")
    } finally {
      setJoining(false)
    }
  }

  const shareUrl = project ? getProjectShareUrl(project.id) : ""

  async function handleCopyLink() {
    if (!project) return
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleShareToLine() {
    if (!project) return
    const text = `一起來分帳吧！加入「${project.name}」\n${shareUrl}`
    const lineShareUrl = `https://line.me/R/share?text=${encodeURIComponent(text)}`
    window.open(lineShareUrl, "_blank")
  }

  async function handleNativeShare() {
    if (!project) return

    if (navigator.share) {
      try {
        await navigator.share({
          title: `加入「${project.name}」`,
          text: "點擊連結加入旅行專案",
          url: shareUrl,
        })
      } catch {
        // cancelled
      }
    } else {
      handleCopyLink()
    }
  }

  // 計算用戶的餘額（使用幣別轉換）
  const userBalance = useMemo(() => {
    if (!project || !user) return 0

    const membership = project.members.find((m) => m.user?.id === user.id)
    if (!membership) return 0

    let paid = 0
    let owed = 0

    project.expenses.forEach((expense) => {
      const convertedAmount = convertToProjectCurrency(Number(expense.amount), expense.currency)
      if (expense.payer.id === membership.id) {
        paid += convertedAmount
      }
      const participant = expense.participants.find((p) => p.memberId === membership.id)
      if (participant) {
        // 按比例轉換分擔金額
        const shareRatio = Number(participant.shareAmount) / Number(expense.amount)
        owed += convertedAmount * shareRatio
      }
    })

    return paid - owed
  }, [project, user, convertToProjectCurrency])


  if (loading) {
    return (
      <AppLayout title="專案" showBack>
        <div className="pb-24 space-y-6 px-3 sm:px-4">
          {/* 標題骨架 */}
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>

          {/* 功能區塊骨架 */}
          <div>
            <Skeleton className="h-5 w-16 mb-3" />
            <div className="grid grid-cols-4 gap-2">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-slate-900 rounded-xl p-3 sm:p-4 border border-slate-200 dark:border-slate-800 flex flex-col items-center gap-2">
                  <Skeleton className="h-10 w-10 rounded-xl" />
                  <Skeleton className="h-4 w-10" />
                </div>
              ))}
            </div>
          </div>

          {/* 總覽骨架 */}
          <div>
            <Skeleton className="h-5 w-16 mb-3" />
            <div className="grid grid-cols-2 gap-3">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
                  <Skeleton className="h-3 w-16 mb-2" />
                  <Skeleton className="h-7 w-24" />
                </div>
              ))}
            </div>
          </div>

          {/* 餘額骨架 */}
          <div>
            <Skeleton className="h-5 w-20 mb-3" />
            <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <Skeleton className="h-8 w-28 mb-2" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-12 w-12 rounded-xl" />
              </div>
            </div>
          </div>

          {/* 最近支出骨架 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-4">
                  <Skeleton className="h-10 w-10 rounded-xl" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-24 mb-1" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-5 w-16" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </AppLayout>
    )
  }

  // 顯示加入 Dialog（非成員）
  if (showJoinDialog && projectBasicInfo) {
    const { joinMode, unclaimedMembers } = projectBasicInfo
    const canCreate = joinMode === "both" || joinMode === "create_only"
    const canClaim = (joinMode === "both" || joinMode === "claim_only") && unclaimedMembers.length > 0

    return (
      <AppLayout title="專案" showBack>
        <Dialog open={showJoinDialog} onOpenChange={() => router.push("/projects")}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>加入「{projectBasicInfo.name}」</DialogTitle>
              <DialogDescription>
                {joinMode === "claim_only"
                  ? "請選擇你要認領的佔位成員"
                  : joinMode === "create_only"
                  ? "你將以新成員身份加入此專案"
                  : "選擇加入方式"}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              {/* 認領佔位成員選項 */}
              {canClaim && (
                <div>
                  <p className="text-sm font-medium mb-2">認領現有成員</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    如果專案創建者已經幫你新增了佔位成員，請選擇你的名字
                  </p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {unclaimedMembers.map((member) => (
                      <label
                        key={member.id}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                          selectedMemberToClaim === member.id
                            ? "border-primary bg-primary/5"
                            : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                        }`}
                      >
                        <input
                          type="radio"
                          name="claimMember"
                          value={member.id}
                          checked={selectedMemberToClaim === member.id}
                          onChange={() => setSelectedMemberToClaim(member.id)}
                          className="accent-primary"
                        />
                        <span className="text-sm font-medium">{member.displayName}</span>
                      </label>
                    ))}
                  </div>
                  {selectedMemberToClaim && (
                    <Button
                      onClick={handleClaimMember}
                      disabled={joining}
                      className="w-full mt-3"
                    >
                      {joining ? "認領中..." : "確認認領"}
                    </Button>
                  )}
                </div>
              )}

              {/* 分隔線 */}
              {canCreate && canClaim && (
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-200 dark:border-slate-700" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-background px-2 text-muted-foreground">或</span>
                  </div>
                </div>
              )}

              {/* 建立新成員選項 */}
              {canCreate && (
                <div>
                  {canClaim && <p className="text-sm font-medium mb-2">建立新成員</p>}
                  <p className="text-xs text-muted-foreground mb-3">
                    以新成員身份加入，可查看支出記錄、新增支出並參與分帳
                  </p>
                  <Button
                    onClick={handleJoinProject}
                    disabled={joining}
                    variant={canClaim ? "outline" : "default"}
                    className="w-full"
                  >
                    {joining ? "加入中..." : "以新成員加入"}
                  </Button>
                </div>
              )}

              {/* 無法加入的情況 */}
              {!canCreate && !canClaim && (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">
                    此專案目前沒有可認領的佔位成員，請聯繫專案創建者
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => router.push("/projects")}
                disabled={joining}
                className="w-full"
              >
                取消
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </AppLayout>
    )
  }

  if (!project) {
    return (
      <AppLayout title="專案" showBack>
        <div className="text-center py-8 text-muted-foreground">專案不存在</div>
      </AppLayout>
    )
  }

  // 檢查是否有多種幣別
  const hasMixedCurrencies = new Set(project.expenses.map(e => e.currency)).size > 1

  // 計算總金額（轉換為專案幣別）
  const totalAmount = project.expenses.reduce((sum, e) => {
    const convertedAmount = convertToProjectCurrency(Number(e.amount), e.currency)
    return sum + convertedAmount
  }, 0)
  const perPerson = project.members.length > 0 ? totalAmount / project.members.length : 0
  const budget = project.budget ? Number(project.budget) : null
  const budgetProgress = budget ? Math.min((totalAmount / budget) * 100, 100) : 0
  const budgetRemaining = budget ? budget - totalAmount : null

  const displayBalance = isNaN(userBalance) ? 0 : userBalance

  return (
    <AppLayout title="專案" showBack>
      <div className="pb-24 space-y-6 px-3 sm:px-4">
        {/* 專案標題 */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{project.name}</h1>
          {project.description && (
            <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
          )}
        </div>

        {/* 功能 */}
        <div>
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">功能</h2>
          <div
            ref={carouselRef}
            onScroll={handleScroll}
            className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-3 px-3"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {/* 第一頁 - 8 個功能 */}
            <div className="flex-shrink-0 w-full snap-center">
              <div className="grid grid-cols-4 gap-2">
                <FeatureCard
                  href={`/projects/${id}/settle`}
                  icon={<Calculator className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
                  iconBgClass="bg-emerald-50 dark:bg-emerald-950"
                  label="結算"
                />
                <FeatureCard
                  href={`/projects/${id}/members`}
                  icon={<Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
                  iconBgClass="bg-blue-50 dark:bg-blue-950"
                  label="成員"
                />
                <FeatureCard
                  href={`/projects/${id}/stats`}
                  icon={<BarChart3 className="h-5 w-5 text-violet-600 dark:text-violet-400" />}
                  iconBgClass="bg-violet-50 dark:bg-violet-950"
                  label="統計"
                />
                <FeatureCard
                  onClick={() => setShowInvite(true)}
                  icon={<Share2 className="h-5 w-5 text-orange-600 dark:text-orange-400" />}
                  iconBgClass="bg-orange-50 dark:bg-orange-950"
                  label="邀請"
                />
                <FeatureCard
                  href={`/projects/${id}/export`}
                  icon={<Download className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />}
                  iconBgClass="bg-cyan-50 dark:bg-cyan-950"
                  label="匯出"
                />
                <FeatureCard
                  href={`/projects/${id}/settings`}
                  icon={<Settings className="h-5 w-5 text-slate-600 dark:text-slate-400" />}
                  iconBgClass="bg-slate-100 dark:bg-slate-800"
                  label="設定"
                />
                <FeatureCard
                  href={`/projects/${id}/activity-logs`}
                  icon={<History className="h-5 w-5 text-purple-600 dark:text-purple-400" />}
                  iconBgClass="bg-purple-50 dark:bg-purple-950"
                  label="歷史"
                />
                <FeatureCard
                  href={`/projects/${id}/mileage`}
                  icon={<Car className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
                  iconBgClass="bg-blue-50 dark:bg-blue-950"
                  label="里程"
                />
              </div>
            </div>

            {/* 第二頁 */}
            <div className="flex-shrink-0 w-full snap-center">
              <div className="grid grid-cols-4 gap-2">
                <FeatureCard
                  href={`/projects/${id}/currency`}
                  icon={<ArrowRightLeft className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
                  iconBgClass="bg-amber-50 dark:bg-amber-950"
                  label="幣種"
                />
                <FeatureCard
                  href={`/projects/${id}/notes`}
                  icon={<StickyNote className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />}
                  iconBgClass="bg-yellow-50 dark:bg-yellow-950"
                  label="筆記"
                />
              </div>
            </div>
          </div>

          {/* 頁面指示器 (小圓點) */}
          <div className="flex justify-center gap-1.5 mt-3">
            {Array.from({ length: totalPages }).map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  carouselRef.current?.scrollTo({
                    left: index * (carouselRef.current?.offsetWidth || 0),
                    behavior: "smooth",
                  })
                }}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  currentPage === index
                    ? "w-4 bg-slate-800 dark:bg-slate-200"
                    : "w-1.5 bg-slate-300 dark:bg-slate-600"
                }`}
                aria-label={`跳到第 ${index + 1} 頁`}
              />
            ))}
          </div>
        </div>

        {/* 總覽 */}
        <div>
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">總覽</h2>
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              title="總支出"
              value={formatCurrency(totalAmount, project.currency || DEFAULT_CURRENCY)}
              icon={<DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
              iconBgClass="bg-emerald-50 dark:bg-emerald-950"
              subtitle={`${project.expenses.length} 筆支出`}
            />
            <StatCard
              title="平均每人"
              value={formatCurrency(Math.round(perPerson), project.currency || DEFAULT_CURRENCY)}
              icon={<UserCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
              iconBgClass="bg-blue-50 dark:bg-blue-950"
              subtitle={`${project.members.length} 位成員`}
            />
          </div>
        </div>

        {/* 預算進度 - 只在設定預算時顯示 */}
        {budget !== null && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">預算進度</h2>
              <Link
                href={`/projects/${id}/settings`}
                className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
              >
                編輯預算
              </Link>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">
                  已花費 {formatCurrency(totalAmount, project.currency || DEFAULT_CURRENCY)} / {formatCurrency(budget, project.currency || DEFAULT_CURRENCY)}
                </span>
                <span className={`text-sm font-medium ${budgetProgress >= 100 ? "text-red-500" : budgetProgress >= 80 ? "text-amber-500" : "text-emerald-500"}`}>
                  {budgetProgress.toFixed(0)}%
                </span>
              </div>
              <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    budgetProgress >= 100
                      ? "bg-red-500"
                      : budgetProgress >= 80
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  }`}
                  style={{ width: `${budgetProgress}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-muted-foreground">
                  {budgetRemaining !== null && budgetRemaining >= 0
                    ? `剩餘 ${formatCurrency(budgetRemaining, project.currency || DEFAULT_CURRENCY)}`
                    : `超支 ${formatCurrency(Math.abs(budgetRemaining || 0), project.currency || DEFAULT_CURRENCY)}`}
                </span>
                {budgetProgress >= 100 && (
                  <span className="text-xs text-red-500 font-medium">已超出預算</span>
                )}
                {budgetProgress >= 80 && budgetProgress < 100 && (
                  <span className="text-xs text-amber-500 font-medium">接近預算上限</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 我的餘額 */}
        <div>
          <div className="flex items-center gap-1.5 mb-3">
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">我的餘額</h2>
            <Popover>
              <PopoverTrigger asChild>
                <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                  <Info className="h-4 w-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent side="bottom" align="start" className="w-auto max-w-64 p-3 text-xs">
                <p className="font-medium">餘額 = 你付的錢 − 你應付的錢</p>
                <p className="text-muted-foreground mt-1.5">正數 = 有人欠你錢</p>
                <p className="text-muted-foreground">負數 = 你欠別人錢</p>
                <p className="text-muted-foreground mt-1.5 text-[10px]">若顯示 $0，可能是你不在支出的分攤名單中，或帳號尚未綁定佔位成員</p>
              </PopoverContent>
            </Popover>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl p-3 sm:p-4 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <p
                  className={`text-2xl font-bold ${
                    displayBalance >= 0 ? "text-emerald-500" : "text-red-500"
                  }`}
                >
                  {displayBalance >= 0 ? "+" : "-"}{formatCurrency(Math.abs(displayBalance), project.currency || DEFAULT_CURRENCY)}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  {displayBalance > 0
                    ? "有人需要付你錢"
                    : displayBalance < 0
                    ? "你需要付給別人"
                    : "已結清"}
                </p>
              </div>
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                displayBalance > 0
                  ? "bg-emerald-50 dark:bg-emerald-950"
                  : displayBalance < 0
                  ? "bg-red-50 dark:bg-red-950"
                  : "bg-slate-100 dark:bg-slate-800"
              }`}>
                {displayBalance > 0 ? (
                  <TrendingUp className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                ) : displayBalance < 0 ? (
                  <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
                ) : (
                  <Minus className="h-6 w-6 text-slate-400" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 最近支出 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">最近支出</h2>
            <Link
              href={`/projects/${id}/expenses`}
              className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
            >
              查看全部
            </Link>
          </div>

          {project.expenses.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 py-12 text-center">
              <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                <Receipt className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-slate-500 dark:text-slate-400 mb-4">還沒有支出記錄</p>
              <Link href={`/projects/${id}/expenses/new`}>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  新增第一筆
                </Button>
              </Link>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
              {[...project.expenses]
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 5)
                .map((expense) => (
                <Link
                  key={expense.id}
                  href={`/projects/${id}/expenses/${expense.id}/edit`}
                  className="flex items-center gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <div
                    className={`h-10 w-10 rounded-xl flex items-center justify-center ${getCategoryColor(expense.category)}`}
                  >
                    {getCategoryIcon(expense.category)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate">
                      {expense.description || "支出"}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {expense.payer?.user?.name || expense.payer?.displayName || "未知"} 付款 ·{" "}
                      {expense.participants?.length || 0} 人分攤
                    </p>
                  </div>
                  <p className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                    {formatCurrency(Number(expense.amount), expense.currency || DEFAULT_CURRENCY)}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 浮動按鈕群組 - 垂直排列 */}
      <div className="fixed bottom-6 right-4 z-50 flex flex-col items-center gap-3">
        {/* AI 語音記帳按鈕 */}
        <Button
          size="icon"
          className="h-12 w-12 rounded-full shadow-lg shadow-fuchsia-500/25 bg-gradient-to-br from-fuchsia-500 to-violet-500 hover:from-fuchsia-600 hover:to-violet-600 hover:scale-105 active:scale-95 transition-all duration-200 text-white ring-2 ring-white/20"
          onClick={() => setShowVoiceDialog(true)}
        >
          <Sparkles className="h-5 w-5" />
        </Button>

        {/* 新增支出按鈕 - 主要動作（黑灰漸層） */}
        <Link href={`/projects/${id}/expenses/new`}>
          <Button size="icon" className="h-12 w-12 rounded-full shadow-lg shadow-slate-900/25 bg-gradient-to-br from-zinc-400 to-zinc-900 hover:from-zinc-300 hover:to-zinc-800 hover:scale-105 active:scale-95 transition-all duration-200 text-white ring-2 ring-white/20">
            <Plus className="h-5 w-5" />
          </Button>
        </Link>
      </div>

      {/* AI 語音記帳對話框 */}
      {project && (
        <VoiceExpenseDialog
          open={showVoiceDialog}
          onOpenChange={setShowVoiceDialog}
          projectId={id}
          projectName={project.name}
          members={project.members.map((m) => ({
            id: m.id,
            displayName: m.displayName,
            userId: m.user?.id || null,
            user: m.user,
          }))}
          currentUserMemberId={project.members.find((m) => m.user?.id === user?.id)?.id || ""}
          currency={project.currency || DEFAULT_CURRENCY}
          onSuccess={() => {
            fetchProject()
          }}
        />
      )}

      {/* 邀請對話框 */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>邀請成員加入</DialogTitle>
            <DialogDescription>
              選擇分享方式邀請朋友加入專案
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* 平台分享按鈕 */}
            <div className={`grid gap-3 ${canNativeShare ? "grid-cols-3" : "grid-cols-2"}`}>
              <button
                onClick={handleShareToLine}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="h-12 w-12 rounded-full bg-[#06C755] flex items-center justify-center">
                  <MessageCircle className="h-6 w-6 text-white" />
                </div>
                <span className="text-sm font-medium">LINE</span>
              </button>

              <button
                onClick={handleCopyLink}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="h-12 w-12 rounded-full bg-slate-500 flex items-center justify-center">
                  {copied ? <Check className="h-6 w-6 text-white" /> : <Link2 className="h-6 w-6 text-white" />}
                </div>
                <span className="text-sm font-medium">{copied ? "已複製" : "複製連結"}</span>
              </button>

              {canNativeShare && (
                <button
                  onClick={handleNativeShare}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="h-12 w-12 rounded-full bg-blue-500 flex items-center justify-center">
                    <MoreHorizontal className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-sm font-medium">更多</span>
                </button>
              )}
            </div>

            {/* 連結預覽 */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">分享連結</p>
              <p className="text-sm text-slate-700 dark:text-slate-300 break-all">{shareUrl}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
