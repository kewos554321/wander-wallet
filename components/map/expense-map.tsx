"use client"

import { useEffect, useRef } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { formatCurrency } from "@/lib/constants/currencies"
import { CATEGORY_COLORS, CATEGORY_LABELS, type ExpenseCategory } from "@/lib/constants/expenses"

interface ExpenseLocation {
  id: string
  amount: number
  currency: string
  description: string | null
  category: string | null
  location: string | null
  latitude: number
  longitude: number
  expenseDate: string
  payer: {
    displayName: string
  }
}

// 地圖風格類型
export type MapStyle = "standard" | "watercolor" | "voyager" | "toner"

// 地圖風格設定（全部使用免費無需 API key 的圖磚服務）
export const MAP_STYLES: Record<MapStyle, { name: string; emoji: string; url: string; labelUrl?: string }> = {
  standard: {
    name: "標準",
    emoji: "🗺️",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  },
  watercolor: {
    name: "衛星圖",
    emoji: "🛰️",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  },
  voyager: {
    name: "繽紛風",
    emoji: "🌈",
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
  },
  toner: {
    name: "極簡風",
    emoji: "✏️",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
  },
}

interface ExpenseMapProps {
  expenses: ExpenseLocation[]
  projectCurrency: string
  mapStyle?: MapStyle
  onExpenseClick?: (expenseId: string) => void
}

// 分類 emoji 圖示
const categoryEmojis: Record<string, string> = {
  food: "🍽️",
  transport: "🚗",
  accommodation: "🏨",
  ticket: "🎫",
  shopping: "🛍️",
  entertainment: "🎮",
  gift: "🎁",
  other: "📍",
}

export function ExpenseMap({ expenses, mapStyle = "standard", onExpenseClick }: ExpenseMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const tileLayerRef = useRef<L.TileLayer | null>(null)
  const labelLayerRef = useRef<L.TileLayer | null>(null)
  const onExpenseClickRef = useRef(onExpenseClick)

  // Keep the latest handler without making it an effect dependency: a new
  // function identity on every render must not tear down and rebuild the map.
  useEffect(() => {
    onExpenseClickRef.current = onExpenseClick
  }, [onExpenseClick])

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    // 找出有座標的消費
    const validExpenses = expenses.filter(e => e.latitude && e.longitude)

    // 計算中心點
    let center: [number, number] = [25.033, 121.565] // 預設台北
    if (validExpenses.length > 0) {
      const avgLat = validExpenses.reduce((sum, e) => sum + Number(e.latitude), 0) / validExpenses.length
      const avgLng = validExpenses.reduce((sum, e) => sum + Number(e.longitude), 0) / validExpenses.length
      if (Number.isFinite(avgLat) && Number.isFinite(avgLng)) {
        center = [avgLat, avgLng]
      }
    }

    // 初始化地圖
    // 關閉縮放動畫：Leaflet 的 zoom 動畫會在 250ms 後才觸發 transition 結束回呼，
    // 若地圖在這段期間被移除（React StrictMode 重掛載、切換篩選／樣式），
    // 回呼會讀取已被刪除的 mapPane._leaflet_pos 而拋出錯誤。
    const map = L.map(mapRef.current, { zoomAnimation: false }).setView(center, 13)
    mapInstanceRef.current = map

    // 加入地圖圖層
    const styleConfig = MAP_STYLES[mapStyle]
    tileLayerRef.current = L.tileLayer(styleConfig.url, {
      attribution: '&copy; <a href="https://openstreetmap.org/">OSM</a> &copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://opentopomap.org/">OpenTopoMap</a>',
      maxZoom: 18,
    }).addTo(map)

    // 加入標籤圖層（如果有）
    if (styleConfig.labelUrl) {
      labelLayerRef.current = L.tileLayer(styleConfig.labelUrl, {
        attribution: '',
        maxZoom: 18,
      }).addTo(map)
    }

    // 添加消費標記
    const markers: L.Marker[] = []
    validExpenses.forEach((expense) => {
      const category = (expense.category || "other") as ExpenseCategory
      const emoji = categoryEmojis[category] || categoryEmojis.other
      const color = CATEGORY_COLORS[category] || CATEGORY_COLORS.other
      const categoryName = CATEGORY_LABELS[category] || "其他"

      // 可愛卡通風格標記
      const customIcon = L.divIcon({
        className: "custom-marker",
        html: `
          <div style="
            position: relative;
            animation: bounce 0.5s ease-out;
          ">
            <div style="
              background: linear-gradient(135deg, ${color} 0%, ${color}dd 100%);
              width: 44px;
              height: 44px;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 4px 12px ${color}66, 0 2px 4px rgba(0,0,0,0.2);
              border: 3px solid white;
            ">
              <span style="
                transform: rotate(45deg);
                font-size: 20px;
                filter: drop-shadow(0 1px 1px rgba(0,0,0,0.2));
              ">${emoji}</span>
            </div>
            <div style="
              position: absolute;
              bottom: -4px;
              left: 50%;
              transform: translateX(-50%);
              width: 12px;
              height: 6px;
              background: rgba(0,0,0,0.15);
              border-radius: 50%;
              filter: blur(2px);
            "></div>
          </div>
          <style>
            @keyframes bounce {
              0% { transform: translateY(-20px); opacity: 0; }
              50% { transform: translateY(5px); }
              100% { transform: translateY(0); opacity: 1; }
            }
          </style>
        `,
        iconSize: [44, 52],
        iconAnchor: [22, 52],
        popupAnchor: [0, -48],
      })

      const marker = L.marker([Number(expense.latitude), Number(expense.longitude)], { icon: customIcon })
        .addTo(map)
        .bindPopup(`
          <div style="
            min-width: 200px;
            font-family: system-ui, sans-serif;
            padding: 4px;
          ">
            <div style="
              display: flex;
              align-items: center;
              gap: 8px;
              margin-bottom: 10px;
            ">
              <span style="font-size: 28px;">${emoji}</span>
              <div>
                <div style="font-weight: 700; font-size: 18px; color: ${color};">
                  ${formatCurrency(expense.amount, expense.currency)}
                </div>
                <div style="font-size: 12px; color: #94a3b8;">
                  ${categoryName}
                </div>
              </div>
            </div>
            <div style="
              background: #f8fafc;
              border-radius: 8px;
              padding: 10px;
              margin-bottom: 8px;
            ">
              <div style="font-weight: 500; font-size: 14px; color: #334155; margin-bottom: 4px;">
                ${expense.description || "無描述"}
              </div>
              <div style="font-size: 12px; color: #94a3b8; display: flex; align-items: center; gap: 4px;">
                👤 ${expense.payer.displayName}
                <span style="color: #cbd5e1;">•</span>
                📅 ${new Date(expense.expenseDate).toLocaleDateString("zh-TW")}
              </div>
            </div>
            ${expense.location ? `
              <div style="
                font-size: 11px;
                color: #64748b;
                display: flex;
                align-items: flex-start;
                gap: 4px;
                line-height: 1.4;
              ">
                <span>📍</span>
                <span style="word-break: break-all;">${expense.location}</span>
              </div>
            ` : ""}
          </div>
        `, {
          className: 'cute-popup',
          closeButton: true,
          maxWidth: 280,
        })

      if (onExpenseClickRef.current) {
        marker.on("click", () => {
          onExpenseClickRef.current?.(expense.id)
        })
      }

      markers.push(marker)
    })

    // 自動調整視野以包含所有標記（不使用動畫，避免移除地圖時留下未取消的動畫回呼）
    if (markers.length > 1) {
      const group = L.featureGroup(markers)
      map.fitBounds(group.getBounds().pad(0.1), { animate: false })
    }

    return () => {
      map.remove()
      mapInstanceRef.current = null
    }
  }, [expenses, mapStyle])

  return (
    <div
      ref={mapRef}
      className="w-full h-full rounded-xl overflow-hidden"
      style={{ minHeight: "400px" }}
    />
  )
}
