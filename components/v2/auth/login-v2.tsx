"use client"

import { UiV2Scope } from "@/components/v2/ui-v2-scope"

export interface LoginV2Props {
  isDevMode: boolean
  onLogin: () => void
}

const LINE_PATH =
  "M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.349 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"

/** v2 login screen (A18), shown by AuthGate for unauthenticated v2 users. */
export function LoginV2({ isDevMode, onLogin }: LoginV2Props) {
  return (
    <UiV2Scope className="flex min-h-screen items-center justify-center p-4">
      <div data-testid="login-v2" className="w-[320px] rounded-[20px] border border-v2-line bg-v2-surface px-[26px] py-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[20px] bg-v2-lake font-v2-serif text-[26px] font-bold text-v2-paper">
          W
        </div>
        <h1 className="m-0 font-v2-serif text-[22px] font-bold text-v2-ink">Wander Wallet</h1>
        <p className="mb-6 mt-1.5 text-[13px] leading-[1.5] text-v2-ink-muted">
          <span className="block">旅行分帳好幫手</span>
          <span className="block">和旅伴一起輕鬆記帳、安心同行</span>
        </p>

        {isDevMode ? (
          <p className="mb-3 rounded-[12px] border border-v2-gold-tint bg-v2-gold-soft px-3 py-2 text-[12px] text-v2-gold">
            LIFF ID 未設定，使用模擬登入
          </p>
        ) : null}

        <button
          type="button"
          onClick={onLogin}
          className="flex h-[50px] w-full items-center justify-center gap-2 rounded-[14px] bg-v2-lake text-[15px] font-bold text-v2-paper"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d={LINE_PATH} />
          </svg>
          {isDevMode ? "開發模式登入" : "使用 LINE 登入"}
        </button>

        <p className="mb-0 mt-[18px] text-[11px] text-v2-ink-subtle">登入即表示你同意旅程記錄與成員共享你的消費資料</p>
      </div>
    </UiV2Scope>
  )
}
