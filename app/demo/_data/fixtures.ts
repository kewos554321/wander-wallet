// Shared fake data for the /demo area. One coherent "東京之旅" trip so every
// demo screen shows consistent names, amounts and dates. Types are aligned to
// the real view props; the compiler keeps them honest.

import { DEFAULT_ICON_COVER } from "@/lib/covers"
import type { ProjectListItem, ProjectListMember } from "@/lib/hooks/useProjects"
import type { ProjectExpense, ExpenseMember } from "@/lib/hooks/useProjectExpenses"
import type { OverviewProject, OverviewMember, OverviewExpense, ProjectSummary } from "@/lib/project-overview"
import type { SettleData, SettleExpenseDetail } from "@/lib/hooks/useSettlement"
import type { RecentRate } from "@/lib/recent-rates"
import type { ProjectFormValues } from "@/lib/hooks/use-project-form"
import type { DraftMember } from "@/components/v2/expense-form/use-expense-draft"
import type { ExpenseItemResult } from "@/lib/ai/expense-parser"
import { parsedToQuickItems, type QuickItem } from "@/lib/quick-expense/draft"
import type { MapExpense } from "@/components/v2/map/map-v2-view"

export const DEMO_PROJECT_ID = "tokyo"
export const DEMO_CURRENCY = "TWD"
export const DEMO_CURRENT_MEMBER_ID = "me"
export const DEMO_TRIP_NAME = "東京之旅"
export const DEMO_LIVE_RATE = 0.215

type MemberId = "me" | "ming" | "kai" | "ting"
const IDS: MemberId[] = ["me", "ming", "kai", "ting"]
const NAME: Record<MemberId, string> = { me: "我", ming: "阿明", kai: "阿凱", ting: "小婷" }

export const DEMO_USER: { name: string; image: string | null } = { name: "我", image: null }

export const DEMO_MEMBERS: DraftMember[] = IDS.map((id) => ({ id, displayName: NAME[id], image: null }))

function expenseMember(id: MemberId): ExpenseMember {
  return {
    id,
    displayName: NAME[id],
    userId: id === "me" ? "u-me" : null,
    user: id === "me" ? { id: "u-me", name: "我", email: "me@demo", image: null } : null,
  }
}

interface ExpenseSeed {
  id: string
  amount: number
  currency: string
  description: string
  category: string
  date: string
  payer: MemberId
}

const EXPENSE_SEEDS: ExpenseSeed[] = [
  { id: "e1", amount: 1280, currency: "JPY", description: "晚餐 · 拉麵", category: "food", date: "2026-10-08", payer: "me" },
  { id: "e2", amount: 800, currency: "JPY", description: "地鐵一日券", category: "transport", date: "2026-10-08", payer: "ming" },
  { id: "e3", amount: 8600, currency: "TWD", description: "飯店 2 晚", category: "accommodation", date: "2026-10-08", payer: "me" },
  { id: "e4", amount: 3200, currency: "JPY", description: "藥妝採買", category: "shopping", date: "2026-10-09", payer: "ting" },
  { id: "e5", amount: 1450, currency: "JPY", description: "拉麵午餐", category: "food", date: "2026-10-09", payer: "kai" },
  { id: "e6", amount: 2100, currency: "JPY", description: "晴空塔門票", category: "ticket", date: "2026-10-09", payer: "me" },
  { id: "e7", amount: 8.5, currency: "USD", description: "咖啡", category: "food", date: "2026-10-09", payer: "ming" },
  { id: "e8", amount: 2600, currency: "JPY", description: "計程車", category: "transport", date: "2026-10-10", payer: "ting" },
  { id: "e9", amount: 5400, currency: "TWD", description: "和牛燒肉", category: "food", date: "2026-10-10", payer: "me" },
  { id: "e10", amount: 4800, currency: "JPY", description: "伴手禮", category: "gift", date: "2026-10-10", payer: "kai" },
  { id: "e11", amount: 1600, currency: "JPY", description: "博物館門票", category: "ticket", date: "2026-10-11", payer: "ming" },
  { id: "e12", amount: 950, currency: "JPY", description: "便利商店", category: "food", date: "2026-10-11", payer: "me" },
]

function buildExpense(seed: ExpenseSeed): ProjectExpense {
  const share = seed.amount / IDS.length
  return {
    id: seed.id,
    amount: seed.amount,
    currency: seed.currency,
    description: seed.description,
    category: seed.category,
    image: null,
    location: null,
    latitude: null,
    longitude: null,
    expenseDate: seed.date,
    createdAt: `${seed.date}T12:00:00.000Z`,
    payers: [{ id: `${seed.id}-p`, memberId: seed.payer, amount: seed.amount, member: expenseMember(seed.payer) }],
    participants: IDS.map((id, i) => ({ id: `${seed.id}-s${i}`, shareAmount: share, member: expenseMember(id) })),
  }
}

export const DEMO_EXPENSES: ProjectExpense[] = EXPENSE_SEEDS.map(buildExpense)

// The map demo needs the same trip with real coordinates. 10 of the 12
// expenses get a Tokyo location; the other two stay location-less so the
// "還有 N 筆消費沒有位置資訊" footer is visible too.
const MAP_LOCATIONS: Record<string, { location: string; latitude: number; longitude: number }> = {
  e1: { location: "新宿 · 思い出横丁", latitude: 35.6938, longitude: 139.7034 },
  e2: { location: "東京車站", latitude: 35.6812, longitude: 139.7671 },
  e3: { location: "淺草 · 雷門", latitude: 35.7148, longitude: 139.7967 },
  e4: { location: "澀谷 · 藥妝店", latitude: 35.6595, longitude: 139.7005 },
  e5: { location: "池袋 · 拉麵街", latitude: 35.7295, longitude: 139.7109 },
  e6: { location: "晴空塔", latitude: 35.7101, longitude: 139.8107 },
  e7: { location: "表參道 · 咖啡", latitude: 35.6652, longitude: 139.7124 },
  e8: { location: "六本木", latitude: 35.6627, longitude: 139.7316 },
  e9: { location: "銀座 · 燒肉店", latitude: 35.6717, longitude: 139.7649 },
  e10: { location: "上野 · 伴手禮街", latitude: 35.7138, longitude: 139.7773 },
}

export const DEMO_MAP_EXPENSES: MapExpense[] = DEMO_EXPENSES.map((expense) => {
  const spot = MAP_LOCATIONS[expense.id]
  return {
    id: expense.id,
    amount: expense.amount,
    currency: expense.currency,
    description: expense.description,
    category: expense.category,
    location: spot?.location ?? null,
    latitude: spot?.latitude ?? null,
    longitude: spot?.longitude ?? null,
    expenseDate: expense.expenseDate,
    payers: expense.payers.map((p) => ({
      memberId: p.memberId,
      amount: p.amount,
      member: { displayName: p.member.displayName },
    })),
  }
})


// Fixed on purpose: the demo does not run cross-currency conversion (see the
// plan's Review Focus 5), so this total is illustrative, not a sum of the list.
export const DEMO_EXPENSE_SUMMARY = { total: 48600, count: 12, average: 4050 }

export const DEMO_RECENT_RATES: RecentRate[] = [
  { rate: 0.215, kind: "market", date: "2026-10-08", description: "晚餐 · 拉麵" },
  { rate: 0.22, kind: "custom", date: null, description: "藥妝採買" },
  { rate: 0.2135, kind: "market", date: "2026-10-05", description: "計程車" },
]

const DEMO_SETTLE_EXPENSES: SettleExpenseDetail[] = [
  {
    id: "se1",
    description: "晚餐 · 拉麵",
    amount: 12800,
    currency: "JPY",
    convertedAmount: 2752,
    payers: [{ memberId: "me", displayName: "我", userImage: null, amount: 12800, convertedAmount: 2752 }],
    participants: IDS.map((id) => ({
      memberId: id,
      displayName: NAME[id],
      userImage: null,
      shareAmount: 3200,
      convertedShareAmount: 688,
      personalItems: [],
      sharedAmount: 688,
    })),
  },
  {
    id: "se2",
    description: "飯店 2 晚",
    amount: 8600,
    currency: "TWD",
    convertedAmount: 8600,
    payers: [
      { memberId: "me", displayName: "我", userImage: null, amount: 5000, convertedAmount: 5000 },
      { memberId: "ming", displayName: "阿明", userImage: null, amount: 3600, convertedAmount: 3600 },
    ],
    participants: [
      {
        memberId: "me",
        displayName: "我",
        userImage: null,
        shareAmount: 3650,
        convertedShareAmount: 3650,
        personalItems: [
          { name: "溫泉", amount: 1500, convertedAmount: 1500 },
          { name: "按摩", amount: 500, convertedAmount: 500 },
        ],
        sharedAmount: 1650,
      },
      ...(["ming", "kai", "ting"] as MemberId[]).map((id) => ({
        memberId: id,
        displayName: NAME[id],
        userImage: null,
        shareAmount: 1650,
        convertedShareAmount: 1650,
        personalItems: [],
        sharedAmount: 1650,
      })),
    ],
  },
  {
    id: "se3",
    description: "藥妝採買",
    amount: 3200,
    currency: "TWD",
    convertedAmount: 3200,
    payers: [{ memberId: "ting", displayName: "小婷", userImage: null, amount: 3200, convertedAmount: 3200 }],
    participants: [
      {
        memberId: "me",
        displayName: "我",
        userImage: null,
        shareAmount: 1200,
        convertedShareAmount: 1200,
        personalItems: [
          { name: "面膜", amount: 800, convertedAmount: 800 },
          { name: "藥品", amount: 400, convertedAmount: 400 },
        ],
        sharedAmount: 0,
      },
      {
        memberId: "ting",
        displayName: "小婷",
        userImage: null,
        shareAmount: 1300,
        convertedShareAmount: 1300,
        personalItems: [{ name: "保養品", amount: 600, convertedAmount: 600 }],
        sharedAmount: 700,
      },
      {
        memberId: "ming",
        displayName: "阿明",
        userImage: null,
        shareAmount: 700,
        convertedShareAmount: 700,
        personalItems: [],
        sharedAmount: 700,
      },
    ],
  },
  {
    id: "se4",
    description: "計程車",
    amount: 2600,
    currency: "TWD",
    convertedAmount: 2600,
    payers: [{ memberId: "ting", displayName: "小婷", userImage: null, amount: 2600, convertedAmount: 2600 }],
    participants: [
      { memberId: "me", displayName: "我", userImage: null, shareAmount: 1000, convertedShareAmount: 1000, personalItems: [], sharedAmount: 0, customAmount: 1000 },
      { memberId: "ming", displayName: "阿明", userImage: null, shareAmount: 800, convertedShareAmount: 800, personalItems: [], sharedAmount: 0, customAmount: 800 },
      { memberId: "ting", displayName: "小婷", userImage: null, shareAmount: 500, convertedShareAmount: 500, personalItems: [], sharedAmount: 0, customAmount: 500 },
      { memberId: "kai", displayName: "阿凱", userImage: null, shareAmount: 300, convertedShareAmount: 300, personalItems: [], sharedAmount: 0, customAmount: 300 },
    ],
  },
  {
    id: "se5",
    description: "咖啡",
    amount: 8.5,
    currency: "USD",
    convertedAmount: 264,
    payers: [{ memberId: "ming", displayName: "阿明", userImage: null, amount: 8.5, convertedAmount: 264 }],
    participants: IDS.map((id) => ({
      memberId: id,
      displayName: NAME[id],
      userImage: null,
      shareAmount: 2.125,
      convertedShareAmount: 66,
      personalItems: [],
      sharedAmount: 66,
    })),
  },
  {
    id: "se6",
    description: "阿明的私人溫泉",
    amount: 900,
    currency: "TWD",
    convertedAmount: 900,
    payers: [{ memberId: "ming", displayName: "阿明", userImage: null, amount: 900, convertedAmount: 900 }],
    participants: [
      {
        memberId: "ming",
        displayName: "阿明",
        userImage: null,
        shareAmount: 900,
        convertedShareAmount: 900,
        personalItems: [],
        sharedAmount: 900,
      },
    ],
  },
]

export const DEMO_SETTLE: SettleData = {
  balances: [
    { memberId: "me", displayName: "我", userImage: null, balance: 3370, totalPaid: 15520, totalShare: 12150 },
    { memberId: "ming", displayName: "阿明", userImage: null, balance: -1200, totalPaid: 10950, totalShare: 12150 },
    { memberId: "kai", displayName: "阿凱", userImage: null, balance: -900, totalPaid: 11250, totalShare: 12150 },
    { memberId: "ting", displayName: "小婷", userImage: null, balance: -1270, totalPaid: 10880, totalShare: 12150 },
  ],
  settlements: [
    { from: { memberId: "ting", displayName: "小婷", userImage: null }, to: { memberId: "me", displayName: "我", userImage: null }, amount: 1270 },
    { from: { memberId: "ming", displayName: "阿明", userImage: null }, to: { memberId: "me", displayName: "我", userImage: null }, amount: 1200 },
    { from: { memberId: "kai", displayName: "阿凱", userImage: null }, to: { memberId: "me", displayName: "我", userImage: null }, amount: 900 },
  ],
  expenseDetails: DEMO_SETTLE_EXPENSES,
  summary: {
    totalExpenses: 12,
    totalAmount: 48600,
    totalShared: 48600,
    isBalanced: true,
    currency: "TWD",
    exchangeRatesUsed: { JPY: 0.215 },
  },
}

// Same trip plus a deliberately wide row so the demo can be used to tune the
// balance table's own horizontal scrolling.
export const DEMO_SETTLE_CALC: SettleData = {
  ...DEMO_SETTLE,
  balances: [
    ...DEMO_SETTLE.balances,
    { memberId: "long", displayName: "長金額測試", userImage: null, balance: 0, totalPaid: 123456789, totalShare: 123456789 },
  ],
}

// Three creditors; 阿凱 has not shared an account, so the payout page can demo
// the "尚未提供" state alongside the link in the share text.
const overviewMembers: OverviewMember[] = IDS.map((id) => ({
  id,
  role: id === "me" ? "creator" : "member",
  displayName: NAME[id],
  user: id === "me" ? { id: "u-me", name: "我", email: "me@demo", image: null } : null,
}))

const overviewExpenses: OverviewExpense[] = DEMO_EXPENSES.map((e) => ({
  id: e.id,
  amount: e.amount,
  currency: e.currency,
  description: e.description,
  category: e.category,
  createdAt: e.createdAt,
  expenseDate: e.expenseDate,
  payers: e.payers.map((p) => ({ memberId: p.memberId, amount: p.amount })),
  participants: e.participants.map((p) => ({ id: p.id, memberId: p.member.id, shareAmount: p.shareAmount })),
}))

export const DEMO_PROJECT: OverviewProject = {
  id: DEMO_PROJECT_ID,
  name: DEMO_TRIP_NAME,
  description: "秋季賞楓與美食",
  cover: DEFAULT_ICON_COVER,
  budget: "60000",
  currency: DEMO_CURRENCY,
  exchangeRatePrecision: 2,
  startDate: "2026-10-08",
  endDate: "2026-10-12",
  creator: { id: "u-me", name: "我", email: "me@demo" },
  members: overviewMembers,
  expenses: overviewExpenses,
}

export const DEMO_SUMMARY: ProjectSummary = {
  totalAmount: 48600,
  perPerson: 12150,
  budget: 60000,
  budgetProgress: 81,
  budgetRemaining: 11400,
  userBalance: 3370,
  hasMixedCurrencies: true,
  currentMemberId: "me",
  memberBalances: DEMO_SETTLE.balances.map((b) => ({
    memberId: b.memberId,
    displayName: b.displayName,
    balance: b.balance,
  })),
}

function listMember(id: MemberId): ProjectListMember {
  return {
    id,
    displayName: NAME[id],
    user: id === "me" ? { id: "u-me", name: "我", email: "me@demo", image: null } : null,
    role: id === "me" ? "creator" : "member",
  }
}

export const DEMO_PROJECT_CARDS: ProjectListItem[] = [
  {
    id: "tokyo",
    name: DEMO_TRIP_NAME,
    description: "秋季賞楓與美食",
    cover: DEFAULT_ICON_COVER,
    startDate: "2026-10-08",
    endDate: "2026-10-12",
    currency: DEMO_CURRENCY,
    createdAt: "2026-10-01T12:00:00.000Z",
    updatedAt: "2026-10-08T12:00:00.000Z",
    creator: { id: "u-me", name: "我", email: "me@demo" },
    members: IDS.map(listMember),
    totalAmount: 48600,
    _count: { expenses: 12, members: 4 },
  },
  {
    id: "osaka",
    name: "大阪美食行",
    description: null,
    cover: DEFAULT_ICON_COVER,
    startDate: "2026-08-01",
    endDate: "2026-08-03",
    currency: DEMO_CURRENCY,
    createdAt: "2026-07-20T12:00:00.000Z",
    updatedAt: "2026-08-03T12:00:00.000Z",
    creator: { id: "u-me", name: "我", email: "me@demo" },
    members: [listMember("me"), listMember("ting")],
    totalAmount: 32000,
    _count: { expenses: 8, members: 2 },
  },
  {
    id: "chiangmai",
    name: "清邁數位遊牧",
    description: null,
    cover: DEFAULT_ICON_COVER,
    startDate: null,
    endDate: null,
    currency: DEMO_CURRENCY,
    createdAt: "2026-09-15T12:00:00.000Z",
    updatedAt: "2026-09-15T12:00:00.000Z",
    creator: { id: "u-me", name: "我", email: "me@demo" },
    members: [listMember("me")],
    totalAmount: 2300,
    _count: { expenses: 2, members: 1 },
  },
]

export const DEMO_FORM_VALUES: ProjectFormValues = {
  name: DEMO_TRIP_NAME,
  description: "秋季賞楓與美食",
  cover: DEFAULT_ICON_COVER,
  startDate: "2026-10-08",
  endDate: "2026-10-12",
  currency: DEMO_CURRENCY,
  budget: "60000",
  joinMode: "both",
}

export const DEMO_EXPORT_COUNTS = { memberCount: 4, expenseCount: 12, filteredCount: 12 }

const DEMO_PARSED_ITEMS: ExpenseItemResult[] = [
  {
    id: "q1",
    amount: 1280,
    description: "晚餐 拉麵",
    category: "food",
    currency: "JPY",
    payers: [{ memberId: "me", amount: 1280 }],
    participantIds: ["me", "ming", "kai", "ting"],
    selected: true,
  },
]

export const DEMO_QUICK_ITEMS: QuickItem[] = parsedToQuickItems(DEMO_PARSED_ITEMS, new Date(2026, 9, 8))
