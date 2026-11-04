---
target: "http://localhost:3000/demo/expense-prototype?mode=after"
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:/Users/kewos/Documents/projects/wander-wallet/app/demo/expense-prototype"
timestamp: 2026-10-12T17-37-06Z
slug: app-demo-expense-prototype
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|:--:|---|
| 1 | Visibility of System Status | 3 | `金額相符 ✓`, `≈`, `aria-pressed`, `10/11` summary are strong; but the footer 顯示幣別 toggle silently re-renders the 分帳 card 600px above it with no cue. |
| 2 | Match System / Real World | 3 | Vocabulary is excellent, but the two identical pill rows violate the real-world "money out ≠ money in" distinction the screen teaches. |
| 3 | User Control and Freedom | 3 | `還原自動平分`, 取消 on both confirms, Esc + backdrop close, 全選. No undo after submit. |
| 4 | Consistency and Standards | 3 | Internally consistent — but the dotted underline is used for *both* money-buttons and the `＋加入` link, blurring the affordance. |
| 5 | Error Prevention | 3 | Good destructive confirms, disabled submit; but the required-field error fires on empty load, before any interaction. |
| 6 | Recognition Rather Than Recall | 2 | Editable numbers are signalled only by a faint dotted underline + a paragraph two rows above; the footer toggle's meaning must be inferred. |
| 7 | Flexibility and Efficiency | 2 | Correct equal-split defaults; no bulk entry, no equal-split reset outside the sheet — power users open a sheet per member. |
| 8 | Aesthetic and Minimalist Design | 3 | The before→after consolidation is a win; the two identical pill rows reintroduce the ambiguity the merge removed. |
| 9 | Error Recovery | 3 | `零頭 由 … 吸收`, confirm copy states the consequence, `role="alert"` — strong. |
| 10 | Help and Documentation | 3 | Inline helper per section, example placeholder `一蘭拉麵晚餐`; the footer toggle is explained only by its own two-char label. |
| **Total** | | **28/40** | **Good** (low end) |

## Design Specificity Verdict

**LLM**: Mostly authored — except the core of the 分帳 panel, which is category-interchangeable. Authored evidence: `先墊錢的人`, `個人項目`, `零頭 $X 由 我、阿凱 吸收`, the `≈` settlement preview, the `市場` rate chip, serif headings on a deep-green money card. Interchangeable: the `誰付這筆` pill row + `共同分攤` pill row + `成員/個人項目/共同分攤/小計` table is a Splitwise-shaped pattern any splitter could ship — and the two rows are byte-identical, so the one part that most needs a product opinion (who paid vs who owes) carries none.

**Deterministic scan**: file-mode **clean (0 findings)**. Runtime is **exit 2 at every viewport: 10 findings at 390×844 and 320×844, 9 at 1280×800** — `low-contrast` ×5 (`3.6:1 #2f8f74 on #eaf5f1`, `4.1:1 #6b7a3a on #eef0e1`, `4.4:1 #4a6fa5 on #e8eef7`, `3.5:1 #9c7a28 on #f7efdd`, `3.5:1 #c4602f on #fbeae0`), `undersized-ui-text` ×2 (10px `市場`, `今天`), `tiny-text` ×1 (11px — one fewer than last run, after the demo's 11px→12px bump), `nested-cards` ×1, `body-text-viewport-edge` ×1 (narrow only). **No horizontal overflow at any width** (CDP: scrollWidth == innerWidth at 390/320/1280; 0 clipped elements).

**Visual overlays**: unavailable — no browser tool with mutation/`evaluate` this session. Fallback: headless Chrome + raw DevTools Protocol measurement.

## Overall Impression

The math engine and the amount sheet are the stars and the amount sheet is the best-executed interaction on the page (`autoFocus` + pre-select + live `自動平分會是 $320`). The default equal-split case is solved in zero taps. The drag is orientation at the 分帳 workspace: two identical pill rows, an affordance you can't see in daylight, and a footer control that reshapes a card 600px above it. **Score is flat vs last run (28 → 28)** — the P1-a revert put the biggest issue back on the board.

## What's Working
1. **The default state solves the common case in zero taps** — one payer, all four pooling, equal split, `金額相符 ✓`. The 90% case is never punished.
2. **`AmountSheet` is a model micro-interaction** — `autoFocus` + `select()` on open, live `自動平分會是 $320`, and `還原自動平分` only when pinned.
3. **Money math is surfaced, not hidden** — `零頭 $X 由 … 吸收`, the `≈` settlement rendering, and the `市場 · 1 JPY = 0.215 TWD` chip.

## Priority Issues

**[P1] The two 成員 pill rows are visually identical and mean opposite things.** Both render the same `memberPillClass`, same avatar, same ~27px height, same selected state (the differentiation was reverted at the user's request). The single highest-consequence decision on the form (money out vs money in) has only a muted 12px label above each row; a wrong tap silently corrupts the split while `金額相符 ✓` stays green — false reassurance. → *Fix*: opposite visual grammars — payer row single-select (ring / `付款` tag), sharer row multi-toggle (tinted fill + check). `/impeccable layout`

**[P1] The split panel is unlabeled to assistive tech; each sheet leaks focus; many tap targets are small.** `fieldsets: 0, legends: 0`; neither pill row has `aria-labelledby`; `PersonalItemsSheet`/`AmountSheet` are `aria-modal` but trap no focus and restore none on close (Tab escapes into the footer submit). Measured: pills ~27px tall, `＋加入` 42×20, amount button 93×28, footer toggle 40×20, delete-item 24×24; **32 of 38 interactive controls are under 44px** (several are demo chrome). → *Fix*: wrap each row in `role="group"`/`fieldset` with `aria-labelledby`; add focus trap + return-focus to both sheets; enforce `min-h-[44px]` on pills, `＋加入`, amount buttons, footer toggle, delete buttons. `/impeccable adapt`

**[P2] Editable amounts are discoverable only via a faint dotted underline.** `amountButton` is `underline decoration-dotted decoration-v2-check`, and the `＋加入` link uses the *same* style. On a travel app used outdoors, the dotted underline disappears and `$320` reads as static output. → *Fix*: give a resting affordance (pencil/chevron or a `可調整` chip), raise the underline to a solid 1px in `v2-lake`, and differentiate `＋加入` so "edit a number" ≠ "add a line". `/impeccable clarify`

**[P2] The footer 顯示幣別 toggle silently turns the 分帳 card read-only.** Switching to `TWD` un-renders 多人付款 / 全選 / 個人項目 and replaces every amount button with a static `≈` span — 600px above the control, no motion or scroll. A user can flip one char in the footer and think the page broke. → *Fix*: put the toggle on the 分帳 heading, or keep all controls mounted and only swap the values to `≈`. `/impeccable layout`

**[P3] Premature validation + undersized confirms.** The red `請填寫描述` renders on first paint before the field is touched; the confirm buttons (`確定關閉` / `取消`) are ~26px. → *Fix*: gate the message on `touched || submitAttempted`; give both confirms `min-h-[44px]`. `/impeccable harden`

## Persona Red Flags

**Casey (one-handed mobile)** — the footer submit and both sheets are thumb-friendly, but the 分帳 workspace is thumb-hostile: sharer pills 27px, `＋加入` 20px, `共同分攤` amounts 28px, footer `JPY/TWD` 20px. With two identical pill rows, a wrong thumb tap is easy and silent.

**Sam (accessibility)** — screen reader hears `分帳` → loose text → four pressed/unpressed buttons with **no group label** → `共同分攤` → another four identical buttons; cannot tell the payer set from the sharer set. Opening `我的個人項目` moves no focus, so Tab walks behind the modal. *Credit*: amount buttons carry excellent labels (`調整我的共同分攤金額（目前 $320）`).

**Jordan (first-timer)** — two chip rows that look the same ("which one did I just press?"), then a footer `顯示幣別 JPY | TWD` with no explanation; toggling it makes the split card abruptly lose its `＋加入` and number affordances. The only scaffolding is the paragraph *below* both rows.

## Minor Observations
- Table rows repeat member identity twice (avatar cell + name cell, e.g. avatar "我" beside text "我").
- `PersonalItemsSheet` doesn't autofocus its first input while `AmountSheet` does — inconsistent sheet entry.
- The 分帳 helper paragraph wraps to two lines directly above the table.
- Multi-payer auto-split `426/427/427` rounding isn't explained in that view (only the pool split explains `零頭`).
- `選填` summary shows `10/11` while the field renders `2026/10/11（日）` — two date formats for one value.
- Submit label pinned to `state.currency` (says JPY) even when the footer previews TWD.
- The rate row is a 26px-tall trigger opening a full-height sheet.
- *Harness, not product:* 改前/改後, 重設, `← Demo 目錄`, the intro paragraph, the floating button.

## Questions to Consider
1. If the payer row and sharer row are intentionally identical, what single visual signal tells a user at a glance whether money is leaving or arriving — and why isn't it on screen?
2. The footer toggle reshapes a card 600px above it. Name one screen in this product where a control's effect is more displaced — if you can't, why is this the exception?
3. A dotted underline that vanishes in sunlight is not an affordance, it's a secret. How does a first-timer learn `$320` is editable without reading the paragraph?
4. The same four members are drawn three times (payer pills, sharer pills, table rows). If you had to delete one rendering, which survives?
