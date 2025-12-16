import liff from "@line/liff"

export interface LiffUser {
  lineUserId: string
  displayName: string
  pictureUrl?: string
  statusMessage?: string
}

let isInitialized = false

export async function initLiff(): Promise<void> {
  if (isInitialized) return

  const liffId = process.env.NEXT_PUBLIC_LIFF_ID
  if (!liffId) {
    throw new Error("NEXT_PUBLIC_LIFF_ID is not set")
  }

  await liff.init({ liffId })
  isInitialized = true
}

export function isLoggedIn(): boolean {
  return liff.isLoggedIn()
}

export function login(redirectUri?: string): void {
  liff.login({ redirectUri: redirectUri || window.location.href })
}

export function logout(): void {
  liff.logout()
  window.location.reload()
}

export async function getProfile(): Promise<LiffUser | null> {
  if (!liff.isLoggedIn()) return null

  try {
    const profile = await liff.getProfile()
    return {
      lineUserId: profile.userId,
      displayName: profile.displayName,
      pictureUrl: profile.pictureUrl,
      statusMessage: profile.statusMessage,
    }
  } catch (error) {
    console.error("Failed to get LINE profile:", error)
    return null
  }
}

export function getAccessToken(): string | null {
  return liff.getAccessToken()
}

export function getIdToken(): string | null {
  return liff.getIDToken()
}

export function isInClient(): boolean {
  return liff.isInClient()
}

export function getOS(): "ios" | "android" | "web" | undefined {
  return liff.getOS()
}

export function closeWindow(): void {
  liff.closeWindow()
}
