import { describe, it, expect } from "vitest"
import { HumanMessage } from "@langchain/core/messages"
import { createQwenModel } from "@/lib/ai/qwen"

/**
 * Integration test for Qwen Vision model
 *
 * This test uses a real receipt image to verify the model can:
 * 1. Accept image input
 * 2. Process the image
 * 3. Return valid JSON response
 *
 * To run this test:
 * - Set QWEN_API_KEY in your .env file
 * - Run: npm run test vision-models.integration.test.ts
 *
 * NOTE: This test is marked as manual because it requires:
 * - Valid API key
 * - Network connection
 * - Real API calls (costs money)
 */

// 50x50 pixel PNG image as base64 (red square - meets Qwen's minimum size requirement)
// This is a valid PNG created programmatically
const TEST_IMAGE_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAAQklEQVR42u3PMQ0AAAgDINc/9K3hTSCQbRcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgJbCxAAABTUlEQVRogWNgGAWjYBSMglEwCkbBKBgFpAEACNgAAW/G4fQAAAAASUVORK5CYII="

const SIMPLE_PROMPT = `Analyze this image and respond with JSON only:
{
  "color": "red|blue|green|other",
  "confidence": 0.9
}

Just respond with the JSON, no other text.`

describe("Vision Models Integration Tests", () => {
  // Skip these tests if API key is not set
  const hasQwenKey = !!process.env.QWEN_API_KEY

  describe("Qwen Vision Model", () => {
    it.skipIf(!hasQwenKey)("should process image and return valid response", async () => {
      const model = createQwenModel({ temperature: 0.1, maxOutputTokens: 512 })

      const message = new HumanMessage({
        content: [
          {
            type: "text",
            text: SIMPLE_PROMPT,
          },
          {
            type: "image_url",
            image_url: {
              url: TEST_IMAGE_BASE64,
            },
          },
        ],
      })

      const response = await model.invoke([message])

      expect(response).toBeDefined()
      expect(response.content).toBeDefined()

      const content = typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content)

      console.log("Qwen response:", content)

      // Should contain some JSON-like structure (may be wrapped in markdown)
      expect(content).toContain("color")
      expect(content).toContain("confidence")
    }, 30000) // 30s timeout for API call
  })

})
