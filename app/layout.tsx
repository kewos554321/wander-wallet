import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/system/theme-provider";
import { LiffProvider } from "@/components/auth/liff-provider";
import { AuthGate } from "@/components/auth/auth-gate";
import ServiceWorkerRegister from "@/components/system/sw-register";
import { DebugOverlay } from "@/components/debug/debug-overlay";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://wander-wallet-app.vercel.app"),
  title: {
    default: "Wander Wallet - 旅遊分帳神器 | LINE 群組分帳 App",
    template: "%s | Wander Wallet",
  },
  description:
    "免費旅行分帳工具！輕鬆記錄旅遊支出，自動計算誰該付誰多少錢。支援多人分帳、多幣別、AI 發票辨識、語音記帳。在 LINE 群組中一鍵分享，讓出遊不再為錢煩惱。",
  keywords: [
    // 中文關鍵字
    "分帳",
    "旅遊分帳",
    "記帳",
    "共同支出",
    "AA制",
    "出遊記帳",
    "群組分帳",
    "多人分帳",
    "旅行記帳",
    "費用分攤",
    "結算",
    "LINE 分帳",
    "免費分帳 App",
    // 英文關鍵字
    "travel expense",
    "split bill",
    "expense tracker",
    "group expense",
    "travel budget",
    "bill splitter",
  ],
  authors: [{ name: "Wander Wallet Team" }],
  creator: "Wander Wallet Team",
  publisher: "Wander Wallet",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  category: "Finance",
  classification: "Travel, Finance, Productivity",
  verification: {
    google: "YOUR_GOOGLE_VERIFICATION_CODE", // 替換成你的驗證碼
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://wander-wallet-app.vercel.app",
    languages: {
      "zh-TW": "https://wander-wallet-app.vercel.app",
    },
  },
  openGraph: {
    type: "website",
    locale: "zh_TW",
    url: "https://wander-wallet-app.vercel.app",
    siteName: "Wander Wallet",
    title: "Wander Wallet - 旅遊分帳神器 | 免費群組分帳 App",
    description:
      "免費旅行分帳工具！自動計算誰該付誰多少錢，支援多人分帳、多幣別、AI 發票辨識。在 LINE 群組中一鍵分享。",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Wander Wallet - 旅遊分帳神器",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Wander Wallet - 旅遊分帳神器",
    description: "免費旅行分帳工具！自動計算分帳，支援 AI 發票辨識、語音記帳。",
    images: ["/og-image.png"],
    creator: "@wanderwallet",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Wander Wallet",
  },
  appLinks: {
    web: {
      url: "https://wander-wallet-app.vercel.app",
      should_fallback: true,
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <LiffProvider>
          <ThemeProvider defaultTheme="system" enableSystem>
            <AuthGate>
              {children}
            </AuthGate>
          </ThemeProvider>
        </LiffProvider>
        <ServiceWorkerRegister />
        <DebugOverlay />
      </body>
    </html>
  );
}
