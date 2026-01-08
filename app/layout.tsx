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
    default: "Wander Wallet - 旅遊分帳神器",
    template: "%s | Wander Wallet",
  },
  description: "輕鬆記錄旅遊支出，自動計算分帳，讓出遊不再為錢煩惱。支援多人分帳、即時同步、LINE 登入。",
  keywords: ["分帳", "旅遊", "記帳", "共同支出", "AA制", "出遊記帳", "travel expense", "split bill"],
  authors: [{ name: "Wander Wallet Team" }],
  verification: {
    google: "YOUR_GOOGLE_VERIFICATION_CODE", // 替換成你的驗證碼
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "zh_TW",
    url: "https://wander-wallet-app.vercel.app",
    siteName: "Wander Wallet",
    title: "Wander Wallet - 旅遊分帳神器",
    description: "輕鬆記錄旅遊支出，自動計算分帳，讓出遊不再為錢煩惱。",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Wander Wallet - 旅遊分帳神器",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Wander Wallet - 旅遊分帳神器",
    description: "輕鬆記錄旅遊支出，自動計算分帳，讓出遊不再為錢煩惱。",
    images: ["/og-image.png"],
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
