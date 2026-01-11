/* c8 ignore start */
"use client"

import { useState, useCallback, useRef } from "react"

export interface MediaRecorderSpeechState {
  isSupported: boolean
  isRecording: boolean
  error: string | null
  audioBlob: Blob | null
}

/**
 * 使用 MediaRecorder API 錄音
 * 支援 iOS LIFF 環境
 */
export function useMediaRecorderSpeech() {
  const [state, setState] = useState<MediaRecorderSpeechState>({
    isSupported: typeof window !== "undefined" && 
      !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) &&
      !!(window.MediaRecorder),
    isRecording: false,
    error: null,
    audioBlob: null,
  })

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  const startRecording = useCallback(async () => {
    if (!state.isSupported) {
      setState(prev => ({ 
        ...prev, 
        error: "您的瀏覽器不支援錄音功能" 
      }))
      return
    }

    if (state.isRecording) return

    setState(prev => ({ 
      ...prev, 
      error: null, 
      audioBlob: null 
    }))
    chunksRef.current = []

    try {
      // 請求麥克風權限
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000, // Whisper 推薦
        },
      })
      streamRef.current = stream

      // 建立 MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm") 
          ? "audio/webm" 
          : "audio/mp4",
      })
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { 
          type: chunksRef.current[0]?.type || "audio/webm" 
        })
        setState(prev => ({
          ...prev,
          isRecording: false,
          audioBlob: blob,
        }))

        // 清理 stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop())
          streamRef.current = null
        }
      }

      mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder error:", event)
        setState(prev => ({
          ...prev,
          isRecording: false,
          error: "錄音發生錯誤",
        }))
      }

      mediaRecorder.start()
      setState(prev => ({ ...prev, isRecording: true }))
    } catch (error) {
      console.error("Failed to start recording:", error)
      let errorMessage = "無法啟動錄音"
      if (error instanceof Error) {
        if (error.name === "NotAllowedError") {
          errorMessage = "請允許麥克風權限"
        } else if (error.name === "NotFoundError") {
          errorMessage = "找不到麥克風設備"
        }
      }
      setState(prev => ({ ...prev, error: errorMessage }))
    }
  }, [state.isSupported, state.isRecording])

  const stopRecording = useCallback(() => {
    if (!state.isRecording || !mediaRecorderRef.current) return

    try {
      mediaRecorderRef.current.stop()
    } catch (error) {
      console.error("Failed to stop recording:", error)
      setState(prev => ({
        ...prev,
        isRecording: false,
        error: "停止錄音時發生錯誤",
      }))
    }
  }, [state.isRecording])

  const reset = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null,
      audioBlob: null,
    }))
    chunksRef.current = []
  }, [])

  return {
    ...state,
    startRecording,
    stopRecording,
    reset,
  }
}
/* c8 ignore stop */
