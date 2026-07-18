# Enhancement backlog — Holdings Hub v1.0.0

Produced by the Fable enhancement review (PLAN Section 46) on 2026-07-18, after
an independent read of the shipped v1.0.0 code, `docs/DECISIONS.md` (including
the logged deferrals), the engine (`src/engine/*`), the session store, the
feature surfaces and the E2E suite.

Review lens: value when demoing to a GSIB stakeholder. Every item respects the
hard constraints — no real wallet signing, key handling or live transactions;
all randomness through the seeded engine (`src/engine/prng.ts`), never bare
`Math.random`; fully static GitHub Pages deployment; anything config-shaped
stays config-driven (`src/config/*`).

Complexity: S (hours) / M (a day-ish) / L (multi-day) / XL (a milestone).
Category: new capability / improves existing / fixes debt.

---

## Group A — M2 slice narrative (payment + USDC demo impact)

### 1. Rail economics: all-in cost and "beneficiary receives" comparison

- **Description**: The route comparison table shows raw `costBps` /
  `fxSpreadBps` / `feeFlat`, but never answers the question a treasurer
  actually asks: *"how much arrives, and what did it cost me, on each rail?"*
  Capture an indicative FX rate at transaction creation (one seeded draw from
  the `market` stream, stored on the transaction so rendering stays pure), then
  derive per-route all-in cost and estimated beneficiary-receives amounts, and
  render a delta line ("USDC rail delivers ~X more CHF and settles in minutes
  vs T+2"). This turns the existing comparison into the core GSIB value-prop
  slide.
- **Complexity**: S
- **Value to demo**: High
- **Category**: improves existing
- **Sketch**: `src/stores/sessionStore.ts` (`createPayment`: draw
  `fxRate(engine.fork('market'), 'GBP', targetCurrency)` once, store as string
  in `tx.metadata.indicativeFxRate` — `metadata` is already
  `z.record(z.string())`, so no schema change); new pure helper
  `src/engine/routing.ts` (`routeEconomics(option, amount, fxRate)` returning
  fees, spread cost, received amount); render in
  `src/features/transactions/TransactionDetailPage.tsx`. Tests: unit for the
  helper, extend `tests/integration/sliceFlow.test.ts` and `e2e/slice.spec.ts`.

### 2. Seeded-probabilistic screening with scored, explainable results

- **Description**: Logged deferral, now prioritised. Screening is keyword
  rule-based (`sanction|embargo|blocked`, `review|pep`). Keep the keyword rules
  authoritative (so scripted demos never surprise), but add a seeded layer from
  a dedicated `screening` engine stream: a match score (e.g. 0–100 fuzzy-name
  similarity), a simulated list reference picked from a config-driven list
  catalogue, and seeded variety in the clear/review band. Hard blocks remain
  keyword-only so golden paths cannot randomly fail. Result: screening looks
  like a real scored engine, not a stub, and doubles as a determinism showcase
  (same seed → same scores).
- **Complexity**: M
- **Value to demo**: High
- **Category**: fixes debt (logged deferral)
- **Sketch**: `src/engine/screening.ts` (accept a `Stream`; config-driven list
  catalogue could live in `src/config/catalog.ts` or a new
  `src/config/screening.ts`); `src/schemas/index.ts` (add optional
  `matchScore`, `listRef`, `method` to `ScreeningResultSchema` — optional, so
  no migration); `src/stores/sessionStore.ts` (`validateTransaction` passes
  `engine.fork('screening')`); richer rendering in
  `TransactionDetailPage.tsx` screening card. Tests: extend
  `tests/engine/modules.test.ts` (determinism of scores, keyword precedence),
  `e2e/controls.spec.ts`.

### 3. Travel Rule packet: structured IVMS-style view + simulated exchange acknowledgement

- **Description**: The Travel Rule packet renders as raw `JSON.stringify` in a
  `<pre>`. Replace it with a structured originator/beneficiary/VASP field
  table styled after IVMS 101 groupings, plus a simulated
  "packet exchanged / acknowledged by beneficiary VASP" status line (timestamp
  from the session clock — no network, no real VASP). Keeps the compliance
  story readable for non-engineers in the room.
- **Complexity**: S
- **Value to demo**: Medium
- **Category**: improves existing
- **Sketch**: presentation-only refactor of the Travel Rule card in
  `src/features/transactions/TransactionDetailPage.tsx` (keep the raw JSON
  behind a details/disclosure for the technical audience); optional
  `acknowledgedAt` derived from `exchangedAt` — or purely presentational to
  avoid any schema touch. Tests: extend the USDC test in `e2e/slice.spec.ts`.

---

## Group B — Controls & compliance depth

### 4. Funds-sufficiency policy rule (FND-001)

- **Description**: `evaluateTransaction` checks entitlement (ENT-001), limits
  (LIM-001/002) and four-eyes (APP-001), but never checks the funding holding —
  `runSettlement` will happily debit a holding negative. Add FND-001: block at
  validation when `amount + estimated fees` exceeds the funding holding's
  quantity, with the standard explainable decision text. Fixes a real
  correctness gap and adds a third demonstrable "blocked by rule X because Y"
  path.
- **Complexity**: S
- **Value to demo**: High
- **Category**: fixes debt
- **Sketch**: `src/engine/policy.ts` (new decision in `evaluateTransaction`
  using `session.holdings` lookup by `tx.assetRef`; pure, no draws);
  surfaced automatically by the existing policy-decision card and audit
  events. Tests: extend `tests/engine/policy.test.ts` (pass/block branches),
  add an over-balance case to `e2e/controls.spec.ts`.

### 5. Editable per-persona entitlement & limit overrides in the wizard

- **Description**: Logged deferral. Personas today come solely from templates.
  Add a wizard step (or expandable panel on the persona step) to adjust the
  primary persona's per-transaction/daily limits and toggle grants, seeded
  from the template and Zod-validated. Lets a stakeholder ask "what if the CIO
  could only initiate, not approve?" and see the policy engine react live.
- **Complexity**: M
- **Value to demo**: Medium
- **Category**: new capability (logged deferral)
- **Sketch**: `src/features/wizard/wizardStore.ts` + `WizardPage.tsx` (override
  state, defaulted from `personaTemplate`); `src/stores/sessionStore.ts`
  (`createSliceSession` consumes overrides from `WizardInput`); templates in
  `src/config/catalog.ts` stay the config-driven baseline. Tests: wizard-flow
  E2E variant showing an override changing a LIM-001/ENT-001 outcome.

### 6. Payment return/recall demo path

- **Description**: The lifecycle schema and diagram include a `returned`
  terminal state, but no flow ever reaches it. Add a "simulate return" action
  on an in-flight/settled SWIFT payment: seeded return reason picked from a
  config list (compliance recall, account closed, invalid beneficiary),
  holdings re-credited minus a return fee, full audit trail. Demonstrates the
  ugly path GSIB operations people always ask about — and contrasts it with
  stablecoin-rail finality.
- **Complexity**: M
- **Value to demo**: Medium
- **Category**: new capability
- **Sketch**: `src/stores/sessionStore.ts` (new `returnTransaction` action:
  transition to `returned`, reason via `engine.fork('returns')` +
  config list, re-credit mutation + audit events); button on
  `TransactionDetailPage.tsx` gated to the SWIFT rail; reason list in
  `src/config/catalog.ts`. Tests: integration test mirroring
  `tests/integration/sliceFlow.test.ts`; E2E in `golden.spec.ts` or a new spec.

### 7. Audit chain verification view ("tamper-evident audit")

- **Description**: Every audit event already carries a `snapshotHash` of the
  session state. Add a "Verify audit trail" action on the audit page that
  recomputes the current snapshot hash, checks event ordering/id integrity,
  and renders a green "verified" (or red mismatch on a doctored imported
  session). Turns an invisible engineering property into a 10-second
  governance demo.
- **Complexity**: M
- **Value to demo**: Medium
- **Category**: new capability
- **Sketch**: pure verifier in `src/engine/hash.ts` or a new
  `src/engine/auditVerify.ts` (recompute via the existing `hashObject`
  convention used by `snapshotHash` in `src/stores/sessionStore.ts` — export
  that helper); UI in `src/features/audit/AuditPage.tsx`. Tests: unit test
  with the fixture in `tests/fixtures/session.ts` plus a tampered copy.

---

## Group C — Reach & platform debt

### 8. i18n coverage completion for transaction and wizard surfaces

- **Description**: The i18n framework (i18next, key-parity CI gate, generated
  de/fr/ja bundles) is solid, but the transaction pages
  (`NewPaymentPage`, `NewUsdcPage`, `TransactionDetailPage`) and parts of the
  wizard render hardcoded English — switch to French and the core demo flow
  stays English. Move these strings into the locale bundles and regenerate.
- **Complexity**: M
- **Value to demo**: Medium (High if the stakeholder audience is non-UK)
- **Category**: fixes debt
- **Sketch**: `useTranslation` in
  `src/features/transactions/*.tsx` + `src/features/wizard/WizardPage.tsx`;
  keys added to `src/i18n/locales/en.json`, regenerated via
  `scripts/translate.mjs`; `scripts/check-i18n-keys.mjs` gate keeps parity.
  Care: E2E selectors that match English strings (`getByLabel('Amount (GBP)')`,
  button names) must move to test-ids or run under `en`. Tests: extend
  `e2e/i18n.spec.ts` to walk the payment form in a non-English locale.

### 9. Richer mobile companion drill-down

- **Description**: Logged deferral. The `/#/mobile` companion is summary +
  payment initiation/approval only. Add per-holding drill-down (valuation,
  custody location, source-of-truth badge) and a compact transaction list with
  status chips — same store, still a view-only companion, no parallel data
  layer.
- **Complexity**: M
- **Value to demo**: Medium
- **Category**: improves existing (logged deferral)
- **Sketch**: `src/features/mobile/MobilePage.tsx` (accordion or sub-route per
  holding; reuse `useSessionStore` selectors and existing Badge/Card
  components). Tests: extend `e2e/mobile.spec.ts`; keep `e2e/axe.spec.ts`
  green on the expanded view.

### 10. Custom free-form portfolio builder

- **Description**: Logged deferral. A "custom" scenario preset whose portfolio
  step lets the user compose holdings from the full Zod-validated asset
  catalogue (asset, quantity, custody location, authoritative source), with
  deterministic valuation through the existing `market` stream. Highest-effort
  item here; valuable when a stakeholder wants to mirror *their* book live in
  the room.
- **Complexity**: L
- **Value to demo**: Medium
- **Category**: new capability (logged deferral)
- **Sketch**: new wizard portfolio step in `src/features/wizard/` writing the
  same `[assetRef, quantity, custody, source]` tuples the presets use
  (`src/config/catalog.ts` `ScenarioPreset.portfolio`), so
  `createSliceSession` needs only to accept an optional portfolio override;
  guardrails (max rows, catalogue-only assets) enforced by schema. Tests: new
  E2E golden path + unit tests on the portfolio schema.

### 11. Scenario share links (URL-encoded wizard parameters)

- **Description**: Deep-linking exists for saved sessions (`#/open/:id`), but
  demos start from a wizard walk. Encode wizard inputs (preset, seed, names,
  DeFi opt-in) into a `#/wizard?config=…` link so a prepared scenario can be
  handed to a stakeholder as a URL that deterministically rebuilds the exact
  session on any machine — a strong artefact of the determinism guarantee, and
  fully static.
- **Complexity**: M
- **Value to demo**: Medium
- **Category**: new capability
- **Sketch**: Zod-validated (reuse `WizardInput` shape) base64url param parsed
  in `src/features/wizard/WizardPage.tsx` / `wizardStore.ts` to prefill or
  auto-create; "Copy scenario link" button post-creation. Untrusted input →
  same `safeParse` discipline as session import; extend
  `tests/schemas/fuzz.test.ts` with hostile config params. Tests: E2E
  round-trip (create → copy link → fresh context → identical engine hash).

### 12. Visual regression snapshots in CI

- **Description**: Committed static screenshots were rejected as repo bloat
  (M8 decision) — the underlying need is catching visual regressions. Use
  Playwright's `toHaveScreenshot` on 3–4 key routes (Chromium only, fixed
  viewport, seeded session so pixels are deterministic) with baselines stored
  as CI artefacts or a dedicated branch rather than main-branch history.
- **Complexity**: M
- **Value to demo**: Low (protects the demo rather than enhancing it)
- **Category**: fixes debt (logged deferral, re-scoped)
- **Sketch**: extend `e2e/screenshots.spec.ts`; baseline management in
  `.github/workflows/e2e.yml`. Risk: font rendering drift across runners —
  pin the runner image and mask volatile regions.

---

## Suggested build order

1 → 4 → 2 (this session's best value/complexity band), then 3, 5, 6, 7 as the
next controls-depth wave, then 8/9/11 for reach, with 10 and 12 as scheduled
larger slots.
