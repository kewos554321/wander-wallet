import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/system/theme-provider";
import { LiffProvider } from "@/components/auth/liff-provider";
import { AuthGate } from "@/components/auth/auth-gate";
import ServiceWorkerRegister from "@/components/system/sw-register";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Wander Wallet",
  description: "Travel expense sharing made easy",
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
      </body>
    </html>
  );
}
