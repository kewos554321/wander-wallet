"use client"

import { useState, type ReactNode } from "react"
import { Pencil, Share2, UserPlus } from "lucide-react"
import { DEMO_PROJECT, DEMO_SUMMARY } from "@/app/demo/_data/fixtures"
import { V2TopBar } from "@/components/v2/layout/v2-top-bar"
import { BalanceCard } from "@/components/v2/project/balance-card"
import { JoinTripSheet } from "@/components/v2/project/join-trip-sheet"
import { TripSummaryCard } from "@/components/v2/project/trip-summary-card"
import { formatCurrency } from "@/lib/constants/currencies"
import { formatTripDateRange } from "@/lib/trip"

// Demo only: a focused preview of the P0/P1 critique fixes.
// Nothing here changes production; it mounts the real components so the
// direction can be judged against the shipped implementation.

const RATES_TIMESTAMP = new Date("2026-11-04T09:00:00+08:00").getTime()

const DEMO_JOIN_INFO = {
  name: DEMO_PROJECT.name,
  description: DEMO_PROJECT.description,
  joinMode: "both",
  unclaimedMembers: [
    { id: "ming", displayName: "阿明" },
    { id: "kai", displayName: "阿凱" },
  ],
}

function Control({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex h-11 items-center gap-1.5 rounded-v2-sm border px-3 text-[12.5px] font-bold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-lake motion-reduce:transition-none ${
        active
          ? "border-v2-lake bg-v2-lake text-v2-on-lake"
          : "border-v2-line bg-v2-surface text-v2-ink hover:bg-v2-sand"
      }`}
    >
      {children}
    </button>
  )
}

export default function P0P1FixesDemoPage() {
  const [ratesLoading, setRatesLoading] = useState(false)
  const [settled, setSettled] = useState(false)
  const [joinOpen, setJoinOpen] = useState(false)

  // The demo switch simulates a settled trip; production computes this from the
  // real member balances.
  const summary = settled
    ? {
        ...DEMO_SUMMARY,
        userBalance: 0,
        memberBalances: DEMO_SUMMARY.memberBalances.map((member) => ({ ...member, balance: 0 })),
      }
    : DEMO_SUMMARY

  return (
    <div className="mx-auto max-w-md pb-28">
      <div className="px-4 pt-6">
        <h1 className="m-0 font-v2-serif text-[22px] font-bold leading-7 text-v2-ink">旅程總覽 · P0/P1 修正提案</h1>
        <p className="m-0 mt-1.5 text-[13px] leading-relaxed text-v2-ink-muted">
          P0 匯率誠實揭露已在 5a5c4b0 上線，這裡直接沿用正式卡片；下面聚焦還沒動的 P1：
          餘額入口、加入旅程，以及金額與名詞統一。狀態都可以切換。
        </p>

        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Demo 狀態控制">
          <Control active={ratesLoading} onClick={() => setRatesLoading((v) => !v)}>
            匯率載入中
          </Control>
          <Control active={settled} onClick={() => setSettled((v) => !v)}>
            已結清
          </Control>
          <Control active={joinOpen} onClick={() => setJoinOpen(true)}>
            <UserPlus className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            加入旅程
          </Control>
        </div>
      </div>

      <div className="mt-5 border-y border-v2-line bg-v2-paper">
        <V2TopBar title="旅程總覽" backHref="/demo" backAriaLabel="回 Demo 目錄" />

        <div className="flex items-start justify-between gap-3 px-4 pt-4">
          <div className="min-w-0">
            <h2 className="m-0 font-v2-serif text-2xl font-bold leading-8">{DEMO_PROJECT.name}</h2>
            <p className="m-0 mt-1 text-xs leading-4 tracking-[.4px] text-v2-ink-muted">
              {formatTripDateRange(DEMO_PROJECT.startDate, DEMO_PROJECT.endDate)} · {DEMO_PROJECT.members.length} 位旅伴
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => setJoinOpen(true)}
              className="flex h-8 items-center gap-1.5 rounded-v2-sm border border-v2-lake-edge bg-v2-lake-soft px-2.5 text-[12px] font-semibold text-v2-lake transition-colors duration-150 hover:bg-v2-lake-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-lake motion-reduce:transition-none"
            >
              <Share2 className="h-4 w-4 shrink-0" strokeWidth={1.6} aria-hidden="true" />
              分享
            </button>
            <span className="flex h-8 items-center gap-1.5 rounded-v2-sm border border-v2-lake-edge bg-v2-lake-soft px-2.5 text-[12px] font-semibold text-v2-lake">
              <Pencil className="h-[15px] w-[15px] shrink-0" strokeWidth={1.8} aria-hidden="true" />
              修改
            </span>
          </div>
        </div>

        <p className="m-0 px-4 pt-1.5 text-[12px] leading-[17px] tracking-[.3px] text-v2-ink-muted">
          秋季賞楓與美食
        </p>

        <TripSummaryCard
          summary={DEMO_SUMMARY}
          currency={DEMO_PROJECT.currency}
          cover={DEMO_PROJECT.cover}
          ratesLoading={ratesLoading}
          ratesReady={!ratesLoading}
          ratesTimestamp={RATES_TIMESTAMP}
        />
        <BalanceCard
          balance={summary.userBalance}
          currency={DEMO_PROJECT.currency}
          projectId={DEMO_PROJECT.id}
          memberBalances={summary.memberBalances}
          currentMemberId={summary.currentMemberId}
          loading={ratesLoading && summary.hasMixedCurrencies}
        />

        <div className="px-4 pt-4">
          <p className="m-0 text-[11px] leading-5 text-v2-ink-muted">
            以下沿用現有功能格與最近支出，不在這次 P0/P1 範圍內。
          </p>
        </div>
        <div className="h-6" />
      </div>

      <section className="mt-7 px-4">
        <h2 className="m-0 font-v2-serif text-lg font-bold leading-6 text-v2-ink">這次收斂的規則</h2>
        <dl className="m-0 mt-2 divide-y divide-v2-line border-y border-v2-line">
          <div className="grid grid-cols-[76px_1fr] gap-3 py-3">
            <dt className="m-0 text-[12px] font-bold leading-5 text-v2-lake">金額</dt>
            <dd className="m-0 text-[13px] leading-5 text-v2-ink">
              一律顯示幣別代碼：{formatCurrency(1280, "TWD")}、{formatCurrency(1280, "JPY")}。
              <span className="mt-0.5 block text-v2-ink-muted">記帳表格這種窄空間不限幣種都用「$」，幣別由區塊標題標明。</span>
            </dd>
          </div>
          <div className="grid grid-cols-[76px_1fr] gap-3 py-3">
            <dt className="m-0 text-[12px] font-bold leading-5 text-v2-lake">名詞</dt>
            <dd className="m-0 text-[13px] leading-5 text-v2-ink">
              旅程、旅伴，全文一致。
              <span className="mt-0.5 block text-v2-ink-muted">不再混用「專案／成員／參與者」。</span>
            </dd>
          </div>
          <div className="grid grid-cols-[76px_1fr] gap-3 py-3">
            <dt className="m-0 text-[12px] font-bold leading-5 text-v2-lake">匯率</dt>
            <dd className="m-0 text-[13px] leading-5 text-v2-ink">
              載入完成才顯示總額、餘額與百分比；正式版已於 5a5c4b0 上線。
              <span className="mt-0.5 block text-v2-ink-muted">備援匯率會標日期，載入失敗也能重試。</span>
            </dd>
          </div>
          <div className="grid grid-cols-[76px_1fr] gap-3 py-3">
            <dt className="m-0 text-[12px] font-bold leading-5 text-v2-lake">加入旅程</dt>
            <dd className="m-0 text-[13px] leading-5 text-v2-ink">
              改用 v2 底部 sheet，沿用同一組色票與 44px 觸控目標。
              <span className="mt-0.5 block text-v2-ink-muted">不再 portal 到 body 變成 v1 的青綠彈窗。</span>
            </dd>
          </div>
        </dl>
        <p className="m-0 mt-4 text-[11px] leading-5 text-v2-ink-muted">
          此頁只讀，不會寫入資料。按左下「Demo 目錄」可回列表。
        </p>
      </section>

      {joinOpen && (
        <JoinTripSheet
          info={DEMO_JOIN_INFO}
          joining={false}
          onJoin={() => setJoinOpen(false)}
          onClaim={() => setJoinOpen(false)}
          onCancel={() => setJoinOpen(false)}
        />
      )}
    </div>
  )
}
