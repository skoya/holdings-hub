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

## Deferred to later milestones

- [ ] axe-core assertions on every top-level route (M2+, completed M7)
- [ ] Responsive/zoom audit at 200% and 400% (M7)
- [ ] Full manual keyboard walkthrough of wizard and transaction flows (M2–M7)
- [ ] Screen-reader pass (VoiceOver/NVDA) on golden paths (M7)
