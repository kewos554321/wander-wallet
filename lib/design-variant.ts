/**
 * Theme v2 rollout flag
 * 設定環境變數 NEXT_PUBLIC_THEME_V2=true 才會出現切換開關；
 * 關閉時一律強制 legacy，即使使用者裝置上留有舊的 localStorage 選擇。
 */

export const THEME_V2_FLAG_ENABLED = process.env.NEXT_PUBLIC_THEME_V2 === "true"

export type DesignVariant = "legacy" | "v2"

export const DESIGN_VARIANT_STORAGE_KEY = "design-variant"
