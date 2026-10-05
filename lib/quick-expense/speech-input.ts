"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useAuthFetch } from "@/components/auth/liff-provider"
import { useMediaRecorderSpeech } from "@/lib/media-recorder-speech"
import { useSpeechRecognition } from "@/lib/speech"

// Web Speech API first; iOS LIFF (no Web Speech) records audio and
// transcribes it on the server. Same engine choice as the v1 dialog.
export function useSpeechInput({ onText }: { onText: (text: string) => void }) {
  const authFetch = useAuthFetch()
  const web = useSpeechRecognition()
  const rec = useMediaRecorderSpeech()
  const useRecorder = !web.isSupported && rec.isSupported
  const [transcribing, setTranscribing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const onTextRef = useRef(onText)
  onTextRef.current = onText
  // A recognition session can deliver a late final result after `onend`, and
  // Android Chrome can report a spurious start/stop around one utterance. Both
  // would make us emit the same phrase twice, so consume at most one finished
  // transcript and re-arm only when the mic is explicitly started again.
  const consumedRef = useRef(false)

  useEffect(() => {
    if (useRecorder || web.isRecording) return
    if (consumedRef.current) return
    const text = web.transcript.trim()
    if (!text) return
    consumedRef.current = true
    onTextRef.current(text)
    web.resetTranscript()
  }, [useRecorder, web.isRecording, web.transcript, web])

  useEffect(() => {
    if (!useRecorder || !rec.audioBlob) return
    const blob = rec.audioBlob
    let cancelled = false
    setTranscribing(true)
    setError(null)
    ;(async () => {
      try {
        const form = new FormData()
        form.append("file", blob, "audio.webm")
        const res = await authFetch("/api/voice/transcribe", { method: "POST", body: form })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error || "語音轉文字失敗")
        if (!cancelled && data.text?.trim()) onTextRef.current(data.text.trim())
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "語音轉文字失敗")
      } finally {
        rec.reset()
        if (!cancelled) setTranscribing(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rec.audioBlob, useRecorder])

  const recording = web.isRecording || rec.isRecording
  const toggle = useCallback(() => {
    setError(null)
    // Starting a new recording is the only thing that re-arms the transcript
    // guard, so a spurious isRecording flicker cannot re-emit the same phrase.
    if (useRecorder) {
      if (rec.isRecording) rec.stopRecording()
      else {
        consumedRef.current = false
        rec.startRecording()
      }
    } else if (web.isRecording) {
      web.stopRecording()
    } else {
      consumedRef.current = false
      web.startRecording()
    }
  }, [useRecorder, rec, web])

  return {
    supported: web.isSupported || rec.isSupported,
    recording,
    transcribing,
    error: error ?? web.error ?? rec.error,
    toggle,
  }
}
