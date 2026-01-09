import Script from "next/script"

const baseUrl = "https://wander-wallet-app.vercel.app"

// Organization/Brand Schema
export function OrganizationJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Wander Wallet",
    url: baseUrl,
    logo: `${baseUrl}/icon-512x512.png`,
    description: "旅行分帳神器 - 在 LINE 群組中輕鬆管理共同支出",
    sameAs: [],
    contactPoint: {
      "@type": "ContactPoint",
      email: "kewos554321@gmail.com",
      contactType: "customer service",
      availableLanguage: ["zh-TW", "en"],
    },
  }

  return (
    <Script
      id="organization-jsonld"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

// WebApplication Schema
export function WebApplicationJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Wander Wallet",
    url: baseUrl,
    description: "輕鬆記錄旅遊支出，自動計算分帳，讓出遊不再為錢煩惱。支援多人分帳、即時同步、LINE 登入。",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Any",
    browserRequirements: "Requires JavaScript. Requires HTML5.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "TWD",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: "100",
      bestRating: "5",
      worstRating: "1",
    },
    featureList: [
      "群組分帳",
      "多幣別支援",
      "LINE 通知",
      "AI 發票辨識",
      "語音快速記帳",
      "消費統計",
      "一鍵分享",
      "匯出報表",
    ],
    screenshot: `${baseUrl}/og-image.png`,
    softwareVersion: "1.0.0",
    author: {
      "@type": "Organization",
      name: "Wander Wallet Team",
    },
  }

  return (
    <Script
      id="webapp-jsonld"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

// FAQ Schema
interface FaqItem {
  question: string
  answer: string
}

interface FaqSection {
  category: string
  items: FaqItem[]
}

export function FaqJsonLd({ faqs }: { faqs: FaqSection[] }) {
  const allFaqs = faqs.flatMap((section) => section.items)

  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: allFaqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  }

  return (
    <Script
      id="faq-jsonld"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

// BreadcrumbList Schema
interface BreadcrumbItem {
  name: string
  url: string
}

export function BreadcrumbJsonLd({ items }: { items: BreadcrumbItem[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }

  return (
    <Script
      id="breadcrumb-jsonld"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

// HowTo Schema for tutorial section
export function HowToJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "如何使用 Wander Wallet 分帳",
    description: "只需 3 步驟，輕鬆開始使用 Wander Wallet 進行旅行分帳",
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "建立旅行專案",
        text: "輸入旅行名稱、選擇幣別，即可開始",
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "邀請成員加入",
        text: "分享專案連結到 LINE 群組，點擊即可加入",
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "記錄每筆支出",
        text: "輸入金額、選擇分攤成員，系統自動計算",
      },
    ],
    totalTime: "PT5M",
  }

  return (
    <Script
      id="howto-jsonld"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
