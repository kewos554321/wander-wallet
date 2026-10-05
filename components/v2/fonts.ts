import { Noto_Sans_TC, Noto_Serif_TC } from "next/font/google"

// CJK fonts are large; preload is off and glyphs load by unicode-range.
export const notoSerifTC = Noto_Serif_TC({
  weight: ["500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-noto-serif-tc",
  display: "swap",
  preload: false,
})

export const notoSansTC = Noto_Sans_TC({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-noto-sans-tc",
  display: "swap",
  preload: false,
})
