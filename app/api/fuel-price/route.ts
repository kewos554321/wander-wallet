import { NextResponse } from "next/server"

interface FuelPrice {
  product: string
  price: number
  unit: string
}

// 取得中油今日油價
export async function GET() {
  try {
    const response = await fetch(
      "https://vipmbr.cpc.com.tw/cpcstn/listpricewebservice.asmx/getCPCMainProdListPrice_XML",
      { next: { revalidate: 3600 } } // 快取 1 小時
    )

    if (!response.ok) {
      throw new Error("無法取得油價資料")
    }

    const xml = await response.text()

    // 解析 XML 取得油價
    const prices: FuelPrice[] = []

    // 使用正則表達式解析 XML
    const productRegex = /<產品名稱>([^<]+)<\/產品名稱>/g
    const priceRegex = /<參考牌價_金額>([^<]+)<\/參考牌價_金額>/g

    const products: string[] = []
    const priceValues: string[] = []

    let match
    while ((match = productRegex.exec(xml)) !== null) {
      products.push(match[1])
    }
    while ((match = priceRegex.exec(xml)) !== null) {
      priceValues.push(match[1])
    }

    // 只取汽油價格
    const fuelTypes = ["92無鉛汽油", "95無鉛汽油", "98無鉛汽油"]

    for (let i = 0; i < products.length; i++) {
      if (fuelTypes.includes(products[i])) {
        prices.push({
          product: products[i],
          price: parseFloat(priceValues[i]),
          unit: "元/公升",
        })
      }
    }

    // 按照 92, 95, 98 排序
    prices.sort((a, b) => {
      const order = ["92無鉛汽油", "95無鉛汽油", "98無鉛汽油"]
      return order.indexOf(a.product) - order.indexOf(b.product)
    })

    return NextResponse.json({
      prices,
      updatedAt: new Date().toISOString(),
      source: "中油",
    })
  } catch (error) {
    console.error("取得油價錯誤:", error)
    // 返回預設值
    return NextResponse.json({
      prices: [
        { product: "92無鉛汽油", price: 26.8, unit: "元/公升" },
        { product: "95無鉛汽油", price: 28.3, unit: "元/公升" },
        { product: "98無鉛汽油", price: 30.3, unit: "元/公升" },
      ],
      updatedAt: null,
      source: "預設值",
      error: "無法取得即時油價",
    })
  }
}
