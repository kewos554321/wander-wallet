import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/db"

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    // Credentials 登入（開發/測試用）
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email) {
          return null
        }

        const email = credentials.email as string

        // 查找或創建用戶
        let user = await prisma.user.findUnique({
          where: { email },
        })

        if (!user) {
          // 自動創建新用戶（開發模式）
          user = await prisma.user.create({
            data: {
              email,
              name: email.split("@")[0],
              emailVerified: new Date(),
            },
          })
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        }
      },
    }),
    // Google OAuth（可選）
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async session({ session, token }) {
      // JWT strategy 使用 token 而不是 user
      if (session.user && token) {
        session.user.id = token.sub as string
      }
      return session
    },
    async jwt({ token, user }) {
      // 首次登入時，將 user id 存到 token
      if (user) {
        token.sub = user.id
      }
      return token
    },
    async signIn({ account }) {
      // 允許所有登入
      if (account?.provider === "google") {
        return true
      }
      if (account?.provider === "credentials") {
        return true
      }
      return true
    },
  },
  session: {
    strategy: "jwt", // 改用 JWT 策略，可在 Edge Runtime 運行
  },
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET,
})

