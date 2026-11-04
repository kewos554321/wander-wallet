---
target: "http://localhost:3000/demo/expense-prototype?mode=after"
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:/Users/kewos/Documents/projects/wander-wallet/app/demo/expense-prototype"
timestamp: 2026-10-12T17-17-28Z
slug: app-demo-expense-prototype
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|:--:|---|
| 1 | Visibility of System Status | 3 | `✓ 金額相符` + live `剩餘` update well; the 個人項目 mode's effect on the math is invisible until you read a muted 11px helper. |
| 2 | Match System / Real World | 4 | zh-TW split vocabulary is precise and domain-correct (`先墊錢的人` / `共同分攤` / `零頭…吸收`). |
| 3 | User Control and Freedom | 3 | `還原自動平分` + `取消全選` good; but `個人項目` OFF silently drops entered items from the math with no confirm, while `多人付款` OFF does confirm. |
| 4 | Consistency and Standards | 2 | Two identical pill rows mean different things; tappable amounts look static; switch hit areas inconsistent with pill buttons. |
| 5 | Error Prevention | 3 | Required 描述 (inline error + disabled submit), confirm on 多人付款 OFF, `有個人項目未填寫名稱` validation — but no guard when disabling 個人項目 with data. |
| 6 | Recognition Rather Than Recall | 2 | The only cue for "tap the amount / tap 加入" is one 11px line below the table; the two pill rows must be disambiguated from memory. |
| 7 | Flexibility and Efficiency | 3 | Per-member amount sheet with pre-selected input is efficient; no equal/unequal/percent presets. |
| 8 | Aesthetic and Minimalist Design | 3 | Leaner than "before"; but `個人項目` is double-encoded (switch label ≡ column header) and `小計` is a no-op column until items exist. |
| 9 | Error Recovery | 3 | Plain-language errors; `有個人項目未填寫名稱` points at the sheet, not the offending field. |
| 10 | Help and Documentation | 2 | Placeholder + one helper line; nothing persistent explains payer-row vs share-row, and the helper sits below the fold. |
| **Total** | | **28/40** | **Good** (low end) |

## Design Specificity Verdict

**LLM**: Mostly authored, riding a generic shell. The *split model* is unmistakably Wander Wallet — the reading order mirrors the real math (`誰付這筆 → 共同分攤/剩餘 → per member → result`), 個人項目 is deducted first, `零頭…吸收`, and the rate row opens the untouched `RateSheet`. The chrome around it (amount card → 描述 → 類別 chips → card → 選填 → fixed footer) is the standard mobile-fintech skeleton, and the two member-pill rows are literally the *same* component. The specific part is good; the shell is category-interchangeable.

**Deterministic scan**: file-mode scan is **clean (0 findings)** — expected, since the runtime rules are DOM/layout/contrast-based. The runtime scan is **exit 2** at every viewport: **11 findings at 390×844 and 320×844, 10 at 1280×800** — `low-contrast` ×5 (`3.6:1 #2f8f74 on #eaf5f1`, `4.1:1 #6b7a3a on #eef0e1`, `4.4:1 #4a6fa5 on #e8eef7`, `3.5:1 #9c7a28 on #f7efdd`, `3.5:1 #c4602f on #fbeae0`), `tiny-text` ×2 (11px), `undersized-ui-text` ×2 (10px `市場`, `今天`), `nested-cards` ×1, `body-text-viewport-edge` ×1 (narrow only).

**Visual overlays**: unavailable — no browser tool with mutation/`evaluate` in this session, so no `[Human]` overlay was injected. Fallback: headless Chrome + raw DevTools Protocol measurement.

## Overall Impression

The split engine is the star and the layout now stays out of its way — the amount sheet, `個人項目`-first order, and `剩餘`/`金額相符` reconciliation read as designed for this product. The remaining drag is affordance and duplication in the 分帳 card: two identical pill rows, and amounts/`加入` that look like static text, so the core advanced action is only discoverable via an 11px line below the table. There is no P0; nothing blocks the task.

## What's Working
1. **The split card's order is the actual algorithm** — you can read down the card and understand the math.
2. **個人項目 collapsed into a per-member bottom sheet** with the card showing only the sum — removes inline clutter and reuses the rate-sheet pattern.
3. **選填 as a one-line summary** (`10/11`) keeps the default screen focused; **the footer 原/結算 toggle** correctly collapses the old per-card currency chips into one control.

## Priority Issues

**[P1] Two visually identical member-pill rows (`誰付這筆` vs `共同分攤`).** Same component, same order, same style; only a 12px caption and a switch differ. This is the biggest error surface on the screen — you can silently alter who paid vs who owes. → *Fix*: give the payer row a distinct identity (a leading `先墊` chip, or render payers as one avatar + `＋`), so they read as different objects. `/impeccable layout`

**[P1] Interactive amounts don't look interactive.** `共同分攤` values are bold text buttons with only a `hover:` bg (no hover on touch); `加入` is a plain link. The core "fix one share, the rest auto-split" action is undiscoverable without the 11px line below the table. → *Fix*: give amounts an edit affordance (dotted underline / small pencil / subtle pill) and move the hint into the column header. `/impeccable clarify`

**[P2] Tiny tap targets; 35 of 38 controls are under 44px.** Measured: `多人付款`/`個人項目` toggles 24×14, `取消全選` 48×16, the 選填 summary button 19.5 tall, member chips 26.5 tall, rate/chip/CTA-adjacent controls all under 44. Switches also lack `focus-visible` rings and their `<label>` wrappers are inert. → *Fix*: pad hit areas to ≥44×44, add focus rings, make the label toggle the switch. `/impeccable adapt`

**[P2] Contrast + tiny functional text (detector).** 5 `low-contrast` pairs (3.5–4.4:1) and 10–11px functional text (`市場`, `今天`, helper lines). → *Fix*: raise to ≥4.5:1 and move functional text off 10–11px. `/impeccable typeset`

**[P2] Destructive toggles handled inconsistently.** `多人付款` OFF (>1 payer) shows a red confirm; `個人項目` OFF (with entered items) shows nothing and silently excludes them from the math. → *Fix*: mirror the confirm (`關閉將忽略 N 筆個人項目`) or keep a persistent count badge. `/impeccable harden`

## Persona Red Flags

**Jordan (first-timer)** — reaches 分帳 and stalls: two rows of the *same* four pills, each with a switch; the only explanation is a 12px muted caption below the table. Likely failure: leaves 共同分攤 at default and never discovers 個人項目.

**Casey (one-handed mobile)** — submit is thumb-reachable (`新增支出 · JPY 1,280`, good); but the 多人付款/個人項目 switches are ~14px-tall mid-scroll targets, and toggling 個人項目 reflows the table (adds two columns) so a mis-tap visibly jumps the layout. Editing a share means tapping a static-looking `$320` first.

**Sam (accessibility)** — good `role="switch"`/`aria-checked`, dialog `aria-modal` + Esc, amount sheet `autoFocus`+`select()`, `aria-pressed` pills. Gaps: no focus trap in either bottom sheet; no `focus-visible` on switches; the 描述 error `<p>` isn't `aria-describedby`/`aria-invalid`; `✓ 金額相符` isn't a live region; pill avatars announce duplicate names ("我 我").

## Minor Observations
- `✓ 金額相符` uses the link accent (`text-v2-link`) for a *status* — reads as tappable.
- `個人項目` is both the switch label and the column header.
- `小計` duplicates `共同分攤` exactly until items exist (P3 noise / a fourth column).
- Payer amount rows use the same `bg-v2-lake-soft` fill as the shared table — two look-alike tables stacked.
- The success line conflates payer + share reconciliation; wraps long when a remainder is absorbed.
- The 選填 summary `10/11` has no field name.
- *Harness, not product:* `← Demo 目錄`, 改前/改後, 重設, the intro paragraph, the floating button.

## Questions to Consider
1. If the payer row and share row are the same members in the same order, why two rows — what breaks with one row per member and two states (paid / owes)?
2. When 個人項目 is OFF, where does the user believe their entered items went?
3. Does `✓ 金額相符` reassure about the total, or only the shares?
4. Why does 多人付款 OFF confirm while 個人項目 OFF — the more destructive — does not?
