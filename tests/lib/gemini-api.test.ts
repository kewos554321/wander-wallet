/**
 * 簡單測試 Gemini API 連接
 *
 * 執行方式：
 *   GEMINI_API_KEY=your_key npm run test:run -- tests/lib/gemini-api.test.ts
 */
import { describe, it, expect } from "vitest"

const SKIP_INTEGRATION = !process.env.GEMINI_API_KEY

describe.skipIf(SKIP_INTEGRATION)("Gemini API Direct Test", () => {
  it("should connect to Gemini API with simple text", async () => {
    const apiKey = process.env.GEMINI_API_KEY

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: "Say hello in JSON format: {\"greeting\": \"...\"}" }],
            },
          ],
        }),
      }
    )

    const data = await response.json()
    console.log("Response status:", response.status)
    console.log("Response data:", JSON.stringify(data, null, 2))

    expect(response.ok).toBe(true)
    expect(data.candidates).toBeDefined()
  }, 30000)

  it("should handle image with Gemini Vision", async () => {
    const apiKey = process.env.GEMINI_API_KEY

    // 簡單的 1x1 紅色 PNG
    const base64Image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: "What color is this image? Reply with just the color name." },
                {
                  inlineData: {
                    mimeType: "image/png",
                    data: base64Image,
                  },
                },
              ],
            },
          ],
        }),
      }
    )

    const data = await response.json()
    console.log("Vision response status:", response.status)
    console.log("Vision response data:", JSON.stringify(data, null, 2))

    expect(response.ok).toBe(true)
    expect(data.candidates).toBeDefined()
  }, 30000)
})
