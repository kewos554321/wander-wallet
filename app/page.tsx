"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Users,
  Calculator,
  MessageCircle,
  Camera,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Wallet,
  Sparkles,
  HelpCircle,
  Check,
  Copy,
  Mail,
  Megaphone,
  Heart,
  Coffee,
  Mic,
  BarChart3,
  Share2,
  FileDown,
  MapPin,
  History
} from "lucide-react"
import Link from "next/link"
import { ModeToggle } from "@/components/system/mode-toggle"
import {
  OrganizationJsonLd,
  WebApplicationJsonLd,
  FaqJsonLd,
  HowToJsonLd
} from "@/components/seo/json-ld"

// LINE icon component
function LineIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
    </svg>
  )
}

// Facebook icon component
function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  )
}

// X (Twitter) icon component
function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  )
}

// PayPal icon component
function PaypalIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.816-5.09a.932.932 0 0 1 .923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.777-4.471z"/>
    </svg>
  )
}

const faqs = [
  {
    category: "基本使用",
    items: [
      {
        question: "什麼是 Wander Wallet？",
        answer: "Wander Wallet 是一款專為旅行設計的分帳工具，整合於 LINE 中使用。你可以在群組中記錄共同支出，系統會自動計算每個人應付或應收的金額。"
      },
      {
        question: "需要下載 App 嗎？",
        answer: "不需要！Wander Wallet 是 LIFF（LINE Front-end Framework）應用程式，直接在 LINE 中開啟即可使用，無需額外安裝。"
      },
      {
        question: "如何建立新的旅行專案？",
        answer: "點擊首頁的「建立專案」按鈕，輸入旅行名稱、選擇主要幣別，即可開始。你可以之後再邀請成員加入。"
      },
      {
        question: "可以同時管理多個旅行專案嗎？",
        answer: "可以！你可以建立多個專案，每個專案都是獨立的，方便你管理不同的旅行或活動。"
      }
    ]
  },
  {
    category: "分帳功能",
    items: [
      {
        question: "如何新增一筆支出？",
        answer: "進入專案後點擊「新增支出」，輸入金額、描述、選擇付款人和分攤成員。你也可以使用語音輸入或拍照發票來快速記錄。"
      },
      {
        question: "可以支援多種幣別嗎？",
        answer: "可以！每個專案可以設定主要幣別，記帳時也可以選擇其他幣別，系統會自動依匯率轉換計算。"
      },
      {
        question: "如何查看誰該付錢給誰？",
        answer: "進入專案的「結算」頁面，系統會自動計算最佳化的付款方式，讓轉帳次數降到最少。"
      },
      {
        question: "支出可以只讓部分成員分攤嗎？",
        answer: "可以！新增支出時可以自由選擇要分攤的成員，也可以設定每人不同的分攤金額。"
      },
      {
        question: "可以修改或刪除已記錄的支出嗎？",
        answer: "可以！點擊任一支出進入詳情頁，即可編輯或刪除。所有變更都會同步更新結算金額。"
      }
    ]
  },
  {
    category: "AI 智慧功能",
    items: [
      {
        question: "語音記帳怎麼用？",
        answer: "點擊新增支出頁面的麥克風圖示，說出消費內容（例如：「午餐 350 元我付的大家分」），AI 會自動解析並填入金額、描述等欄位。"
      },
      {
        question: "發票辨識準確嗎？",
        answer: "我們使用 Google Gemini 視覺 AI 辨識發票，能準確讀取金額、商家名稱、日期等資訊。辨識後仍可手動調整確保正確。"
      },
      {
        question: "AI 功能需要額外付費嗎？",
        answer: "目前所有 AI 功能（語音記帳、發票辨識）都是免費使用，未來可能會有使用次數限制。"
      }
    ]
  },
  {
    category: "成員與通知",
    items: [
      {
        question: "如何邀請朋友加入專案？",
        answer: "在專案設定中點擊「分享」，複製專屬連結分享到 LINE 群組。朋友點擊連結後即可加入專案。"
      },
      {
        question: "新支出會通知群組嗎？",
        answer: "會的！當你從 LINE 群組開啟並新增支出時，可以選擇是否發送通知到群組，讓大家即時知道。"
      },
      {
        question: "可以關閉 LINE 通知嗎？",
        answer: "可以！在「個人設定」中可以自由開關新增、修改、刪除支出時的 LINE 群組通知。"
      },
      {
        question: "朋友還沒有 LINE 帳號怎麼辦？",
        answer: "你可以先用朋友的名字新增為「佔位成員」，之後朋友加入時可以認領該成員，所有支出紀錄會自動綁定。"
      }
    ]
  },
  {
    category: "統計與匯出",
    items: [
      {
        question: "可以看到消費統計嗎？",
        answer: "可以！進入專案的「統計」頁面，可以查看各分類支出佔比、每日消費趨勢、成員消費排行等圖表分析。"
      },
      {
        question: "如何匯出帳目紀錄？",
        answer: "在專案的「匯出」頁面，可以選擇匯出 CSV 或 PDF 格式，方便存檔或分享給成員。"
      },
      {
        question: "可以記錄消費地點嗎？",
        answer: "可以！新增支出時可以加入地點資訊，之後在「地圖」頁面可以回顧整趟旅程的消費足跡。"
      }
    ]
  },
  {
    category: "帳號與隱私",
    items: [
      {
        question: "我的資料安全嗎？",
        answer: "我們重視你的隱私。所有資料都經過加密傳輸與儲存，只有專案成員能看到該專案的支出紀錄。"
      },
      {
        question: "如何登出帳號？",
        answer: "在「個人設定」頁面點擊頭像進入個人資料，滑到最下方即可找到「登出」按鈕。"
      },
      {
        question: "可以刪除我的帳號嗎？",
        answer: "目前可以透過意見回饋聯繫我們申請刪除帳號，我們會在確認後移除你的所有資料。"
      }
    ]
  }
]

export default function HomePage() {
  const [copied, setCopied] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const getShareUrl = () => typeof window !== "undefined" ? window.location.origin : ""
  const shareTitle = "Wander Wallet - 旅行分帳神器"
  const shareText = "在 LINE 群組中輕鬆管理共同支出"

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // 複製失敗
    }
  }

  const handleShareLine = () => {
    // 使用官方 LINE URL scheme 分享
    // https://developers.line.biz/en/docs/line-login/using-line-url-scheme/
    const url = `https://line.me/R/share?text=${encodeURIComponent(getShareUrl())}`
    window.open(url, "_blank", "width=600,height=500")
  }

  const handleShareFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getShareUrl())}`
    window.open(url, "_blank", "width=600,height=500")
  }

  const handleShareX = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle + " - " + shareText)}&url=${encodeURIComponent(getShareUrl())}`
    window.open(url, "_blank", "width=600,height=500")
  }

  const handleShareEmail = () => {
    const subject = encodeURIComponent(shareTitle)
    const body = encodeURIComponent(`${shareText}\n\n${getShareUrl()}`)
    window.location.href = `mailto:?subject=${subject}&body=${body}`
  }

  return (
    <>
      {/* SEO Structured Data */}
      <OrganizationJsonLd />
      <WebApplicationJsonLd />
      <FaqJsonLd faqs={faqs} />
      <HowToJsonLd />

      <div className="min-h-screen bg-background">
      {/* Navigation */}
      <header>
        <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b" aria-label="主要導覽">
          <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center" aria-hidden="true">
                <Wallet className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-foreground">Wander Wallet</span>
            </div>
            <div className="flex items-center gap-1">
              <a href="#features" aria-label="查看功能介紹">
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                  功能
                </Button>
              </a>
              <a href="#faq" aria-label="查看常見問題">
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                  FAQ
                </Button>
              </a>
              <ModeToggle />
            </div>
          </div>
        </nav>
      </header>

      <main>
      {/* Hero Section */}
      <section className="relative overflow-hidden px-6 pt-8 pb-16 bg-gradient-to-b from-brand-50 to-background" aria-labelledby="hero-title">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-200/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-brand-300/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative max-w-lg mx-auto text-center space-y-6">
          {/* Logo / Icon */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 shadow-lg shadow-brand-500/25">
            <Wallet className="w-10 h-10 text-white" />
          </div>

          <div className="space-y-3">
            <h1 id="hero-title" className="text-3xl font-bold text-foreground">
              Wander Wallet - 旅遊分帳神器
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              免費、簡單、好用的分帳工具<br />
              <span className="text-brand-600 font-medium">在 LINE 群組中輕鬆管理旅行共同支出</span>
            </p>
          </div>

          <Link href="/projects">
            <Button
              size="lg"
              className="bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white shadow-lg shadow-brand-500/25 px-8"
            >
              立即開始使用
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="scroll-mt-14 px-6 py-12 bg-background" aria-labelledby="features-title">
        <div className="max-w-lg mx-auto space-y-8">
          <h2 id="features-title" className="text-xl font-bold text-center text-foreground">
            Wander Wallet 主要功能 - 10 大旅遊分帳必備功能
          </h2>

          <div className="grid gap-4">
            <FeatureCard
              icon={<Users className="w-6 h-6" />}
              title="群組分帳"
              description="自動計算每人應付金額，支援多人分攤"
            />
            <FeatureCard
              icon={<Calculator className="w-6 h-6" />}
              title="多幣別支援"
              description="出國旅遊免煩惱，自動匯率轉換"
            />
            <FeatureCard
              icon={<MessageCircle className="w-6 h-6" />}
              title="LINE 通知"
              description="新增支出時自動通知群組成員"
            />
            <FeatureCard
              icon={<Camera className="w-6 h-6" />}
              title="AI 發票辨識"
              description="拍照上傳發票，自動填入金額與品項"
            />
            <FeatureCard
              icon={<Mic className="w-6 h-6" />}
              title="語音快速記帳"
              description="說出消費內容，AI 自動解析並填入"
            />
            <FeatureCard
              icon={<BarChart3 className="w-6 h-6" />}
              title="消費統計"
              description="圖表分析支出分佈，掌握花費狀況"
            />
            <FeatureCard
              icon={<Share2 className="w-6 h-6" />}
              title="一鍵分享"
              description="產生專案邀請連結，快速邀請好友加入"
            />
            <FeatureCard
              icon={<FileDown className="w-6 h-6" />}
              title="匯出報表"
              description="支援 CSV、PDF 格式匯出，方便存檔"
            />
            <FeatureCard
              icon={<MapPin className="w-6 h-6" />}
              title="消費地圖"
              description="記錄消費地點，回顧旅程足跡"
            />
            <FeatureCard
              icon={<History className="w-6 h-6" />}
              title="歷史紀錄"
              description="完整操作紀錄，隨時查閱變更歷史"
            />
          </div>
        </div>
      </section>

      {/* Tutorial Section */}
      <section className="px-6 py-12 bg-muted/50">
        <div className="max-w-lg mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold text-foreground">
              如何使用
            </h2>
            <p className="text-sm text-muted-foreground">
              只需 3 步驟，輕鬆開始分帳
            </p>
          </div>

          <div className="space-y-4">
            <TutorialStep
              step={1}
              title="建立旅行專案"
              description="輸入旅行名稱、選擇幣別，即可開始"
            />
            <TutorialStep
              step={2}
              title="邀請成員加入"
              description="分享專案連結到 LINE 群組，點擊即可加入"
            />
            <TutorialStep
              step={3}
              title="記錄每筆支出"
              description="輸入金額、選擇分攤成員，系統自動計算"
            />
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="scroll-mt-14 px-6 py-12 bg-background" aria-labelledby="faq-title">
        <div className="max-w-lg mx-auto space-y-8">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-100" aria-hidden="true">
              <HelpCircle className="w-7 h-7 text-brand-600" />
            </div>
            <div>
              <h2 id="faq-title" className="text-xl font-bold text-foreground">Wander Wallet 常見問題 FAQ</h2>
              <p className="text-sm text-muted-foreground mt-1">
                旅遊分帳、群組記帳的常見問題解答
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {faqs.map((section) => (
              <div key={section.category} className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground px-2">
                  {section.category}
                </h3>
                <div className="bg-card rounded-xl border border-border/50 divide-y divide-border/50 overflow-hidden">
                  {section.items.map((item, index) => (
                    <FaqItem
                      key={index}
                      question={item.question}
                      answer={item.answer}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-16 bg-gradient-to-t from-brand-50 to-background">
        <div className="max-w-lg mx-auto text-center space-y-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-100">
            <Sparkles className="w-6 h-6 text-brand-600" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">
              準備好開始了嗎？
            </h2>
            <p className="text-muted-foreground">
              分享給朋友，一起開始旅行分帳
            </p>
          </div>

          {/* Share buttons */}
          <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
            <Button
              variant="outline"
              size="lg"
              className="w-full border-[#06C755] text-[#06C755] hover:bg-[#06C755]/10"
              onClick={handleShareLine}
            >
              <LineIcon className="w-5 h-5 mr-2" />
              LINE
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full border-[#1877F2] text-[#1877F2] hover:bg-[#1877F2]/10"
              onClick={handleShareFacebook}
            >
              <FacebookIcon className="w-5 h-5 mr-2" />
              Facebook
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full border-foreground text-foreground hover:bg-foreground/10"
              onClick={handleShareX}
            >
              <XIcon className="w-4 h-4 mr-2" />
              X
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full border-muted-foreground text-muted-foreground hover:bg-muted"
              onClick={handleShareEmail}
            >
              <Mail className="w-4 h-4 mr-2" />
              Email
            </Button>
          </div>

          {/* Copy link */}
          <div className="pt-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={handleCopyLink}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2 text-green-600" />
                  已複製連結
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  複製連結
                </>
              )}
            </Button>
          </div>
        </div>
      </section>

      {/* Advertising & Donation Section */}
      <section className="px-6 py-12 bg-muted/50">
        <div className="max-w-lg mx-auto space-y-8">
          {/* Advertising */}
          <div className="bg-card rounded-xl border border-border/50 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <Megaphone className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">廣告合作</h3>
                <p className="text-sm text-muted-foreground">讓更多旅行者認識您的品牌</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Wander Wallet 每月服務數千位旅行愛好者。如果您有旅遊、住宿、交通相關的產品或服務，歡迎與我們合作推廣。
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = "mailto:kewos554321@gmail.com?subject=Wander Wallet 廣告合作洽詢"}
              >
                <Mail className="w-4 h-4 mr-2" />
                聯繫我們
              </Button>
            </div>
          </div>

          {/* Donation */}
          <div className="bg-card rounded-xl border border-border/50 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-pink-100 flex items-center justify-center">
                <Heart className="w-6 h-6 text-pink-600" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">支持我們</h3>
                <p className="text-sm text-muted-foreground">讓服務持續運作與進步</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Wander Wallet 是免費服務，由小團隊用愛維護。如果這個工具對你有幫助，歡迎支持我們持續開發新功能！
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-[#FFDD00] text-[#946C00] dark:text-[#FFDD00] hover:bg-[#FFDD00]/10"
                onClick={() => window.open("https://buymeacoffee.com/kewos55432m", "_blank")}
              >
                <Coffee className="w-4 h-4 mr-2" />
                Buy Me a Coffee
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-[#FF5E5B] text-[#FF5E5B] hover:bg-[#FF5E5B]/10"
                onClick={() => window.open("https://ko-fi.com/your-username", "_blank")}
              >
                <Heart className="w-4 h-4 mr-2" />
                Ko-fi
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-[#003087] text-[#003087] dark:border-[#0070BA] dark:text-[#0070BA] hover:bg-[#003087]/10 dark:hover:bg-[#0070BA]/10"
                onClick={() => window.open("https://paypal.me/your-username", "_blank")}
              >
                <PaypalIcon className="w-4 h-4 mr-2" />
                PayPal
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = "mailto:kewos554321@gmail.com?subject=Wander Wallet 贊助詢問"}
              >
                <Mail className="w-4 h-4 mr-2" />
                其他方式
              </Button>
            </div>
          </div>
        </div>
      </section>

      </main>

      {/* Footer */}
      <footer className="px-6 py-8 border-t bg-background" role="contentinfo">
        <div className="max-w-lg mx-auto text-center text-sm text-muted-foreground space-y-2">
          <p>
            <strong>Wander Wallet</strong> - 免費旅遊分帳 App
          </p>
          <p>專為 LINE 用戶打造的群組分帳工具</p>
          <p className="text-xs">
            © {new Date().getFullYear()} Wander Wallet. All rights reserved.
          </p>
        </div>
      </footer>

      {/* Scroll to Top Button */}
      <button
        onClick={scrollToTop}
        className={`fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-brand-500 text-white shadow-lg shadow-brand-500/25 flex items-center justify-center transition-all duration-300 hover:bg-brand-600 active:scale-95 ${
          showScrollTop ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        }`}
        aria-label="回到最上面"
      >
        <ChevronUp className="w-6 h-6" />
      </button>
    </div>
    </>
  )
}

function FeatureCard({
  icon,
  title,
  description
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-xl bg-card border border-border/50 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-brand-100 flex items-center justify-center text-brand-600">
        {icon}
      </div>
      <div className="space-y-1">
        <h3 className="font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  )
}

function TutorialStep({
  step,
  title,
  description
}: {
  step: number
  title: string
  description: string
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold shadow-md">
        {step}
      </div>
      <div className="flex-1 pt-1 space-y-1">
        <h3 className="font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  )
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-muted/50 transition-colors"
      >
        <span className="font-medium text-foreground text-sm leading-relaxed">
          {question}
        </span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      <div
        className={`grid transition-all duration-200 ease-out ${
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <p className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed">
            {answer}
          </p>
        </div>
      </div>
    </div>
  )
}
