"use client"

import { use, useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AppLayout } from "@/components/layout/app-layout"
import { Button } from "@/components/ui/button"
import { StatCard } from "@/components/dashboard/stat-card"
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
} from "lucide-react"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getProjectShareUrl } from "@/lib/utils"

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
  startDate: string | null
  endDate: string | null
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
  const [projectBasicInfo, setProjectBasicInfo] = useState<{ name: string; description: string | null } | null>(null)
  const [joining, setJoining] = useState(false)

  // 邀請分享相關狀態
  const [showInvite, setShowInvite] = useState(false)
  const [copied, setCopied] = useState(false)
  const [canNativeShare, setCanNativeShare] = useState(false)

  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && !!navigator.share)
  }, [])

  useEffect(() => {
    if (id) {
      fetchProject()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

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
        setProjectBasicInfo({ name: data.name, description: data.description })
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

  // 計算用戶的餘額
  const userBalance = useMemo(() => {
    if (!project || !user) return 0

    const membership = project.members.find((m) => m.user?.id === user.id)
    if (!membership) return 0

    let paid = 0
    let owed = 0

    project.expenses.forEach((expense) => {
      if (expense.payer.id === membership.id) {
        paid += Number(expense.amount)
      }
      const participant = expense.participants.find((p) => p.memberId === membership.id)
      if (participant) {
        owed += Number(participant.shareAmount)
      }
    })

    return paid - owed
  }, [project, user])


  if (loading) {
    return (
      <AppLayout title="專案" showBack>
        <div className="text-center py-8 text-muted-foreground">載入中...</div>
      </AppLayout>
    )
  }

  // 顯示加入 Dialog（非成員）
  if (showJoinDialog && projectBasicInfo) {
    return (
      <AppLayout title="專案" showBack>
        <Dialog open={showJoinDialog} onOpenChange={() => router.push("/projects")}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>加入「{projectBasicInfo.name}」</DialogTitle>
              <DialogDescription>
                你將以新成員身份加入此專案
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                加入後可以查看支出記錄、新增支出，並參與分帳。
              </p>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => router.push("/projects")}
                disabled={joining}
              >
                取消
              </Button>
              <Button
                onClick={handleJoinProject}
                disabled={joining}
              >
                {joining ? "加入中..." : "確認加入"}
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

  const totalAmount = project.expenses.reduce((sum, e) => sum + Number(e.amount), 0)
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
          <div className="grid grid-cols-4 gap-2">
            <Link href={`/projects/${id}/settle`}>
              <div className="bg-white dark:bg-slate-900 rounded-xl p-3 sm:p-4 border border-slate-200 dark:border-slate-800 flex flex-col items-center gap-2 hover:shadow-md transition-shadow cursor-pointer">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center">
                  <Calculator className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="font-medium text-sm text-slate-900 dark:text-slate-100">結算</p>
              </div>
            </Link>

            <Link href={`/projects/${id}/members`}>
              <div className="bg-white dark:bg-slate-900 rounded-xl p-3 sm:p-4 border border-slate-200 dark:border-slate-800 flex flex-col items-center gap-2 hover:shadow-md transition-shadow cursor-pointer">
                <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <p className="font-medium text-sm text-slate-900 dark:text-slate-100">成員</p>
              </div>
            </Link>

            <Link href={`/projects/${id}/stats`}>
              <div className="bg-white dark:bg-slate-900 rounded-xl p-3 sm:p-4 border border-slate-200 dark:border-slate-800 flex flex-col items-center gap-2 hover:shadow-md transition-shadow cursor-pointer">
                <div className="h-10 w-10 rounded-xl bg-violet-50 dark:bg-violet-950 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                </div>
                <p className="font-medium text-sm text-slate-900 dark:text-slate-100">統計</p>
              </div>
            </Link>

            <button onClick={() => setShowInvite(true)} className="bg-white dark:bg-slate-900 rounded-xl p-3 sm:p-4 border border-slate-200 dark:border-slate-800 flex flex-col items-center gap-2 hover:shadow-md transition-shadow cursor-pointer">
              <div className="h-10 w-10 rounded-xl bg-orange-50 dark:bg-orange-950 flex items-center justify-center">
                <Share2 className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <p className="font-medium text-sm text-slate-900 dark:text-slate-100">邀請</p>
            </button>

            <Link href={`/projects/${id}/export`}>
              <div className="bg-white dark:bg-slate-900 rounded-xl p-3 sm:p-4 border border-slate-200 dark:border-slate-800 flex flex-col items-center gap-2 hover:shadow-md transition-shadow cursor-pointer">
                <div className="h-10 w-10 rounded-xl bg-cyan-50 dark:bg-cyan-950 flex items-center justify-center">
                  <Download className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                </div>
                <p className="font-medium text-sm text-slate-900 dark:text-slate-100">匯出</p>
              </div>
            </Link>

            <Link href={`/projects/${id}/currency`}>
              <div className="bg-white dark:bg-slate-900 rounded-xl p-3 sm:p-4 border border-slate-200 dark:border-slate-800 flex flex-col items-center gap-2 hover:shadow-md transition-shadow cursor-pointer">
                <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-950 flex items-center justify-center">
                  <ArrowRightLeft className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <p className="font-medium text-sm text-slate-900 dark:text-slate-100">幣種</p>
              </div>
            </Link>

            <Link href={`/projects/${id}/settings`}>
              <div className="bg-white dark:bg-slate-900 rounded-xl p-3 sm:p-4 border border-slate-200 dark:border-slate-800 flex flex-col items-center gap-2 hover:shadow-md transition-shadow cursor-pointer">
                <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <Settings className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                </div>
                <p className="font-medium text-sm text-slate-900 dark:text-slate-100">設定</p>
              </div>
            </Link>

            <Link href={`/projects/${id}/notes`}>
              <div className="bg-white dark:bg-slate-900 rounded-xl p-3 sm:p-4 border border-slate-200 dark:border-slate-800 flex flex-col items-center gap-2 hover:shadow-md transition-shadow cursor-pointer">
                <div className="h-10 w-10 rounded-xl bg-yellow-50 dark:bg-yellow-950 flex items-center justify-center">
                  <StickyNote className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <p className="font-medium text-sm text-slate-900 dark:text-slate-100">筆記</p>
              </div>
            </Link>
          </div>
        </div>

        {/* 總覽 */}
        <div>
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">總覽</h2>
          <div className="grid grid-cols-2 gap-3">
            <StatCard title="總支出" value={`$${totalAmount.toLocaleString("zh-TW")}`} />
            <StatCard
              title="平均每人"
              value={`$${Math.round(perPerson).toLocaleString("zh-TW")}`}
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
                  已花費 ${totalAmount.toLocaleString("zh-TW")} / ${budget.toLocaleString("zh-TW")}
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
                    ? `剩餘 $${budgetRemaining.toLocaleString("zh-TW")}`
                    : `超支 $${Math.abs(budgetRemaining || 0).toLocaleString("zh-TW")}`}
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
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                  <Info className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-64">
                <p className="font-medium">餘額 = 你付的錢 − 你應付的錢</p>
                <p className="text-slate-400 mt-1.5">正數 = 有人欠你錢</p>
                <p className="text-slate-400">負數 = 你欠別人錢</p>
                <p className="text-slate-400 mt-1.5 text-[10px]">若顯示 $0，可能是你不在支出的分攤名單中，或帳號尚未綁定佔位成員</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl p-3 sm:p-4 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <p
                  className={`text-2xl font-bold ${
                    displayBalance >= 0 ? "text-emerald-500" : "text-red-500"
                  }`}
                >
                  {displayBalance >= 0 ? "+" : ""}${Math.abs(displayBalance).toLocaleString("zh-TW")}
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
                    ${Number(expense.amount).toLocaleString("zh-TW")}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 浮動新增按鈕 */}
      <Link href={`/projects/${id}/expenses/new`} className="fixed bottom-6 right-4 z-50">
        <Button size="icon" className="h-14 w-14 rounded-full shadow-xl shadow-black/25">
          <Plus className="h-6 w-6" />
        </Button>
      </Link>

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
