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
