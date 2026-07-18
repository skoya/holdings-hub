# Holdings Hub Prototype — Meridian Bank (fictional)

> **Simulation only — no real transactions or investment advice.**

A fictional, GSIB-neutral static SPA demonstrating how a global systemically
important bank could act as the authoritative orchestration and trust hub
across traditional finance, regulated digital assets, tokenised finance and
(opt-in) DeFi. The institution shown — **Meridian Bank** — is fictional; no
affiliation with any real bank.

**Live:** https://skoya.github.io/holdings-hub/

The prototype never executes a real trade or transfer, never connects a
wallet, and never touches keys or production credentials. All identifiers are
deliberately fictional (`SIM-` prefixed LEIs, invalid-by-design IBANs).

## Stack

React 18 · Vite 5 · TypeScript (strict) · Tailwind 3 · Zustand · Zod ·
`pure-rand` (seeded deterministic engine) · localforage · Radix UI ·
React Router (`HashRouter`) — see `docs/adr/` for decision records.

## Develop

```bash
pnpm install
pnpm dev          # local dev server
pnpm test:unit    # vitest
pnpm lint && pnpm typecheck && pnpm format:check
pnpm build        # static build in dist/
```

Node ≥ 20, pnpm 9.

## Determinism

All simulated randomness flows through a seeded engine
(`src/engine/prng.ts`); `Math.random()` is banned by lint rule. Same seed +
same actions ⇒ identical holdings, screening outcomes, ids and audit log.
Engine state serialises into the exported session JSON.

## Documentation

- `docs/DECISIONS.md` — running decision log and milestone reflections
- `docs/adr/` — architecture decision records
- `docs/EVIDENCE.md` — register of real-world references behind the concepts
- `docs/A11Y-CHECKLIST.md` — WCAG 2.1 AA checklist and contrast table

## Status

Milestone 1 (foundation): design system, deterministic engine, schemas,
persistence, CI + GitHub Pages deploy. See the plan's milestone list for what
lands next (vertical slice: Family Office CIO cross-border payment + USDC
transfer).
