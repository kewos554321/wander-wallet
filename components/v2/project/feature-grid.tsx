import Link from "next/link"
import {
  ArrowRightLeft,
  BarChart3,
  Car,
  Coins,
  Download,
  History,
  Images,
  MapPin,
  Settings,
  StickyNote,
  Users,
  type LucideIcon,
} from "lucide-react"

interface Feature {
  label: string
  path: string
  icon: LucideIcon
  tone: string
}

// Order and tones follow design/project/Trip-m0lh.dc.html.
const FEATURES: Feature[] = [
  { label: "結算", path: "settle", icon: ArrowRightLeft, tone: "bg-v2-lake-soft text-v2-lake" },
  { label: "成員", path: "members", icon: Users, tone: "bg-v2-coral-soft text-v2-coral" },
  { label: "統計", path: "stats", icon: BarChart3, tone: "bg-v2-plum-soft text-v2-plum" },
  { label: "匯出", path: "export", icon: Download, tone: "bg-v2-gold-soft text-v2-gold" },
  { label: "設定", path: "settings", icon: Settings, tone: "bg-v2-sand text-v2-ink-muted" },
  { label: "歷史", path: "activity-logs", icon: History, tone: "bg-v2-rose-soft text-v2-rose" },
  { label: "里程", path: "mileage", icon: Car, tone: "bg-v2-lake-soft text-v2-lake" },
  { label: "匯率", path: "currency", icon: Coins, tone: "bg-v2-coral-soft text-v2-coral" },
  { label: "筆記", path: "notes", icon: StickyNote, tone: "bg-v2-gold-soft text-v2-gold" },
  { label: "地圖", path: "map", icon: MapPin, tone: "bg-v2-plum-soft text-v2-plum" },
  { label: "照片", path: "photos", icon: Images, tone: "bg-v2-rose-soft text-v2-rose" },
]

const PAGE_SIZE = 8

export function FeatureGrid({ projectId }: { projectId: string }) {
  const pages = [FEATURES.slice(0, PAGE_SIZE), FEATURES.slice(PAGE_SIZE)]

  return (
    <nav aria-label="功能" className="px-4 pt-5">
      <p className="mb-3 text-sm font-medium leading-5 tracking-[.1px]">功能</p>
      <div className="rounded-[18px] border border-v2-line bg-v2-surface px-3 pb-3 pt-4">
        <div className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {pages.map((page, i) => (
            <div key={i} className="grid w-full shrink-0 snap-start grid-cols-4 gap-x-1 gap-y-3">
              {page.map(({ label, path, icon: Icon, tone }) => (
                <Link
                  key={path}
                  href={`/projects/${projectId}/${path}`}
                  className="flex flex-col items-center gap-[5px] text-center"
                >
                  <span className={`flex h-[46px] w-[46px] items-center justify-center rounded-full ${tone}`} aria-hidden="true">
                    <Icon className="h-[18px] w-[18px]" strokeWidth={1.7} />
                  </span>
                  <span className="text-xs font-medium leading-4 tracking-[.5px]">{label}</span>
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>
    </nav>
  )
}
