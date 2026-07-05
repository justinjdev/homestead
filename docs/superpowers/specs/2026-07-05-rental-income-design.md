# Projected rental income — design

**Status:** proposed
**Date:** 2026-07-05
**Builds on:** the two-tier DTI model
(`2026-07-05-dti-two-tier-capacity-design.md`).

## Goal

Let the user answer "what if I Airbnb the tiny home?" — factor a projected
monthly rental income into affordability. Rented-out income offsets the
home's monthly cost, expanding what land + home fits. Because short-term
rental income is speculative, it is shown as a **separate, optimistic
envelope** layered over the honest income-only baseline, never silently
folded into it.

## Model

### Cost-offset, counted at 75%

A single global input `rentalMonthly` (gross expected $/mo). The model counts
a fixed fraction of it — the lender-standard 25% vacancy factor:

```
RENT_COUNTED_FRAC = 0.75
countedRentMonthly(finances) = RENT_COUNTED_FRAC × finances.rentalMonthly
```

`countedRentMonthly` is a pure helper in the model (exported from
`$lib/model`), so no `0.75×` arithmetic lives in a component.

Counted rent nets against the home's monthly cost
(loan payments + tax + insurance). Because rent is a constant, this is exactly
an outward shift of the **monthly constraint**; the cash / down-payment
constraint is untouched (rent is monthly cash flow, not a down payment).

`region()` and `regionConstraints()` (`region.ts`) gain a trailing
`rentalOffsetMonthly = 0` argument added to the monthly-constraint RHS:

```
c2 = capacity − insuranceMonthly + rentalOffsetMonthly    // was: capacity − insuranceMonthly
```

The same pure function draws both envelopes: baseline with `0`, optimistic
with `countedRentMonthly(finances)`.

`capacity()` and `capacityBreakdown()` are **unchanged** — rent is a property
cash flow, not income or DTI. It does not alter the front-end/back-end/
solvency terms.

## Map rendering

- The baseline envelope and its now→24-month contours render exactly as
  today (offset 0).
- When `rentalMonthly > 0`, a second, distinctly-styled envelope overlays at
  the **current horizon only** (not full contours — keeps the plot
  readable), computed with `rentalOffsetMonthly = countedRentMonthly(...)`.
- `Region.svelte` is generalized to accept `rentalOffsetMonthly = 0` and
  `variant: 'baseline' | 'optimistic' = 'baseline'` props. It passes the
  offset through to `region()`/`regionConstraints()` and styles by variant.
  The optimistic variant renders a distinct accent outline (dashed, faint or
  no fill) so the two envelopes are unmistakable; the gap between them is the
  rental upside. `EnvelopeMap.svelte` renders `<Region … />` (baseline) and,
  when `rentalMonthly > 0`, `<Region … rentalOffsetMonthly={counted}
  variant="optimistic" />`.
- **Axis domains:** the optimistic envelope is larger, so its polygon MUST be
  included in the `domains([...])` input in `EnvelopeMap.svelte`, or it would
  be clipped off-view.
- **Design tokens:** the optimistic envelope's colors/stroke are new CSS
  variables defined in `src/lib/styles/` (e.g. `--region-optimistic`,
  `--edge-rental`) — no ad-hoc hex in the component (design-token rule).

## Inputs (`FinancesPanel.svelte`)

`rentalMonthly` joins the Finances panel as a normal number field, following
the existing `<label><span>…</span><input class="num" type="number"
min="0" step="50" bind:value={app.finances.rentalMonthly} /></label>`
pattern:

```
Rental income / mo
```

`0` = off (no overlay, no detail line). Any positive value enables the
overlay. This is the "toggle" — no separate boolean state.

## Detail panel (`DetailPanel.svelte`)

When a combo is selected and `rentalMonthly > 0`, one line makes the offset
concrete, e.g.:

> Rental income $2,000/mo → counts $1,500 (75%); net housing $Z/mo

where `net housing = monthlyCost − countedRentMonthly`, computed via the same
pure helper. The line is absent when `rentalMonthly === 0`.

## State (`schema.ts`, `types.ts`)

- Add `rentalMonthly: number` to `FinanceProfile`, default `0`.
- `isFinancesValid` requires it finite and `≥ 0` (`isFiniteNonNeg`).
- Every `FinanceProfile` literal (test fixtures, visual-QA state JSON) gains
  `rentalMonthly`. No back-compat: old `v:1` hashes without it fail
  validation and fall back to `defaultState()`. State stays `v: 1`.
- Optional: include `rentalMonthly` in the `startOpen` first-visit heuristic
  in `FinancesPanel.svelte` for consistency (defaults to 0, so it does not
  change current behavior).

## Legend (`Legend.svelte`)

Add one key entry — a swatch matching the optimistic envelope style with the
label **"With rental income"**.

## Testing (TDD, golden values)

- `countedRentMonthly`: `0.75 × rentalMonthly` (e.g. 2000 → 1500; 0 → 0).
- `region` with `rentalOffsetMonthly > 0` strictly contains the baseline: a
  point that is outside the baseline polygon but inside the optimistic one
  (proves the monthly constraint shifted outward by the offset).
- `regionConstraints`: `monthly.c` increases by exactly `rentalOffsetMonthly`
  vs the 0 case, and `cash.c` is unchanged.
- Schema: `rentalMonthly` rejected when negative / non-finite; accepted at 0
  and positive; `defaultState()` still validates.
- Visual-QA fixture `rental-income.json`: `rentalMonthly > 0` with a combo
  that sits between the two envelopes, so the screenshot shows the baseline
  envelope, the optimistic overlay, and the legend entry.

## Out of scope (v1)

- **Rental-aware combo dots** — dots keep their income-only verdict; a dot
  inside the optimistic envelope but marked "out" tells the "reachable if you
  rent it" story via the legend. Re-verdicting/re-styling dots by rental is a
  follow-up.
- Optimistic time-contours (overlay is current-horizon only).
- Per-home rental figures, occupancy/nightly-rate or seasonality modeling,
  and a user-adjustable counted fraction (fixed 0.75 for v1).
- Empty-region card copy does not yet reference the rental path.
