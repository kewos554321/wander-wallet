/* c8 ignore start */
"use client"

import { useState, useEffect, useCallback, useRef } from "react"

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionErrorEvent {
  error: string
  message?: string
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition
    webkitSpeechRecognition: new () => SpeechRecognition
  }
}

// 型別定義
export type SupportReason = "ssr" | "wkwebview" | "no-api" | "ios-safari" | "full"

export interface SpeechSupportStatus {
  supported: boolean
  reason: SupportReason
}

// 平台偵測
export function detectPlatform() {
  if (typeof window === "undefined") {
    return { isIOS: false, isAndroid: false, isWKWebView: false, isLIFF: false }
  }

  const ua = navigator.userAgent

  // iOS 偵測
  const isIOS = /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)

  // Android 偵測
  const isAndroid = /Android/.test(ua)

  // WKWebView 偵測 (LINE, Facebook 等 in-app browser)
  const isWKWebView = isIOS && (
    /FBAN|FBAV|Line|Instagram|Twitter/.test(ua) ||
    // standalone PWA 也用 WKWebView
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true ||
    // 檢查是否缺少 Safari 特徵但是 iOS
    (!/Safari/.test(ua) && /AppleWebKit/.test(ua))
  )

  // LIFF 環境偵測
  const isLIFF = /Line/.test(ua) || typeof window !== "undefined" && "liff" in window

  return { isIOS, isAndroid, isWKWebView, isLIFF }
}

// 檢查瀏覽器是否支援語音辨識
function checkSpeechRecognitionSupport(): SpeechSupportStatus {
  if (typeof window === "undefined") return { supported: false, reason: "ssr" as const }

  const { isIOS, isAndroid, isWKWebView, isLIFF } = detectPlatform()

  // 只有 iOS 的 WKWebView/LIFF 不支援 Web Speech API
  // Android LIFF 使用 Chrome WebView，支援 Web Speech API
  if (isIOS && (isWKWebView || isLIFF)) {
    return { supported: false, reason: "wkwebview" as const }
  }

  // 檢查 API 是否存在
  const hasAPI = !!(window.SpeechRecognition || window.webkitSpeechRecognition)

  if (!hasAPI) {
    return { supported: false, reason: "no-api" as const }
  }

  // iOS Safari 支援但有限制
  if (isIOS) {
    return { supported: true, reason: "ios-safari" as const }
  }

  return { supported: true, reason: "full" as const }
}

export function useSpeechRecognition() {
  const [supportStatus, setSupportStatus] = useState<SpeechSupportStatus>({ supported: false, reason: "ssr" })
  const [platform, setPlatform] = useState({ isIOS: false, isAndroid: false, isWKWebView: false, isLIFF: false })
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [interimTranscript, setInterimTranscript] = useState("")
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  useEffect(() => {
    // 初始化平台偵測
    const detectedPlatform = detectPlatform()
    setPlatform(detectedPlatform)

    // 檢查語音支援狀態
    const status = checkSpeechRecognitionSupport()
    setSupportStatus(status)

    if (!status.supported) return

    // 檢查瀏覽器支援
    const SpeechRecognitionAPI =
      typeof window !== "undefined"
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null

    if (SpeechRecognitionAPI) {
      const recognition = new SpeechRecognitionAPI()

      // iOS Safari 不支援 continuous mode
      if (detectedPlatform.isIOS) {
        recognition.continuous = false
        recognition.interimResults = true
      } else {
        recognition.continuous = true
        recognition.interimResults = true
      }

      recognition.lang = "zh-TW"

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = ""
        let interimText = ""

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          if (result.isFinal) {
            finalTranscript += result[0].transcript
          } else {
            interimText += result[0].transcript
          }
        }

        if (finalTranscript) {
          setTranscript((prev) => prev + finalTranscript)
        }
        setInterimTranscript(interimText)
      }

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        switch (event.error) {
          case "not-allowed":
            setError("請允許麥克風權限")
            break
          case "no-speech":
            setError("沒有偵測到語音")
            break
          case "network":
            setError("網路錯誤，請檢查連線")
            break
          case "aborted":
            // iOS 常見的中斷，不顯示錯誤
            break
          default:
            setError(`語音辨識錯誤: ${event.error}`)
        }
        setIsRecording(false)
      }

      recognition.onend = () => {
        setIsRecording(false)
        setInterimTranscript("")
      }

      recognition.onstart = () => {
        setIsRecording(true)
        setError(null)
      }

      recognitionRef.current = recognition
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
    }
  }, [])

  const startRecording = useCallback(() => {
    if (recognitionRef.current && !isRecording) {
      setTranscript("")
      setInterimTranscript("")
      setError(null)
      try {
        recognitionRef.current.start()
      } catch (e) {
        // 可能已經在錄音中
        console.error("Start recording error:", e)
      }
    }
  }, [isRecording])

  const stopRecording = useCallback(() => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop()
    }
  }, [isRecording])

  const resetTranscript = useCallback(() => {
    setTranscript("")
    setInterimTranscript("")
    setError(null)
  }, [])

  return {
    isSupported: supportStatus.supported,
    supportStatus,
    platform,
    isRecording,
    transcript,
    interimTranscript,
    error,
    startRecording,
    stopRecording,
    resetTranscript,
  }
}
/* c8 ignore stop */
