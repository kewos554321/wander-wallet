# Design gap report — A13 專案設定, A14 通用設定, A14b 個人資料 (design v20261004)

- Date: 2026-10-04
- Branch: `feat/ui-v2-m6`
- Design source: `design/project-v20261004/{ProjectSettings,GeneralSettings,ProfileSettings-after}.dc.html`
- Previous canvas: `design/project-v20261003/` (the canvas the current v2 code was built against)
- Code under review: `components/v2/project-settings/**`, `components/v2/settings/**`, `app/settings/page.tsx`, `app/projects/[id]/settings/page.tsx`, and (for A14b) `app/settings/profile/page.tsx`
- Method: CHANGED boards (A13, A14) are diffed **v20261003 → v20261004** and only the delta is reported. A14b is NEW and is compared **whole board vs code**.
- Constraint reminder: this report only proposes edits to `components/v2/**`, `app/globals.css` (new tokens only) and `tests/**`. Anything else is flagged as a blocker.

## 0. Delta summary (isolated)

`diff design/project-v20261003/ProjectSettings.dc.html design/project-v20261004/ProjectSettings.dc.html`

- 1 changed line: root container only, `height:2160px` → `height:1616px` (plus whitespace normalization of the same style attribute). No DOM/content change.

`diff design/project-v20261003/GeneralSettings.dc.html design/project-v20261004/GeneralSettings.dc.html`

- line 20: root container `height:1560px` → `height:939px` (cosmetic).
- line 32: profile card `href="#"` → `href="ProfileSettings-after.dc.html"`.

| Board | Class | Real design delta | Code already matches? |
|---|---|---|---|
| A13 ProjectSettings | CHANGED | none (root `<div>` height only) | yes — no code change |
| A14 GeneralSettings | CHANGED | profile card is now a link to the 個人資料 page | yes — `general-settings-v2.tsx:66` already `router.push("/settings/profile")` |
| A14b ProfileSettings-after | NEW | whole page | no v2 implementation — full rebuild |

Conclusion: A13 and A14 require **no code change** for this delta. The only actionable work is A14b, which is a **separate page/route** (`/settings/profile`) whose current implementation is still v1-styled.

---

## 1. A13 專案設定 — `design/project-v20261004/ProjectSettings.dc.html`

Delta-only gap table (design v03 → v04):

| Element | Design (v20261004) | Current code (file:line) | Change needed |
|---|---|---|---|
| Root canvas | `<div style="width: 390px; height: 1616px; …">` (was `2160px`) | n/a (canvas height is not represented in app code) | **no change** |
| All content | identical to v20261003 | `components/v2/project-settings/project-settings-v2-view.tsx` | **no change** |

Verification against the full current board (same content as v03) shows the v2 code already matches:
- Card shell `rounded-[18px] border border-v2-line bg-v2-surface p-4` (`project-settings-v2-view.tsx:9`) = radius 18 / padding 16, card title 13/700 lake (`:10`).
- 封面 tile 48×48 radius 14 + 22px white icon + `gap-2.5` + 12px ink-muted caption (`cover-tile-button.tsx:12-13`, view `:56-59`) = design `width:48px;height:48px;border-radius:14px`.
- 描述 counter `n/50`, danger when `>50`, textarea `min-h-16 bg-v2-paper px-3.5 py-3` (`:66-75`).
- 預算 `$`/currency-symbol prefix at left 14, `pl-[26px]` (`:97-105`); 匯率計算精度 `w-14` (56px) centred (`:145-156`); ExchangeRateRow label `w-[52px]`, input `bg-v2-paper py-[10px] pl-3 pr-11`, suffix `right-3` (`exchange-rate-row.tsx:20-32`).
- Danger card `border-v2-danger-border bg-v2-danger-tint` + `text-v2-danger-strong` + pill button (`:171-182`).
- Join-mode "settings" variant radius 14 / filled lake dot (`join-mode-picker.tsx:31-58`).

Pre-existing accepted deviations (from the v03 report; **not** part of this delta, listed only for awareness):
- 成員加入方式 card gap: design `gap:10px`, code uses the shared `cardClass` `gap-3.5` (14px).
- Footer 取消/儲存 is fixed to the viewport (D8) while the mock shows it inline.
- Budget shows raw digits, no thousand separator (D10).

## 2. A14 通用設定 — `design/project-v20261004/GeneralSettings.dc.html`

Delta-only gap table:

| Element | Design (v20261004) | Current code (file:line) | Change needed |
|---|---|---|---|
| Profile card href | `<a href="ProfileSettings-after.dc.html" …>` (line 32) | `components/v2/settings/general-settings-v2.tsx:63-77`, `onClick={() => router.push("/settings/profile")}` (line 66) | **no change** — already links to the route |
| Root canvas | `height:939px` (was 1560px) | n/a | **no change** |

Whole-board spot-check vs current design (all match, `general-settings-v2.tsx`):
- Profile card `rounded-[18px] bg-v2-lake p-4 gap-3.5`, 48px avatar `bg-v2-paper/15`, serif 15/600 name, sub 12 `opacity-75`, chevron 16 `opacity-85` (`:63-77`) — design lines 32-39. ✓
- 外觀 3 tiles `gap-2` (8px), each `flex-1 rounded-xl border px-2 py-3 gap-1.5`, 16px icon, 12px label; selected `border-[1.5px] border-v2-lake bg-v2-lake-soft` (`:111-132`) — design lines 41-57. ✓
- 記帳偏好 title icon 15px lake + full-name `V2CurrencyField` + hint 12 ink-subtle mt 6 (`:134-147`) — design 59-73. ✓
- LINE 通知 title icon + 12 ink-subtle sub + 20px/radius-6 checkbox, check `strokeWidth 3`, unchecked `border-[1.5px] border-v2-check` (`:149-182`) — design 75-95. ✓
- 重看導覽 / 功能介紹 / 意見回饋 rows 13/700 + 15px lake icon + 13px ink-subtle trailing icon (`:184-226`) — design 97-120. ✓
- Beta card retained on purpose (D11); not in the mock. Known accepted deviation.

## 3. A14b 個人資料 — `design/project-v20261004/ProfileSettings-after.dc.html` (NEW)

**Is it a route or a section?** A **separate page/route**. The board has its own top bar with a back arrow to `GeneralSettings.dc.html`, and the A14 profile card now `<a href="ProfileSettings-after.dc.html">`. The route already exists as `/settings/profile` (`app/settings/profile/page.tsx`) but renders a v1-styled body (shadcn `Card`/`Button`, `AppLayout`, v1 tokens). A14b therefore needs a new v2 component; see §6 for the scope blocker on wiring the route.

Whole-board gap table:

| Element | Design (v20261004) | Current code (file:line) | Change needed |
|---|---|---|---|
| Page shell | `background:#FAF7F2`, width 390, header `padding:16px 14px; border-bottom:1px solid #E7DFD2` | `app/settings/profile/page.tsx:71` `<AppLayout title="個人資料" showBack>` (v1 layout, no `[data-ui="v2"]` scope) | Rebuild with `UiV2Scope` + `V2TopBar title="個人資料" backHref="/settings"` (V2TopBar already = `px-3.5 py-4`, 34px circle, serif 16/24 ls .15) |
| Title | `<h1>` serif 500 16/24 `letter-spacing:.15px` | `AppLayout title` (v1 font/weight) | Covered by `V2TopBar` |
| Avatar hero section | `padding:24px 16px 20px; flex column; align-items:center; gap:10px` | `:74` `flex flex-col items-center gap-3` (12px) | `px-4 pt-6 pb-5 gap-2.5` |
| Avatar button | `88px × 88px; border-radius:50%; background:linear-gradient(135deg,#24735D,#1B5847)`; `aria-label="點擊更換頭像"` | `:75-100` `size-24` (96px), no gradient, `bg-muted` fallback | 88px circle `bg-gradient-to-br from-v2-link to-v2-lake`; fallback shows **initial letter**, not `User` icon; keep `aria-label` |
| Avatar initial | serif 700 32px `color:#FAF7F2` | `:93-95` `User` icon 48px `text-muted-foreground` | `font-v2-serif text-[32px] font-bold text-v2-paper` (paper = `#FAF7F2`) |
| Edit badge | `28px × 28px` circle, `right:-2px; bottom:-2px`, `bg:#FFFFFF`, `border:2px solid #FAF7F2`, `color:#1B5847`, `box-shadow:0 1px 4px rgba(27,24,21,.15)`, pencil 13px stroke 2 | `:97-99` hover-only overlay `bg-black/50` + `text-white` (banned classes; only survives because it lives outside `components/v2`) | Always-visible badge: `h-7 w-7 rounded-full bg-v2-surface border-2 border-v2-paper text-v2-lake shadow-[0_1px_4px_rgba(27,24,21,.15)]`, `Pencil h-[13px] w-[13px]` |
| Caption | `點擊更換頭像` 12px `color:#A79F8F` | `:101` `text-xs text-muted-foreground` | `text-xs text-v2-ink-faint` (new token, §4) |
| Name | serif 700 20px, `margin:2px 0 0` | `:102-104` `text-xl font-semibold` (sans, 600) | `font-v2-serif text-xl font-bold mt-0.5` |
| Info card | `margin:0 16px; bg:#FFFFFF; border:1px solid #E7DFD2; border-radius:18px; overflow:hidden` | `:108` `<Card>` + `CardContent space-y-4` (v1 card; no dividers) | `mx-4 overflow-hidden rounded-[18px] border border-v2-line bg-v2-surface` |
| Info row | each `display:flex; gap:12px; padding:14px 16px; border-bottom:1px solid #F0EAE0` (last none) | `:110-138` `flex items-center gap-3`, no divider | `flex items-center gap-3 px-4 py-3.5`, `divide-y divide-v2-line-soft` (`#F0EAE0` = `--v2-line-soft`) |
| Row icon circle | `38px × 38px; border-radius:50%; background:#F1EBE0; color:#6E6860`; icon 17px stroke 1.8 | `:111,121,131` `size-10` (40px) `bg-muted`; icon `size-5` (20px) | `h-[38px] w-[38px] bg-v2-sand text-v2-ink-muted`, icon `h-[17px] w-[17px]` |
| Row label | 12px `color:#A79F8F` | `:115,125,135` `text-sm text-muted-foreground` (14px) | `text-xs text-v2-ink-faint` |
| Row value | 14px `font-weight:600`, `margin:1px 0 0` | `:116,126,136` `font-medium` (16px default, weight 500) | `text-sm font-semibold` |
| Rows present | 名稱 (`User`), 帳號類型 (`Mail`), 登入方式 (`Calendar`) — all read-only | same 3 rows, same icons | keep; no API |
| Logout button | `margin:20px 16px 0`; `100% × 48px; border-radius:14px; background:#A6402F; color:#FFFFFF; gap:8px; font:14px/700; box-shadow:0 4px 10px rgba(166,64,47,.25)`; `LogOut` 16px stroke 2 | `:143-152` `<Button variant="destructive" className="w-full">` (v1 destructive) | `mx-4 mt-5 h-12 rounded-[14px] bg-v2-danger-deep text-v2-on-lake gap-2 text-sm font-bold shadow-[0_4px_10px_rgba(166,64,47,.25)]`, `LogOut h-4 w-4` |
| Logout behaviour | mock logs out directly (no dialog) | `:156-179` confirm `Dialog`, then `logout()` | Keep the confirm dialog (not drawn). Behaviour decision, §6 |
| Avatar picker | not drawn; avatar button opens a picker | `:182-189` shared `AvatarPicker` + `PUT /api/users/profile` (`:39-43`) | Reuse shared `AvatarPicker` unchanged; APIs already exist |

Residual deviations intentionally carried over: none yet (new board).

---

## 4. Files to modify

In-scope (propose):

| File | Action |
|---|---|
| `components/v2/settings/profile-settings-v2.tsx` | **new** — full A14b v2 page (uses `UiV2Scope`, `V2TopBar`, `AvatarPicker`). |
| `app/globals.css` | add new v2 tokens only (see §5). |
| `tests/components/v2/profile-settings-v2.test.tsx` | **new** — see §6. |
| `tests/components/v2/v2-tokens.test.ts` | extend `NEW_TOKENS` with the two new tokens. |
| `components/v2/settings/general-settings-v2.tsx` | **no change** (delta already implemented). |
| `components/v2/project-settings/**` | **no change** (A13 delta is canvas-only). |

Out-of-scope — **BLOCKER, needs approval**:

| File | Why |
|---|---|
| `app/settings/profile/page.tsx` | Must wrap the existing v1 body and the new `ProfileSettingsV2` in `UiVersionSwitch` (same pattern as `app/settings/page.tsx:8`). This file is **not** in the allowed edit set, so the v2 profile page cannot actually be reached without it. See §6. |

## 5. New tokens

Add to `@theme inline` as `--color-v2-<name>: var(--v2-<name>);`, and to both `[data-ui="v2"]` and `.dark [data-ui="v2"]` in `app/globals.css`:

| Design value | Where in A14b | Proposed token | Light | Dark (proposal) |
|---|---|---|---|---|
| `#A79F8F` | caption (`:37`), row labels (`:48,58,68`) | `--v2-ink-faint` | `#A79F8F` | `#918A7E` |
| `#A6402F` | logout button bg (`:76`) | `--v2-danger-deep` | `#A6402F` | `#E8735A` |
| `#F0EAE0` | row dividers (`:43,53`) | **existing** `--v2-line-soft` | `#F0EAE0` | `#2A2622` |
| `#F1EBE0` | row icon circle bg (`:44,54,64`) | **existing** `--v2-sand` | `#F1EBE0` | `#2A2622` |
| `#24735D` | avatar gradient start | **existing** `--v2-link` | `#24735D` | `#6CC7AA` |
| `#1B5847` | avatar gradient end | **existing** `--v2-lake` | `#1B5847` | `#4FB394` |

Notes:
- `#A79F8F` also appears in the other new v20261004 boards (ActivityLogs, Export, Login, JoinTrip, SettleCalcDialog, CategorySelectedState) — a shared "faint" tone. Fallback if the team rejects a new token: map to `v2-ink-subtle` (`#B7AE9D`). Recommend the new token.
- `#A6402F` is a single-use deep red; fallback to `v2-danger-strong` (`#C4432A`) if no new token. Recommend the new token to preserve the deeper CTA. Dark value `#E8735A` is chosen so `text-v2-on-lake` (dark text in dark mode) stays legible.
- Shadow colours `rgba(166,64,47,.25)` / `rgba(27,24,21,.15)` follow the existing v2 pattern of numeric `rgba()` inside `shadow-[…]` (see `projects-v2-view.tsx:70`); no `#hex` in class names, so the colour guard stays green.
- **Colour-guard test:** extend `tests/components/v2/v2-tokens.test.ts` `NEW_TOKENS` with `"ink-faint": ["#A79F8F", "#918A7E"]` and `"danger-deep": ["#A6402F", "#E8735A"]`. The existing loop already asserts the `[data-ui="v2"]` / `.dark [data-ui="v2"]` / `@theme inline` wiring.

## 6. Tests to add/update

| File | Action | Cases |
|---|---|---|
| `tests/components/v2/profile-settings-v2.test.tsx` | **new** | Mock `next/font/google`, `next/navigation`, `@/components/auth/liff-provider` (`user = {name:"Emma", image:null}`, `logout`, `refreshSession`), `@/components/auth/liff-provider` `useAuthFetch`. Cases: (1) renders name `Emma`, `aria-label="點擊更換頭像"`, caption `點擊更換頭像`, and fallback initial `E`; (2) renders rows `名稱`/`帳號類型`/`登入方式` with `Emma`/`LINE 用戶`/`LINE 帳號`; (3) clicking the avatar opens `AvatarPicker`; selecting an avatar calls `authFetch("/api/users/profile", {method:"PUT", body:{image:"avatar:…"}})` and `refreshSession`; (4) clicking `登出` opens the confirm dialog, confirming calls `logout`; (5) renders within `[data-ui="v2"]` (assert `container.querySelector('[data-ui="v2"]')`). |
| `tests/components/v2/v2-tokens.test.ts` | **update** | add `ink-faint`, `danger-deep` to `NEW_TOKENS`. |
| `tests/components/v2/no-hardcoded-colors.test.ts` | no change (guard) | must stay green for the new `.tsx`. |
| `tests/components/v2/general-settings-v2.test.tsx` | no change | profile-card navigation test (`:118-122`) already asserts `/settings/profile`. |
| `tests/components/v2/m4-pages.test.tsx` | **update only if route is wired** | if approved, add `import SettingsProfilePage from "@/app/settings/profile/page"`, mock `ProfileSettingsV1`/`ProfileSettingsV2`, and assert the switch renders both. Currently no test imports the profile route. |
| Coverage | — | new `profile-settings-v2.tsx` must be ≥ 90% lines (milestone-6 rule). |

## 7. Open questions / API gaps / UI-only items

1. **A14b is a separate route, not a settings section.** It maps to `/settings/profile`, which already exists but is v1-styled. Recommended: add `ProfileSettingsV2` and render it via `UiVersionSwitch` in `app/settings/profile/page.tsx`.
2. **BLOCKER — route wiring is out of the allowed edit scope.** The v2 profile page cannot be reached without editing `app/settings/profile/page.tsx` (`app/**` is excluded by the hard rules). Needs explicit approval. In-scope fallback (not recommended): render `ProfileSettingsV2` as a full-screen view toggled from the A14 profile card inside `general-settings-v2.tsx`; this deviates from the design's page/back semantics.
3. **API:** none needed. Avatar save already uses `PUT /api/users/profile` (`app/settings/profile/page.tsx:39`), name/type/login rows are derived from `useLiff().user`. Do **not** touch `app/api/**`.
4. **Logout confirm dialog** is not in the mock; recommend keeping it (existing behaviour) and recording the deviation.
5. **Avatar fallback:** the mock's default avatar is the gradient circle + initial, but a user may have a custom `avatar:` string or an external image. Keep the three-way render (custom `AvatarDisplay` / external `Image` / gradient+initial) and note that the design only shows the fallback.
6. **`AccountType` labels are hard-coded** (`LINE 用戶`, `LINE 帳號`) exactly as in the mock — fine for now.
7. **New token dark values** (`#918A7E`, `#E8735A`) are proposals pending designer confirmation.
8. **`#A79F8F` is shared across several new boards** — if another task introduces the same token, dedupe to one `--v2-ink-faint`.

## 8. v1 regression risks

- **Route file:** wrapping `app/settings/profile/page.tsx` in `UiVersionSwitch` must keep the existing v1 JSX byte-for-byte as the `v1` branch; v1 and `null` (unresolved) versions must still render the current page. Do not move v1 markup into `components/v1/**` (forbidden) — keep it inline as the v1 branch or a local component in the route.
- **`components/avatar-picker.tsx` is shared and must not be edited.** It contains `text-white` internally (`:244`) but lives outside `components/v2`, so the colour guard does not scan it; importing it from a v2 component is fine.
- **New tokens are additive only** (`--v2-ink-faint`, `--v2-danger-deep`); names do not exist in the v1 token set, so no v1 styling can shift. Add only inside `[data-ui="v2"]`, `.dark [data-ui="v2"]`, and `@theme inline`.
- **No changes to** `components/v2/settings/general-settings-v2.tsx` or `components/v2/project-settings/**`, so A13/A14 behaviour and their tests are untouched.
- **`app/settings/page.tsx` and `app/projects/[id]/settings/page.tsx` stay as-is.**
- **`tests/components/v1/**` untouched**; the profile route test change (if any) goes in `tests/components/v2/m4-pages.test.tsx`.
- The A14b component must avoid `#hex`, `bg-white`/`text-white`/`bg-black`, and `dark:` — the new profile page currently uses `bg-black/50` + `text-white` (`app/settings/profile/page.tsx:97-98`); the v2 rebuild replaces those with `bg-v2-ink/50`-style token classes / `text-v2-paper` (or an always-visible badge with no overlay), keeping `tests/components/v2/no-hardcoded-colors.test.ts` green.
