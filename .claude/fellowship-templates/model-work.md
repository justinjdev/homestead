---
name: model-work
description: Quests touching the pure financial math in src/lib/model/
keywords: [model, math, payment, amortization, constraint, polygon, region, margin, time-to-afford]
---

## Research Guidance

- The math is specified, not open-ended: read "Core concept", "Extensions",
  "Edge cases", and "Testing" in
  `docs/superpowers/specs/2026-07-05-affordability-map-design.md` before
  planning. Both constraints are linear in (land price, improvement budget) —
  region vertices and margins have closed-form solutions; do not reach for
  numeric approximation.
- Financing defaults live in the spec's "Financing presets" table (land
  25%/8.0%/15yr, home 15%/9.5%/15yr, closing 3% of land, tax 1.0%/yr on
  land + home, site work excluded from tax basis). Treat that table as the
  contract.

## Plan Guidance

- Public API shape is fixed by the spec's Architecture section: `payment`,
  `evaluate`, `region`. Plan around those signatures; new exports need a spec
  reason.
- Plan the golden-value tests first: pick 2–3 amortization cases verifiable
  against a published calculator and record source + expected values in the
  test file comment.

## Implement Guidance

- Failing Vitest test first, then implementation (`npm run test`).
- Nothing under `src/lib/model/` may import `svelte`, `@sveltejs/*`, or
  `$app/*` (CLAUDE.md hard rule 2). Components must call these functions,
  never re-derive money math inline.
- 0% interest must hit the straight-line branch of `payment`; "not reachable
  by saving" must be a distinct result, not a large month count.

## Review Guidance

- `npm run test` and `npm run check` pass.
- `grep -rn "svelte\|\$app" src/lib/model/` returns nothing.
- Every edge case in the spec's Edge cases table has a corresponding test.
