# Groq Whisper API 設定指南

## 為什麼選擇 Groq？

- 💰 **完全免費**（有慷慨的免費額度）
- ⚡ **超快速度**（164x-216x 實時速度，3.7 秒轉錄 10 分鐘音檔）
- 🎯 **高準確度**（WER 10.3%）
- 🌏 **支援中文**（及 99 種語言）
- 📱 **支援 iOS LIFF**（使用 MediaRecorder API）

## 如何取得 API Key

1. 前往 [Groq Console](https://console.groq.com/keys)
2. 註冊或登入帳號
3. 點擊「Create API Key」
4. 複製 API key
5. 貼到 `.env` 檔案：

```bash
GROQ_API_KEY="your_api_key_here"
```

## 技術架構

### 前端（iOS LIFF 環境）
- 使用 `MediaRecorder` API 錄音
- 支援 iOS WKWebView（LINE LIFF）
- 錄音完成後自動轉文字

### 後端
- API 端點：`/api/voice/transcribe`
- 使用 Groq Whisper Large v3 Turbo
- 自動偵測中文語言

### 桌面/Android
- 優先使用瀏覽器原生 Web Speech API
- Fallback 到 MediaRecorder + Groq

## 使用方式

1. 開啟「AI 快速記帳」對話框
2. 點擊「語音輸入」按鈕
3. 說出消費內容（例如：「早餐 50、午餐 80 我付」）
4. 錄音完成後會自動轉成文字
5. 點擊「AI 解析」即可

## 費用說明

Groq 提供免費額度：
- 免費層級：充足的 API 呼叫額度
- 無需信用卡
- 適合個人和小型專案

官方定價：$0.05 per hour of audio（付費時）

## 相關檔案

- `lib/media-recorder-speech.ts` - MediaRecorder 錄音 hook
- `app/api/voice/transcribe/route.ts` - Groq API 端點
- `components/voice/voice-expense-dialog.tsx` - UI 整合
