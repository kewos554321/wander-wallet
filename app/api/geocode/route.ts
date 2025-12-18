import { NextRequest, NextResponse } from "next/server"

const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org"

// 搜尋地點（正向地理編碼）
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const query = searchParams.get("q")
    const lat = searchParams.get("lat")
    const lon = searchParams.get("lon")

    // 反向地理編碼：座標 → 地址
    if (lat && lon) {
      const response = await fetch(
        `${NOMINATIM_BASE_URL}/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
        {
          headers: {
            "User-Agent": "WanderWallet/1.0",
            "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8",
          },
        }
      )

      if (!response.ok) {
        return NextResponse.json(
          { error: "無法取得地址" },
          { status: response.status }
        )
      }

      const data = await response.json()

      if (data.error) {
        return NextResponse.json(
          { error: data.error },
          { status: 404 }
        )
      }

      return NextResponse.json({
        displayName: data.display_name,
        address: data.address,
        lat: parseFloat(data.lat),
        lon: parseFloat(data.lon),
      })
    }

    // 正向地理編碼：搜尋關鍵字 → 地點列表
    if (query) {
      const response = await fetch(
        `${NOMINATIM_BASE_URL}/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
        {
          headers: {
            "User-Agent": "WanderWallet/1.0",
            "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8",
          },
        }
      )

      if (!response.ok) {
        return NextResponse.json(
          { error: "搜尋失敗" },
          { status: response.status }
        )
      }

      const data = await response.json()

      const results = data.map((item: {
        display_name: string
        lat: string
        lon: string
        address?: Record<string, string>
        type?: string
        class?: string
      }) => ({
        displayName: item.display_name,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
        address: item.address,
        type: item.type,
        class: item.class,
      }))

      return NextResponse.json(results)
    }

    return NextResponse.json(
      { error: "請提供搜尋關鍵字或座標" },
      { status: 400 }
    )
  } catch (error) {
    console.error("地理編碼錯誤:", error)
    return NextResponse.json(
      { error: "地理編碼服務暫時無法使用" },
      { status: 500 }
    )
  }
}
