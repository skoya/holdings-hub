# Accessibility checklist — WCAG 2.1 AA

Manual checklist (PLAN Section 22). Automated coverage: axe-core assertions in
Playwright from M2. Status keys: [x] done, [ ] pending, [~] partial.

## Baseline (M1)

- [x] Skip-nav link is the first focusable element and jumps to `#main`
- [x] Visible focus ring on every interactive element (`:focus-visible`, 2px accent outline)
- [x] Full keyboard operability of nav, chips, buttons, dialog
- [x] Radix Dialog: focus trap, ESC to close, ARIA role/labelling
- [x] `prefers-reduced-motion` respected globally (animations/transitions collapsed)
- [x] Landmark structure: header/nav, main, footer; single h1 per page
- [x] Disclaimer banner uses `role="note"` with an accessible label

## Colour contrast (token pairs used for text)

Contrast ratios (WCAG 2.1 formula), all pairs used for body/text content:

| Foreground             | Background         | Ratio  | AA (normal text)                             |
| ---------------------- | ------------------ | ------ | -------------------------------------------- |
| `--ink` #16181d        | `--panel` #ffffff  | 17.9:1 | pass                                         |
| `--ink` #16181d        | `--bg` #f4f5f7     | 16.5:1 | pass                                         |
| `--ink-soft` #5a6270   | `--panel` #ffffff  | 5.7:1  | pass                                         |
| `--ink-soft` #5a6270   | `--bg` #f4f5f7     | 5.3:1  | pass                                         |
| #ffffff                | `--dark` #171a21   | 17.0:1 | pass                                         |
| #ffffff                | `--dark-2` #20242e | 14.5:1 | pass                                         |
| `--banner-ink` #231a02 | `--banner` #f0b429 | 9.4:1  | pass                                         |
| `--accent` #d81f2a     | `--panel` #ffffff  | 4.9:1  | pass (used for accents/links, not body text) |

Policy: `--accent` on `--panel` is reserved for accents, borders, badges and
link text — never body copy (PLAN Section 5).

## M7 — completion (signed off 2026-07-18)

- [x] axe-core assertions on **every** top-level route — no serious/critical
      violations. `e2e/axe.spec.ts` covers the public routes (`/`, wizard,
      styleguide, library) and all session routes: holdings, transactions,
      both payment forms, timeline, audit, graph, defi, mobile, and a
      transaction detail view. Verified green on Chromium + WebKit in CI.
- [x] Mobile companion route (`/#/mobile`): single-column responsive layout,
      holdings summary + payment initiation/approval only (PLAN Sections 28/44).
      Reuses the shared store, so the four-eyes control and audit trail are
      identical to desktop; covered by `e2e/mobile.spec.ts` and by axe.
- [x] Responsive audit across breakpoints. Layout is fluid: the nav wraps
      (`flex-wrap`) rather than overflowing; `main` is `max-w-6xl` with padding;
      grids collapse to a single column below `sm` (`grid sm:grid-cols-3`);
      wide tables scroll within `overflow-x-auto` containers; the mobile
      companion caps at `max-w-md`. No fixed-width layouts; no horizontal page
      scroll at 320px. Reflow holds at 200%/400% zoom because all sizing is
      rem/utility-based with no absolute positioning of content.
- [x] Keyboard walkthrough: skip-nav → nav (roving `NavLink`s) → main content;
      wizard advances via the `Next` button, transactions validate/approve/route
      via buttons and a labelled persona `<select>`, all reachable and operable
      by keyboard with visible `:focus-visible` rings. Radix Dialog traps focus
      and closes on ESC.
- [x] Screen-reader structural pass: single `<h1>` per route; landmark regions
      (`header`/`nav[aria-label="Primary"]`, `main#main`, `footer`); the
      disclaimer uses `role="note"`; policy/approval errors use `role="alert"`;
      every `<select>` and icon-only control carries an `aria-label` or
      associated `<label>`. axe-core enforces name/role/value, contrast and
      landmark rules on every route as the automated backstop (no third-party
      audit — PLAN Section 43/44).
