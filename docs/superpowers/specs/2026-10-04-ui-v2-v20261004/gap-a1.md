# Diff: A1 — Projects list (design v20261004 vs. current v2 code)

## 1. Header

- **Board**: A1 · 旅程列表 / Projects list — `design/project-v20261004/MainCard3-njus.dc.html` (canvas title `A1 · 旅程列表 — After`, 390 × 900).
- **Old snapshot used for delta**: `design/project-v20261003/MainCard3-njus.dc.html`.
- **Current code**: `components/v2/projects/projects-v2-view.tsx` (renderer), `components/v2/projects/projects-v2.tsx` (data wrapper), `app/projects/page.tsx` (version switch).
- **Scope**: proposals only for `components/v2/**`, `app/globals.css` (add v2 tokens only), `tests/**`. v1 files must not change.

### Delta between the two snapshots

```
$ diff design/project-v20261003/MainCard3-njus.dc.html design/project-v20261004/MainCard3-njus.dc.html
25,26c25,26
< (32px circle, bg #1B5847, 17px compass SVG)
---
> (32px rounded-square, gradient, 19px wallet/card SVG)
```

**The board changed in exactly one place: the top-left brand lockup mark (lines 25–26). Every other line is byte-identical.** Because the existing v2 implementation already matched the v20261003 board (see `docs/superpowers/specs/2026-10-03-ui-v2-milestone-6/gap-a1-a2.md` § A1, where all other elements were marked "none"), the *entire* remaining A1 gap is this brand mark. All other rows below are verified as **no change**.

Design HTML v20261004 (lines 23–31), quoted:

```html
<div style="padding:22px 20px 4px;display:flex;align-items:center;justify-content:space-between;">
  <div style="display:flex;align-items:center;gap:8px;">
    <div style="width:32px;height:32px;border-radius:10px;background:linear-gradient(135deg,#24735D,#1B5847);display:flex;align-items:center;justify-content:center;color:#FAF7F2;box-shadow:0 2px 6px rgba(27,88,71,.35);">
      <svg viewBox="0 0 32 32" width="19" height="19" fill="none"><rect x="4" y="8" width="24" height="18" rx="4" stroke="currentColor" stroke-width="2.5"></rect><path d="M4 14 H28" stroke="currentColor" stroke-width="2"></path><circle cx="22" cy="19" r="3" fill="currentColor" fill-opacity="0.4"></circle></svg>
    </div>
    <span style="font-family:'Noto Sans TC',sans-serif;font-weight:700;font-size:15px;letter-spacing:.1px;">Wander Wallet</span>
  </div>
  <a href="GeneralSettings.dc.html" aria-label="通用設定" style="width:36px;height:36px;border-radius:50%;background:#1B5847;display:flex;align-items:center;justify-content:center;color:#FAF7F2;font-size:14px;font-weight:700;">E</a>
</div>
```

## 2. Gap table

| Element | Design (v20261004) | Current code (file:line) | Change needed |
|---|---|---|---|
| Brand lockup container | 32×32 (`width:32px;height:32px`); `border-radius:10px`; `background:linear-gradient(135deg,#24735D,#1B5847)`; `box-shadow:0 2px 6px rgba(27,88,71,.35)`; `display:flex;align-items:center;justify-content:center`; icon color `#FAF7F2` | `components/v2/projects/projects-v2-view.tsx:45` — `"flex h-8 w-8 items-center justify-center rounded-full bg-v2-lake text-v2-paper"` | Real deviation. Change to `rounded-[10px]` (10px, not `rounded-full`); replace `bg-v2-lake` with gradient `bg-gradient-to-br from-v2-link to-v2-lake`; add `shadow-[0_2px_6px_rgba(27,88,71,.35)]`. Keep `h-8 w-8 items-center justify-center text-v2-paper flex shrink-0`. `bg-gradient-to-br` = 135deg. |
| Brand mark icon | inline SVG, `viewBox="0 0 32 32"`, `width/height 19`; `<rect x="4" y="8" width="24" height="18" rx="4" stroke-width="2.5"/>`; `<path d="M4 14 H28" stroke-width="2"/>`; `<circle cx="22" cy="19" r="3" fill-opacity="0.4"/>`; stroke/fill `currentColor` | `components/v2/projects/projects-v2-view.tsx:46` — `<Compass className="h-[17px] w-[17px]" strokeWidth={1.6} />` | Real deviation. Replace `Compass` 17px/1.6 with a 19px wallet/card mark. **No lucide icon matches exactly** (closest: `CreditCard` = rect + line, missing the chip; `Wallet`/`Wallet2` have a different silhouette). Recommend inlining the design SVG verbatim (as shown) at `h-[19px] w-[19px]`, `aria-hidden="true"`, using `currentColor`; or accept `CreditCard`/`Wallet` at 19px as an approximation. Drop the now-unused `Compass` import. |
| Wordmark "Wander Wallet" | `font-weight:700; font-size:15px; letter-spacing:.1px` | `projects-v2-view.tsx:48` — `"text-[15px] font-bold tracking-[.1px]"` | no change |
| Header right avatar → `/settings` | 36px circle, `#1B5847`, `#FAF7F2`, 14px/700, `aria-label="通用設定"` | `projects-v2-view.tsx:50-56` — `h-9 w-9 rounded-full bg-v2-lake text-sm font-bold text-v2-paper`, `href="/settings"` | no change |
| Greeting "早安，Emma" | 12px / 16px / ls .4 / `#6E6860` | `projects-v2-view.tsx:61-63` — `text-xs leading-4 tracking-[.4px] text-v2-ink-muted` | no change |
| H1 "你的旅程" | Noto Serif TC 700, 32px / 40px | `projects-v2-view.tsx:64` — `font-v2-serif text-[32px] font-bold leading-10` | no change |
| Tagline | 12px / 16px / ls .3 / `#6E6860`, `margin:4px 0 0` | `projects-v2-view.tsx:65` — `mt-1 text-[12px] leading-4 tracking-[.3px] text-v2-ink-muted` | no change |
| "+" create button | 44px circle, `#1B5847`, `#FFFFFF`, `shadow 0 4px 10px rgba(27,88,71,.25)`, `aria-label="建立新旅程"` | `projects-v2-view.tsx:67-73` — `h-11 w-11 rounded-full bg-v2-lake text-v2-on-lake shadow-[0_4px_10px_rgba(27,88,71,.25)]` | no change |
| Filter chips | active 8/18 `#1B5847` 14px/500 lh20; inactive 8/14 `#6E6860` | `projects-v2-view.tsx:76-92` | no change |
| Project card | `#FFFFFF`, border `#E7DFD2`, radius 16, padding 12, shadow `0 2px 8px rgba(27,24,21,.05)` | `projects-v2-view.tsx:134-136` | no change |
| Cover thumb | 64px, radius 12, gradient | `cover-thumb.tsx` → `CoverArt` (`h-16 w-16 rounded-xl`) | no change |
| Card title / day badge / date line | serif 16/24; badge 12/700; date 12px | `projects-v2-view.tsx:141-148` | no change |
| AvatarStack + amount | 20px avatars, overlap −6; serif 16/700 lake | `projects-v2-view.tsx:149-154, 160-175` | no change |

Only **2 real deviations** (the container styling and the icon); everything else is unchanged.

## 3. Files to modify (exact paths)

- `components/v2/projects/projects-v2-view.tsx` — brand lockup only (≈ lines 5, 44–48).
- `tests/components/v2/projects-v2-view.test.tsx` — add one brand-mark case (see §5).

No change to `components/v2/projects/projects-v2.tsx`, `app/projects/page.tsx`, `components/v2/projects/cover-thumb.tsx`, or `app/globals.css`.

## 4. New tokens

**None required.** Every colour in the changed element maps to an existing v2 token:

- `#24735D` = `--v2-link` (light) — already `--color-v2-link` in `@theme inline` (`app/globals.css:375`, `330`).
- `#1B5847` = `--v2-lake` (`app/globals.css:373`).
- `#FAF7F2` = `--v2-paper` (`app/globals.css:365`), already used as `text-v2-paper`.
- `rgba(27,88,71,.35)` shadow is rgba, not hex — allowed (the `no-hardcoded-colors` ban is `-[#hex]`, `bg-white`, `text-white`, `bg-black`, `dark:`; see `tests/components/v2/no-hardcoded-colors.test.ts:7`).

The inline SVG uses `stroke="currentColor"` / `fill="currentColor"` with `fill-opacity` — no hex, so the colour guard stays green.

Optional (not recommended unless the team dislikes semantics): add a `--v2-lake-deep` alias (`#24735D` light / proposal `#6CC7AA` dark) instead of reusing `--v2-link` for the brand gradient. Since `#24735D` already exists exactly as `--v2-link`, mapping to the existing token is correct and adds no churn.

## 5. Tests to add / update (exact paths + cases)

`tests/components/v2/projects-v2-view.test.tsx`:

1. Add `data-testid="v2-brand-mark"` to the lockup container in `projects-v2-view.tsx`, then add a case "renders the v2 brand mark":
   - `const mark = screen.getByTestId("v2-brand-mark")`
   - `expect(mark).toHaveClass("rounded-[10px]")`
   - `expect(mark).not.toHaveClass("rounded-full")`
   - `expect(mark).toHaveClass("bg-gradient-to-br", "from-v2-link", "to-v2-lake")`
   - `expect(mark).toHaveClass("shadow-[0_2px_6px_rgba(27,88,71,.35)]")`
   - wordmark still present: `expect(screen.getByText("Wander Wallet")).toBeInTheDocument()`
2. Existing 7 cases stay valid unchanged (they do not assert the logo icon). "links to settings and new trip" still passes (`通用設定` link untouched).

`tests/components/v2/no-hardcoded-colors.test.ts`: no edit; must stay green.

## 6. Open questions / API gaps / UI-only items

- **Icon fidelity vs. lucide**: the new mark is not a stock lucide icon. Recommended: inline the exact design SVG in `projects-v2-view.tsx`. Alternative: `CreditCard`/`Wallet` at 19px (approximation, acceptable if the team prefers stock icons). UI-only; no API/data involvement.
- **Brand mark reuse**: this logo appears only in `MainCard3-njus.dc.html` across all v20261004 boards (verified by grep), so it needs no shared `brand-mark` component yet. If later boards adopt the same header, extract then.
- **Semantic token reuse**: gradient start uses `--v2-link`, semantically a link colour. Functionally exact; flag only if the team wants a dedicated brand token.
- **Dark mode**: no dark board provided; `from-v2-link to-v2-lake` yields `#6CC7AA → #4FB394` in dark (existing token values). Acceptable / proposal.
- No missing API, no DB, no schema. UI-only change.

## 7. v1 regression risks

- The change is confined to `components/v2/projects/projects-v2-view.tsx`, rendered only inside `UiV2Scope` via `projects-v2.tsx`; v1 uses `components/v1/projects/projects-v1.tsx` and is untouched.
- Do **not** touch `CoverThumb` / `CoverArt` / `lib/**` / `app/api/**`; nothing here requires it.
- Removing the `Compass` import touches only this v2 file; `Compass` remains used elsewhere only if another v2 file imports it (none do).
- Run `npm run test:run` (whole suite) + `npm run lint` + `npm run build`. v1 verification must stay empty:
  `git diff --name-only 36633e1 -- components/v1 components/ui components/expense components/location-picker.tsx app/api prisma lib/hooks/useExpenseFilters.ts lib/expense-split.ts lib/project-overview.ts lib/trip.ts`
