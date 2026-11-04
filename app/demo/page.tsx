import Link from "next/link"

// Design-preview index. Not part of the product — a plain list of the v2
// screens so the current UI/UX can be opened and compared screen by screen.

const GROUPS: { title: string; note: string; items: { href: string; label: string; desc: string }[] }[] = [
  {
    title: "支出",
    note: "記錄與瀏覽這趟旅程的花費",
    items: [
      { href: "/demo/expenses", label: "支出列表", desc: "全部支出、分類/成員/日期篩選" },
      { href: "/demo/add-expense", label: "新增支出", desc: "金額、付款人、分攤；外幣開匯率面板" },
      { href: "/demo/quick-expense", label: "快速記帳", desc: "一句話或收據 → AI 解析 → 確認" },
      { href: "/demo/rate-sheet", label: "匯率面板", desc: "市場／自訂兩種來源" },
    ],
  },
  {
    title: "專案",
    note: "旅程本身的建立與檢視",
    items: [
      { href: "/demo/projects", label: "專案列表", desc: "所有旅程卡片", },
      { href: "/demo/new-project", label: "新專案", desc: "封面、名稱、日期、幣別、預算" },
      { href: "/demo/overview", label: "專案總覽", desc: "摘要、餘額、最近支出、快速操作" },
      { href: "/demo/overview-overbudget", label: "專案總覽（超預算）", desc: "118% 預算、橘色溢出段與超出金額" },
      { href: "/demo/project-settings", label: "專案設定", desc: "改名、日期、幣別、刪除" },
    ],
  },
  {
    title: "結算",
    note: "誰該付誰多少",
    items: [{ href: "/demo/settle", label: "結算", desc: "每人餘額、分帳清單、匯率摘要" }],
  },
  {
    title: "個人",
    note: "帳號與資料輸出",
    items: [
      { href: "/demo/profile", label: "個人設定", desc: "名稱、頭像、登出" },
      { href: "/demo/export", label: "匯出", desc: "選格式/內容/篩選後匯出" },
      { href: "/demo/login", label: "登入", desc: "LINE 登入畫面" },
    ],
  },
]

export default function DemoIndexPage() {
  return (
    <div className="mx-auto max-w-md px-5 pb-16 pt-8">
      <h1 className="m-0 font-v2-serif text-[22px] font-bold text-v2-ink">Wander Wallet · V2 畫面 Demo</h1>
      <p className="m-0 mt-1.5 text-[13px] leading-relaxed text-v2-ink-muted">
        現況 baseline：用真實 v2 元件 + 一組共用假資料呈現目前畫面。免登入、不會寫入資料。
      </p>

      {GROUPS.map((group) => (
        <section key={group.title} className="mt-7">
          <h2 className="m-0 text-[13px] font-bold text-v2-lake">{group.title}</h2>
          <p className="m-0 mt-0.5 text-[11.5px] text-v2-ink-subtle">{group.note}</p>
          <ul className="m-0 mt-2.5 list-none space-y-2 p-0">
            {group.items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block rounded-[14px] border border-v2-line bg-v2-surface px-4 py-3 no-underline"
                >
                  <span className="block text-[14px] font-bold text-v2-ink">{item.label}</span>
                  <span className="mt-0.5 block text-[12px] text-v2-ink-muted">{item.desc}</span>
                  <span className="mt-1 block tabular-nums text-[11px] text-v2-ink-subtle">{item.href}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
