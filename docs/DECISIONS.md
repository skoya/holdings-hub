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
