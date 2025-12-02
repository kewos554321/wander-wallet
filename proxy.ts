import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  
  // 使用 getToken 檢查 JWT，不依賴 Prisma
  const token = await getToken({ 
    req,
    secret: process.env.NEXTAUTH_SECRET 
  })
  const isLoggedIn = !!token

  // 公開路由（不需要登入即可訪問）
  const publicPaths = [
    "/login",
    "/register",
    "/api/auth",
  ]
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path))

  // 如果未登入且訪問需要保護的路由，重定向到登入頁
  if (!isLoggedIn && !isPublicPath) {
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 如果已登入且訪問登入頁或註冊頁，重定向到首頁
  if (isLoggedIn && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/", req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * 匹配所有路徑，除了：
     * - _next/static (靜態文件)
     * - _next/image (圖片優化文件)
     * - favicon.ico (圖標)
     * - public 文件夾中的文件
     * - 圖片文件
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}

