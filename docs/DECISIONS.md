# Decision log — Holdings Hub Prototype

Running log of non-trivial decisions by the autonomous build agent. Format:
UTC timestamp — decision — rationale — alternatives considered.

## 2026-07-18T00:10Z — M1 kickoff decisions

- **Engine serialisation via draw counts, not raw generator state.** `pure-rand`'s
  generator state export/restore API surface is version-dependent; storing the
  stream seed plus an exact draw count and replaying on restore is
  version-proof, trivially JSON-serialisable, and exact because every public
  engine method consumes exactly one underlying draw. Alternative considered:
  `getState()`/`fromState()` — rejected for coupling session files to
  pure-rand internals. Trade-off: O(n) restore cost, negligible at simulation
  scale (thousands of draws).
- **Custom uniform distribution over `pure-rand` distributions.** The
  distribution helpers may consume a variable number of draws per call, which
  would break count-based restore. A single-draw float/int implementation has
  a negligible modulo bias (range ≪ 2^32) that is irrelevant for simulation
  (not cryptography).
- **Entitlements as a grants array** (`{relationship, assetClass, level}[]`)
  rather than nested records: simpler Zod typing with enum keys, easier to
  filter/merge, and directly renderable in entitlement UIs.
- **Node on build host is v24, CI pins Node 20.** Local builds on the Kali host
  use its Node 24; CI and Pages remain the source of truth on Node 20 LTS per
  plan. No compatibility issues expected for this toolchain; CI green is the
  gate.
- **Diagnostics store snapshot** limited to seed + engine state at M1 — the
  full session store arrives in M2 and the panel will grow with it.

## Milestone reflections

(Appended at the end of each milestone.)

## 2026-07-18T00:17Z — Toolchain upgraded to Vite 7 / Vitest 4 (stack substitution)

The plan locked Vite 5 + Vitest 1 (Section 35), but at implementation time
those lines carry unfixed security advisories that fail the `audit-ci
--moderate` quality gate: esbuild dev-server request hijack (GHSA-67mh-4wv8-2f99,
moderate), Vite dev-server file read (CVE-2026-39365, fixed only in 6.4.2+),
launch-editor (moderate) and a critical Vitest UI/API RCE
(GHSA-5xrq-8626-4rwp). All are dev-tooling only — the shipped static bundle
contains none of this code — but Section 3 requires confirming advisories at
implementation time and the gate must be green without allowlisting a
critical. Upgraded: vite ^7.3.6, vitest ^4.1.10, @vitejs/plugin-react ^5.
Alternatives considered: allowlisting the advisories in audit-ci (rejected —
hides a critical, violates M8 "no open moderate+" gate); Vite 8 (rejected —
newest major, plugin ecosystem still settling). App code unchanged; the only
code delta was `defineConfig` now importing from 'vitest/config'.

## 2026-07-18T00:45Z — M1/M2 reflections

- **M1 shipped** (v0.1.0-m1): all 11 deliverables; 28 unit tests; CI + Pages
  green; deployed URL smoke-checked. Deferred: nothing. Notable decision: Vite
  7 / Vitest 4 toolchain substitution (see above).
- **M2 shipped** (v0.2.0-m2): full vertical slice; 46 unit/integration tests,
  10 E2E specs green on Chromium + WebKit. Seeds used: 20260105 (slice).
  Known issues/deferrals: E2E cannot run on the Kali build host (browser
  system libraries need sudo) — GitHub Actions is the authoritative E2E gate;
  screening outcomes are rule-based until M4; D3 graph is SVG-only at current
  scale (canvas hybrid deferred until M3+ makes graphs large enough to need
  it); CSV audit export joins the M6 ZIP bundle.

## 2026-07-18T00:50Z — M3 decisions

- **Scenario presets as the wizard's backbone**: preset = entity template +
  persona template + portfolio (config-driven, Section 32). Custom free-form
  portfolio building deferred — presets cover the demo value; a "custom"
  preset would add form surface without new engine coverage.
- **DvP demo as one-click scripted transaction** rather than a bespoke
  multi-leg form: both legs are fixed by config (tokenised bond vs tokenised
  deposit), settlement applies both legs atomically in one mutation, audited
  as `holdings.dsvp-settled`.
- **Diagram definitions moved to config** (`src/config/diagrams.ts`,
  Zod-validated, edge endpoints checked in tests): payment, stablecoin (with
  Travel Rule annotation) and DvP sequence variants; renderer is now generic.

## 2026-07-18T05:35Z — M4 decisions (controls & compliance depth)

- **Explainable policy engine as pure functions** (`src/engine/policy.ts`):
  `evaluateTransaction` returns an ordered list of `PolicyDecision`s (ENT-001
  entitlement, LIM-001 per-transaction, LIM-002 same-day daily, APP-001
  four-eyes). Each decision is emitted as a `policy.<outcome>` audit event and
  rendered on the transaction detail view, so "blocked by rule X because Y"
  (PLAN Section 12) is literal. A blocking decision fails the transaction at
  validation before screening runs.
- **Four-eyes is embraced, not thresholded around.** The materiality threshold
  is `min(perTransaction, 100_000)`, so most institutional payments require an
  independent approver. Rather than raise the threshold to keep the M1–M3
  golden paths single-persona, the flows now switch to an independent control
  signatory before approving — the more faithful control and a better demo.
  `approveTransaction` rejects self-approval by the initiator and rejects
  personas lacking an `approve`/`admin` grant on the governing relationship.
- **Relationship mapping centralised in `relationshipForType`.** Discovered via
  the DvP integration test: `dsvp-settlement` is governed by the
  `tokenisation-agent` relationship (the portfolio-manager initiator holds it),
  not `payments`. Mapping to `payments` wrongly blocked DvP at ENT-001. One
  helper now serves both initiation entitlement and approval checks.
- **DeFi module is opt-in and entitlement-gated** (Section 13). The wizard adds
  an opt-in toggle; when on, the session persists `defiEnabled`, materialises
  two simulated positions (staking + LP) held `on-chain` outside the custody
  perimeter, and grants the primary persona a `defi` view entitlement. The
  `/defi` view shows an "outside Meridian custody perimeter" banner and
  config-driven protocol risk labels; the nav entry is hidden unless opted in;
  the control signatory (no `defi` grant) demonstrates the entitlement gate. No
  wallet connect, key handling or signing — ever.
- **`lastError` surfaced in the UI.** The store already captured mutation
  errors; the transaction detail view now renders them so a four-eyes rejection
  or policy block is visible to the user (and assertable in E2E).

### M4 reflection

- **Shipped** (targeting `v0.4.0-m4`): explainable policy decisions, per-tx +
  daily limits, four-eyes approvals, screening at validation, opt-in DeFi
  module. Gates green on Kali: lint, typecheck, prettier, 48 unit, 8
  integration, 6 schema, `audit-ci`, build; E2E (Chromium + WebKit) green in
  GitHub Actions incl. new `e2e/controls.spec.ts` (four-eyes, policy-block,
  DeFi opt-in). Policy unit coverage expanded to entitlement/limit/approval/
  relationship-mapping branches. Seeds: slice 20260105, DvP 20260319.
- **Known issues / deferred**: screening remains deterministic rule-based (name
  keywords) rather than seeded-probabilistic — sufficient for the demo and the
  M4 gate; a seeded variety pass is optional future work. Editable per-persona
  entitlement/limit overrides in the wizard remain deferred (templates only).
  Evidence Register expanded to 28 entries (+4: four-eyes/BCBS, sanctions
  screening/Wolfsberg, EU TFR crypto travel rule, FATF DeFi update).

## 2026-07-18T06:20Z — M5/M6 reflections (logged retrospectively)

These reflections were reconstructed from the shipped code and tags in build
session 2; session 1 tagged `v0.5.0-m5` and `v0.6.0-m6` without appending them.

- **M5 (`v0.5.0-m5`) — i18n + market data/calendar.** `i18next` +
  `react-i18next` wired; `scripts/translate.mjs` generates de/fr/ja bundles;
  `scripts/check-i18n-keys.mjs` enforces key parity in CI (missing/extra keys
  fail the build). CoinGecko live-price toggle added as a display overlay only
  with automatic deterministic fallback — sessions record which mode was active
  so the determinism claim is never affected by live data. Jurisdiction
  calendars drive routing settlement-date explanations. Gate: CI+E2E green incl.
  `check:i18n`; E2E in a non-English locale and a live-mode fallback test.
- **M6 (`v0.6.0-m6`) — Simulation Library + polish.** Full library UI
  (duplicate/rename/delete, JSON and ZIP bundle export); migrations exercised
  with a `v1` fixture; deep-link restoration (`#/open/:id`) with an import
  prompt fallback; diagnostics panel expansion; performance pass — `jszip` is
  dynamically imported so it code-splits out of the initial bundle. The M6
  deep-link E2E was initially red because it read the session id from the
  in-memory store, which is empty after a full reload; fixed to read from the
  IndexedDB-backed library page instead.

## 2026-07-18T06:25Z — M7 decisions (mobile companion + a11y completion)

- **Mobile companion reuses the store, not a parallel data layer.** The
  `/#/mobile` route (`src/features/mobile/MobilePage.tsx`) is a simplified
  single-column view scoped to a holdings summary plus payment
  initiation/approval only (PLAN Sections 28/44). It calls the same
  `useSessionStore` mutations (`switchPersona`, `approveTransaction`) as the
  desktop detail view, so the four-eyes control, audit events and determinism
  are identical — the companion is a view, not a second engine. Full mobile
  spec beyond this scope remains intentionally deferred (Section 44.2).
- **Full axe coverage as the accessibility gate.** `e2e/axe.spec.ts` now asserts
  zero serious/critical violations on every top-level route — public routes plus
  holdings, both payment forms, transactions, timeline, audit, graph, defi,
  mobile, and a transaction detail view. This is the automated backstop behind
  the manual `docs/A11Y-CHECKLIST.md` sign-off (no third-party audit, Section
  43/44).
- **Initiate actions are styled links, not `Button asChild`.** The design-system
  `Button` is a plain `<button>` with no Radix `Slot`/`asChild` support, so the
  companion's "New payment"/"New USDC" actions are `<Link>`s carrying the same
  button utility classes rather than nesting an anchor inside a button (which
  would be invalid and an axe violation).

### M7 reflection

- **Shipped** (targeting `v0.7.0-m7`): mobile companion route; full axe coverage
  on all routes; `A11Y-CHECKLIST.md` M7 sign-off (responsive/zoom, keyboard,
  screen-reader structural pass). `nav.mobile` added across en/de/fr/ja (key
  parity holds). New `e2e/mobile.spec.ts` drives the companion's summary +
  four-eyes approval end-to-end.
- **Known issues / deferred**: the companion is deliberately feature-limited
  (summary + payments); rich mobile holdings drill-down and diagram views stay
  out of scope. Screen-reader verification is a structural/axe-enforced pass,
  not a live NVDA/VoiceOver run (no assistive-tech hardware in the build
  environment) — documented as such in the checklist.

## 2026-07-18T06:45Z — M8 decisions (hardening + v1.0.0 release)

- **CSP injected at build time, not in the source HTML.** A build-only Vite
  plugin (`cspPlugin`, `apply: 'build'`) prepends the Content-Security-Policy
  meta tag so the deployed bundle is locked down (`default-src 'self'`, plus the
  CoinGecko origin in `connect-src` for the optional live-price overlay) without
  breaking Vite dev's inline HMR scripts. `style-src` keeps `'unsafe-inline'`
  because React and xyflow render inline style attributes; a static site has no
  script-injection sink — import is the only untrusted input and is Zod-parsed.
- **Import fuzz suite guards the one untrusted boundary** (`tests/schemas/
fuzz.test.ts`): hostile/malformed payloads are rejected via `safeParse`;
  `__proto__`/`constructor` payloads do not pollute `Object.prototype` (Zod
  strips unknown keys); a 10k-deep object is rejected without a stack overflow.
  The 5 MB size cap stays at the UI boundary (`LibraryPage`).
- **`security.yml` is the fourth workflow** (PLAN Section 39.4): weekly + on
  dispatch it runs `pnpm audit`, the `audit-ci` gate, the licence allowlist and
  the Google OSV scanner. OSV is skipped on PRs (it is the deep weekly triage;
  the deterministic `audit-ci` + licence gates run on PRs) so a transitive
  advisory never blocks a merge silently.
- **Licence gate without a new dependency.** `scripts/check-licenses.mjs` shells
  pnpm's built-in `pnpm licenses list --json --prod` and fails only on
  copyleft/network-copyleft production licences (permissive allowlist; unknowns
  warn, not fail) — no `license-checker` dependency, no network, no secret.
- **Evidence Register completed and mirrored.** Expanded to 40 real entries
  (M5–M8 additions: Intl/ECMA-402, CoinGecko, IndexedDB, WCAG 2.1, WAI-ARIA,
  axe-core, CSP, OWASP prototype-pollution, OSV, ASVS). `docs/evidence.json` is
  generated from the markdown by `scripts/build-evidence-json.mjs` so the two
  never drift.
- **Screenshots as CI artefacts.** `e2e/screenshots.spec.ts` captures the key
  routes (Chromium only) to `screenshots/`, uploaded by `e2e.yml` with
  `if: always()`. The live site remains the reference artefact; committing
  binary PNGs into the repo was rejected as history bloat.

### M8 reflection — project complete (v1.0.0)

- **Shipped** (`v0.8.0-m8` → `v1.0.0`): CSP, import fuzz tests, licence + OSV
  `security.yml`, completed Evidence Register (40 entries) + structured mirror,
  README hardening/testing/deploy/screenshots/status sections, per-route
  screenshot capture. All four workflows green; `audit-ci` clean; licence
  allowlist clean.
- **All eight milestones delivered** M1–M8, each tagged `v0.X.0-mX`, history
  preserved. The M2 vertical slice (Family Office CIO cross-border payment +
  USDC transfer) exercises wizard → holdings → transaction → route → Travel
  Rule → diagram → graph → timeline → audit end-to-end and is E2E-covered on
  Chromium + WebKit with a determinism replay.
- **Known deferred work** (carried into the Section 46 enhancement phase):
  seeded-probabilistic screening (currently rule-based); editable per-persona
  entitlement/limit overrides in the wizard; richer mobile drill-down;
  committed static screenshots; live NVDA/VoiceOver verification.
