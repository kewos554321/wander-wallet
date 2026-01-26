#!/usr/bin/env node
/**
 * 測試 Qwen API Key 是否有效
 *
 * Usage: node scripts/test-qwen-api.mjs
 */

import { config } from "dotenv"

config()

const API_KEY = process.env.QWEN_API_KEY

if (!API_KEY) {
  console.error("❌ QWEN_API_KEY 未設定在 .env 檔案中")
  process.exit(1)
}

console.log("🔑 API Key:", API_KEY.substring(0, 10) + "..." + API_KEY.substring(API_KEY.length - 4))
console.log("📝 API Key 長度:", API_KEY.length)
console.log("✅ API Key 格式:", API_KEY.startsWith("sk-") ? "正確 (sk-開頭)" : "⚠️  不是 sk- 開頭")

console.log("\n🧪 測試 API 連線...")

const regions = [
  {
    name: "中國（北京）",
    url: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
  },
  {
    name: "國際（新加坡）",
    url: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions",
  },
  {
    name: "美國（維吉尼亞）",
    url: "https://dashscope-us.aliyuncs.com/compatible-mode/v1/chat/completions",
  },
]

const models = [
  "qwen3-vl-flash",           // 最便宜的 vision 模型
  "qwen-vl-plus",
  "qwen-vl-max-latest",
  "qwen-plus",                // 普通文本模型作為測試
]

const testConfigs = []
for (const region of regions) {
  for (const model of models) {
    testConfigs.push({
      name: `${region.name} - ${model}`,
      url: region.url,
      model: model,
    })
  }
}

for (const config of testConfigs) {
  console.log(`\n📋 測試配置: ${config.name}`)
  console.log(`   URL: ${config.url}`)
  console.log(`   Model: ${config.model}`)

  try {
    const response = await fetch(config.url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          {
            role: "user",
            content: config.model.includes("vl") ? [
              {
                type: "text",
                text: "Hello, respond with 'OK'",
              },
            ] : "Hello, respond with 'OK'",
          },
        ],
        max_tokens: 10,
      }),
    })

    console.log(`   📡 HTTP Status: ${response.status} ${response.statusText}`)

    const data = await response.json()

    if (response.ok) {
      console.log(`   ✅ 成功！`)
      console.log(`   📄 回應:`, JSON.stringify(data.choices?.[0]?.message || data, null, 2))
      console.log(`\n🎉 找到可用的配置！`)
      console.log(`   使用模型: ${config.model}`)
      break
    } else {
      console.log(`   ❌ 失敗: ${data.error?.message || JSON.stringify(data)}`)
    }
  } catch (error) {
    console.log(`   ❌ 錯誤: ${error.message}`)
  }
}

console.log("\n💡 提示：")
console.log("  1. 確認 API Key 從 https://dashscope.console.aliyun.com/apiKey 取得")
console.log("  2. 確認 API Key 已經開通對應模型的權限")
console.log("  3. 在控制台檢查「模型廣場」中哪些模型可用")
