# New screens inventory — design v20261004

Design source: `design/project-v20261004/*.dc.html` (titles from `canvas.json`).
Scope decision: these screens have **no v2 implementation** and are **out of scope for the current milestone** — this document only inventories them.

Hard rules for any future work (unchanged):
- Do NOT edit `components/v1/**`, `components/ui/**`, `app/api/**`, `prisma/**`, `lib/**`.
- New v2 code lives in `components/v2/**` and is **token-only** (no hex / `bg-white` / `text-white` / `dark:` classes — enforced by `tests/components/v2/no-hardcoded-colors.test.ts`).
- Route pages switch with `components/ui-version/ui-version-switch.tsx` (`v1={…} v2={…}`), matching `app/projects/[id]/expenses/page.tsx`.

Legend
- **v2 exists?** = is there already a `components/v2/**` view/route for this board?
- **Size**: S (≤1 view), M (view + shared primitive), L (view + filters/third-party integration).
- "Data" always means read-only against `app/api/**`; no screen here needs a new API.

## Summary table

| Board | Title | v1 route | v1 components | v2 exists? | Data / API backing it | Data ready? | UI-first? | Size |
|---|---|---|---|---|---|---|---|---|
| A15 | 匯率 — After | `app/projects/[id]/currency/page.tsx` | `components/layout/app-layout`, `components/ui/*`, `lib/constants/currencies` | No | `GET /api/exchange-rates` (`?date=`, `?from&to&amount`); `customRates`/`exchangeRatePrecision` from `GET /api/projects/[id]` | Yes | Yes | M |
| A16 | 消費地圖 — After | `app/projects/[id]/map/page.tsx` | `components/map/expense-map` (Leaflet), `components/ui/*`, `lib/constants/expenses` | No | `GET /api/projects/[id]/expenses` (lat/lng/location/category/amount/payer); `GET /api/projects/[id]` | Yes | Partial (Leaflet re-skin) | L |
| A17 | 里程 — After | `app/projects/[id]/mileage/page.tsx` | `components/layout/app-layout`, `components/ui/*` | No | `GET /api/fuel-price` (fallback data); `GET`/`PUT /api/projects/[id]/mileage` | Yes | Yes | M |
| A22 | 歷史紀錄 — After | `app/projects/[id]/activity-logs/page.tsx` | `components/ui/{search-input,filter-dropdown,popover,calendar}` | No | `GET /api/projects/[id]/activity-logs?limit&offset` | Yes | Yes | L |
| A23 | 匯出 — After | `app/projects/[id]/export/page.tsx` | `components/export/export-options-form`, `lib/export/*` | No | `GET /api/projects/[id]`; `GET /api/exchange-rates`; pure `lib/export/{csv-generator,pdf-generator}` | Yes | Yes | M |
| A24 | 筆記 — After | `app/projects/[id]/notes/page.tsx` | `components/layout/app-layout`, `components/ui/textarea` | No | `GET`/`PUT /api/projects/[id]/memo` | Yes | Yes | S |
| A25 | 照片相簿 — After | `app/projects/[id]/photos/page.tsx` | `next/image`, `components/layout/app-layout` | No | `GET /api/projects/[id]/expenses` (`image`); `GET /api/projects/[id]` | Yes | Yes | S |
| A18 | 登入 — After | global `components/auth/auth-gate.tsx` (not a route); `POST /api/auth/liff` | `components/auth/{auth-gate,liff-provider}` | No | LIFF SDK in `lib/liff.ts` + `POST /api/auth/liff` | Yes | Yes | S |
| A19 | 加入旅程（對話框）— After | dialog in `app/projects/[id]/page.tsx` | `components/project/join-project-dialog` (shared, used by v2 overview) | No | `POST /api/projects/join`; `POST /api/projects/[id]/members/claim`; `isMember:false`+`joinMode`+`unclaimedMembers` from `GET /api/projects/[id]` | Yes | Yes | S |
| A20 | 邀請分享（對話框）— After | dialog in `app/projects/[id]/page.tsx` | `components/project/invite-dialog` (shared, used by v2 overview) | No | none (client `getProjectShareUrl`, clipboard, LINE share URL, `navigator.share`) | Yes | Yes | S |
| A14b | 個人資料 — After | `app/settings/profile/page.tsx` | `components/avatar-picker`, `components/auth/liff-provider` | No | `GET`/`PUT /api/users/profile` + LIFF session | Yes | Yes | S |

Count: **11 boards** (A14b handled separately by another agent — noted only here).

---

## A15 · 匯率

**What it shows.** Header 「匯率」. A dark-lake hero card with amount input, from/to currency selectors and a swap button, a large converted result and a rate/timestamp line (`更新於 2 小時前 · 1 JPY = 0.21 TWD`). Below: a `專案自訂匯率` card comparing custom vs live rates (with ±%), a collapsible `即時匯率` card (stale warning + 3-cell grid), and a collapsible `歷史匯率查詢` card (date input + 查詢).

**v1 location.** `app/projects/[id]/currency/page.tsx` — single client page that fetches project + rates, does swap/historical conversion inline, and renders shadcn `Card`/`Input`/`Select`. No dedicated component directory. Route is **not** wrapped in `UiVersionSwitch`.

**v2 exists?** No. Closest v2 primitive is `components/v2/ui/currency-field.tsx` (v2-token currency trigger, currently used by new-project/project-settings).

**Data/API.** `GET /api/exchange-rates` supports live rates, `?date=` historical and `?from&to&amount` conversion; project `customRates` + `exchangeRatePrecision` come from `GET /api/projects/[id]`. All present.

**UI-first feasibility.** Yes. Pure presentation + client compute over existing endpoints. Reuse `components/v2/ui/currency-field.tsx`; no v1 `Select` allowed in v2. Shared "dark result card" style will also be needed by A17.

**Size / deps.** M. Depends on the shared v2 currency field (exists) and the dark hero/result card primitive (new, shared with A17). No dependency on other new screens.

---

## A16 · 消費地圖

**What it shows.** Header 「消費地圖」. A count line (`8 筆消費有位置資訊`) + `顯示列表` toggle, category chips (全部/餐飲/住宿/交通 with counts), a bordered map area with pins and small overlay controls, and expense summary cards below.

**v1 location.** `app/projects/[id]/map/page.tsx` dynamically imports `components/map/expense-map.tsx` (Leaflet, `ssr:false`) and renders chips/list. Route not v2-wired.

**v2 exists?** No.

**Data/API.** `GET /api/projects/[id]/expenses` already returns `latitude`/`longitude`/`location`/`category`/`amount`/`payer`; `GET /api/projects/[id]` for currency. Geocoding (`/api/geocode`) is only needed when adding a location, not for this read view.

**UI-first feasibility.** Partial. The list, chips, count and overlay controls are straightforward v2 UI. The map itself is third-party Leaflet: it cannot be token-styled via classes, needs a `ssr:false` dynamic import, and its tiles/attribution are outside the token system. Recommended approach: create a thin `components/v2/map/*` wrapper that renders the existing map without modifying it, and build the surrounding chrome in v2 tokens. A static/mock map is acceptable for a first UI-only pass.

**Size / deps.** L. Depends on the shared category-chip primitive (also used by A25) and the Leaflet decision (re-skin vs embed). Highest technical risk of the set.

---

## A17 · 里程

**What it shows.** Header 「里程」. `路線規劃` card: A/B waypoint fields, `新增地點`, and `開啟 Google Maps`. `油費計算` card: formula hint, four inputs (總里程 / 油價 / 油耗 / 分攤人數), quick fuel-price chips, `計算油費`. A dark-lake result card showing the formula, 總油費 and 每人分攤.

**v1 location.** `app/projects/[id]/mileage/page.tsx` — all state is local; it does **not** read/write the mileage API even though the endpoint exists.

**v2 exists?** No.

**Data/API.** `GET /api/fuel-price` (has a built-in fallback), `GET`/`PUT /api/projects/[id]/mileage` for persisted `mileageData` (waypoints/totalKm/fuelPrice/fuelEfficiency/participants). Available — v2 can optionally persist, which v1 doesn't.

**UI-first feasibility.** Yes, fully. Pure client-side calculation plus a generated Google Maps deep link. The only integration is the existing fuel-price fetch/fallback.

**Size / deps.** M. Shares the dark result card with A15. No dependency on other new screens.

---

## A22 · 歷史紀錄

**What it shows.** Header 「歷史紀錄」. A search field, three filter buttons (操作 / 操作者 / 類別), a result count + `清除篩選`, then activity cards whose colored header encodes the action (新增費用 / 編輯費用 / 刪除費用) with actor, an expense summary block, change chips (`金額 12,000 → 14,000`), and `載入更多`.

**v1 location.** `app/projects/[id]/activity-logs/page.tsx` (~976 lines). It is feature-rich: search + 8 filters (action, actor, payer, category, currency, amount range, created date, expense date) built on `components/ui/{search-input,filter-dropdown,popover,calendar}` and `date-fns`. Route not v2-wired.

**v2 exists?** No.

**Data/API.** `GET /api/projects/[id]/activity-logs?limit&offset` returns `{ logs, total, hasMore }` including `changes`, `metadata` and `actor`. Available.

**UI-first feasibility.** Yes. Note the design shows only **3** filters while v1 offers 8; decide whether to keep the extra filters (precedent: milestone-6 D19 kept features that the design omitted). Filtering itself is currently client-side over the fetched pages — that can be reproduced, or extended later. No API change needed either way.

**Size / deps.** L. Depends on a reusable v2 filter popover (already exists in `components/v2/expenses/filter-popover.tsx` + `filter-panels.tsx`) and the expense-card visual language (`components/v2/expenses/expense-card.tsx`).

---

## A23 · 匯出

**What it shows.** Header 「匯出」. A card with format choices (CSV selected / PDF), content checkboxes (支出明細 / 結算資訊 / 統計摘要), a `篩選條件` row + `新增篩選`, and a project summary box (專案 / 支出筆數 / 成員人數). Fixed bottom `匯出 CSV` button.

**v1 location.** `app/projects/[id]/export/page.tsx`; the form lives in `components/export/export-options-form.tsx` (v1/shadcn). Balance/settlement/category math is computed inline in the page; file generation uses pure `lib/export/{csv-generator,pdf-generator,types}`. Route not v2-wired.

**v2 exists?** No.

**Data/API.** `GET /api/projects/[id]` (members + expenses + currency + customRates) and `GET /api/exchange-rates` when mixed currencies. `lib/export/*` are pure functions. No new API.

**UI-first feasibility.** Yes. The client-side file generation is reusable as-is; only the form and preview chrome need a v2 rebuild. Two cautions: (1) `ExportOptionsForm` is v1 and must not be edited — build a v2 form; (2) the balance/settlement math currently lives in the v1 page, so the v2 view must reproduce it (check `lib/settlement.ts` / `lib/project-stats.ts` for reusable pure helpers before duplicating).

**Size / deps.** M. Depends on the v2 form controls (`section-card`, checkbox styling) and a decision on where the export math lives.

---

## A24 · 筆記

**What it shows.** Header 「筆記」. A lake-soft info banner (all members share this note), one large bordered textarea card with placeholder, and a full-width `儲存變更` button.

**v1 location.** `app/projects/[id]/notes/page.tsx` — fetch on mount, local dirty state, PUT on save (`components/ui/textarea`). Route not v2-wired.

**v2 exists?** No.

**Data/API.** `GET`/`PUT /api/projects/[id]/memo` (`{ memo }`). Available.

**UI-first feasibility.** Yes — the simplest screen in the set; presentation only, existing save flow.

**Size / deps.** S. None.

---

## A25 · 照片相簿

**What it shows.** Header 「照片牆」. A count line (`8 張收據照片`), category chips, and a 2-column grid of square thumbnails each with a category chip and amount/description overlay. (v1 additionally has a full lightbox; the board shows only the grid.)

**v1 location.** `app/projects/[id]/photos/page.tsx` — filters expenses with an `image`, category chips, grid using `next/image`, plus a lightbox. Route not v2-wired.

**v2 exists?** No.

**Data/API.** `GET /api/projects/[id]/expenses` already returns `image` plus amount/category/description; `GET /api/projects/[id]` for currency. Available.

**UI-first feasibility.** Yes. Real thumbnails come from `expense.image`; overlay styling is token work. Decide whether to keep the lightbox (not on the board, but v1 has it).

**Size / deps.** S. Shares the category-chip primitive with A16.

---

## A18 · 登入

**What it shows.** A centered white card on paper background: rounded logo tile 「W」, `Wander Wallet`, a two-line tagline, a full-width `使用 LINE 登入` button, and small consent text.

**v1 location.** Not a route. The unauthenticated state is rendered globally by `components/auth/auth-gate.tsx` (shadcn `Card`/`Button`) for every protected route; `login()` comes from `components/auth/liff-provider.tsx`. `app/page.tsx` is a separate public marketing landing page, not this screen.

**v2 exists?** No. `AuthGate` also gates all v2 routes, but its login screen is v1-styled.

**Data/API.** LIFF via `lib/liff.ts` + `LiffProvider`; `POST /api/auth/liff`. Available.

**UI-first feasibility.** Yes — presentation only, `login()` is already wired. Caveat: `AuthGate` is shared by v1 and v2, and it is **not** in the forbidden directories, but editing it affects both. Safest path: render a v2 login view inside `AuthGate` when the resolved UI version is v2 (or introduce a v2-branded component it delegates to), leaving the v1 branch byte-for-byte unchanged. Also note the debug/dev-mode banner in the current gate.

**Size / deps.** S. Depends on `UiV2Scope` + the UI-version resolver; coordinate with the shared auth entry point.

---

## A19 · 加入旅程（對話框）

**What it shows.** A dimmed overlay with a modal `加入「京都賞楓行」`: `認領現有成員` radio list, `確認認領`, a `或` divider, `建立新成員` + `以新成員加入`, and `取消`.

**v1 location.** Shared `components/project/join-project-dialog.tsx`. It is already rendered by **both** v1 and v2 project overviews (`components/v2/project/project-overview-v2.tsx`), triggered when `useProjectOverview` gets `isMember:false`.

**v2 exists?** No v2-specific component, but v2 currently uses the shared v1 dialog.

**Data/API.** `POST /api/projects/join`, `POST /api/projects/[id]/members/claim`; `joinMode` + `unclaimedMembers` + `isMember:false` from `GET /api/projects/[id]`. Available.

**UI-first feasibility.** Yes. Build a v2 dialog (`components/v2/project/join-project-dialog-v2.tsx`) used only by the v2 overview; leave the shared v1 dialog untouched for v1. Reuse the overlay/dismiss pattern (`components/v2/use-dismiss.ts`, `components/v2/project-settings/delete-project-sheet.tsx`). Note the board omits the conditional join-mode copy the current dialog handles — keep the logic, restyle the presentation.

**Size / deps.** S. Pairs with A20 (both live in the overview overlay layer).

---

## A20 · 邀請分享（對話框）

**What it shows.** A dimmed overlay with a modal `邀請成員加入`: three share tiles (LINE / 複製連結 / 更多), and a share-link box.

**v1 location.** Shared `components/project/invite-dialog.tsx`, opened by `onShare` in `components/v2/project/project-overview-v2.tsx` (and by v1 settings). Detects `navigator.share` to show/hide the third tile.

**v2 exists?** No v2-specific component; v2 uses the shared v1 dialog.

**Data/API.** None server-side: `getProjectShareUrl()` (`lib/utils.ts`), clipboard, LINE share URL, `navigator.share`. Available.

**UI-first feasibility.** Yes. Same approach as A19: new v2 dialog used only by the v2 overview; keep the v1 dialog as-is.

**Size / deps.** S. Pairs with A19; depends on the same overlay/dismiss primitive.

---

## A14b · 個人資料

**What it shows.** Header 「個人資料」. An 88px avatar with an edit badge + name, an info card (名稱 / 帳號類型 `LINE 用戶` / 登入方式), and a destructive `登出` button. (Board shows no logout-confirm dialog, unlike v1.)

**v1 location.** `app/settings/profile/page.tsx`; uses `components/avatar-picker.tsx` and `liff-provider`. Note `app/settings/page.tsx` switches GeneralSettings v1/v2, but the profile page is **not** `UiVersionSwitch`-wrapped.

**v2 exists?** No.

**Data/API.** `GET`/`PUT /api/users/profile`; LIFF session. Available.

**UI-first feasibility.** Yes.

**Size / deps.** S. **A separate agent is producing the detailed gap analysis for A14b — this row is intentionally a stub to avoid duplicate work.**

---

## Recommended implementation order

No screen requires a new API, a schema change, or edits to v1/ui/lib. Sequencing is therefore driven by risk and by shared v2 primitives.

**Group 1 — Trivial wins, existing data, no shared-primitive work.**
`A24 筆記` → `A25 照片相簿` → `A20 邀請分享` → `A19 加入旅程` → `A18 登入`
Rationale: smallest surfaces; each is presentation over an endpoint/flow that already works. Notes and Photos prove the `UiVersionSwitch` route pattern end-to-end. The two dialogs establish the v2 overlay/modal pattern and pair naturally. Login is last in the group because `AuthGate` is shared with v1 and needs a version-aware branch. This group de-risks the token/overlay foundation before any complex screens.
*(A14b 個人資料 is also S and could slot here, but it is owned by the other agent — coordinate rather than duplicate.)*

**Group 2 — Medium, existing data, needs shared v2 primitives.**
`A23 匯出` → `A17 里程` → `A15 匯率`
Rationale: all three are pure client compute over existing endpoints and pure `lib/export` functions. They introduce, once, the reusable "section card" + "dark hero/result card" + v2 form controls that this whole set shares; building them together avoids re-styling the same primitives three times. Currency and Mileage share the dark result card directly. Export adds a v2 form and a decision on reusing the balance/settlement math.

**Group 3 — Large / integration-heavy, do last.**
`A22 歷史紀錄` → `A16 消費地圖`
Rationale: ActivityLogs needs a real v2 filter system (reuse `components/v2/expenses/filter-*`) plus the card timeline, and forces a scope decision on the design's 3 filters vs v1's 8. The Map is the only screen with non-token third-party UI (Leaflet, `ssr:false`, tiles/attribution) and should be tackled once all token primitives and card patterns exist. Both are lower risk after Groups 1–2.

**Shared primitives this set will create/reuse** (build in Group 1–2, reuse throughout):
- overlay/dismiss + centered modal sheet (`use-dismiss`, delete-project-sheet pattern)
- section card (`components/v2/expense-form/section-card.tsx` exists) and dark hero/result card (new)
- v2 currency field (`components/v2/ui/currency-field.tsx` exists)
- category filter chips (A16 + A25)
- v2 filter popover (A22, reuses expenses filter components)
- V2 top bar (`components/v2/layout/v2-top-bar.tsx` exists)
