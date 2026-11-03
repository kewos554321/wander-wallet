"use client"

import { LoginV2 } from "@/components/v2/auth/login-v2"

// LoginV2 carries its own UiV2Scope; the login action is a demo no-op.
export default function LoginDemoPage() {
  return <LoginV2 isDevMode={false} onLogin={() => alert("（demo）LINE 登入")} />
}
