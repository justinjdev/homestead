# Two-tier DTI capacity — design

**Status:** proposed
**Date:** 2026-07-05
**Supersedes:** the monthly-capacity formula in
`2026-07-05-affordability-map-design.md` (line 25).

## Problem

A profile with high income, high existing debt, and large monthly surplus is
reported as affording *nothing*:

| Input | Value |
|---|---|
| Take-home / mo | 12,916 |
| Expenses / mo | 1,378 |
| Existing debt / mo | 4,266 |
| Comfort threshold | 30% |

The app shows "Nothing is affordable," reporting a monthly capacity of
**−$391**. But this person has **$7,272/mo of free cash flow**
(12,916 − 1,378 − 4,266) and $90k liquid — they can obviously service a
modest land + tiny-home payment. The "nothing" result is a formula artifact,
not a real conclusion.

## Root cause

Current formula (`evaluate.ts`):

```
capacity = min(comfortFrac × I, I − expenses) − debt
```

Existing debt is subtracted from the comfort cap, which treats the 30%
comfort threshold as a **back-end DTI** limit (housing + all debt ÷ income).
But 30% is a **front-end** number (housing ÷ income). Real underwriting uses
two separate ratios:

- **Front-end:** housing ÷ income ≤ ~28–31%
- **Back-end:** (housing + all recurring debt) ÷ income ≤ ~36–43%

Collapsing them into one 30% back-end cutoff makes any borrower already above
30% DTI look unable to add a dollar of housing. Break-even in the current
model is at `comfortFrac = debt/I = 4266/12916 = 33%`, i.e. it wrongly tells a
33%-DTI borrower they can afford nothing.

## Model change

### New capacity formula (`evaluate.ts`)

```
I = incomeMonthly − incomeDropMonthly              // stressed take-home
capacity = min(
  comfortFrac  × I,          // front-end: home payment ≤ comfort% of income
  backEndFrac  × I − debt,   // back-end:  home payment + existing debt ≤ back% of income
  I − expenses − debt        // solvency floor: never cash-flow negative
)
```

- **`comfortFrac` keeps its name** (it is persisted in the URL hash; renaming
  breaks the state contract) but its **meaning narrows to housing-only**. The
  debt subtraction leaves its branch and moves into the new back-end branch.
  Its doc comment is updated from "all-in housing" to "front-end housing
  ratio (housing payment only)".
- **`backEndFrac`** is a new **`FinanceProfile`** field, sibling to
  `comfortFrac` (both DTI ratios live together; this also keeps the
  `capacity(finances, stress)` signature unchanged). **Default 0.43** (the
  conforming back-end DTI standard). Note it is applied to *take-home*, where
  the textbook 43% is a *gross* figure — so the default is deliberately
  conservative and is overridable like `comfortFrac`.

For the reported profile: `min(3874.8, 1287.88, 7272) = 1287.88`. Capacity
becomes **+$1,288/mo**, existing debt is the honest binding constraint, and
the region is non-empty (the "nothing affordable" card disappears).

`pctOfIncome` (already `(monthlyCost + debt) / I`) is unchanged; it now
reads as the realized back-end ratio, aligning with `backEndFrac`.

### Binding-constraint helper (`evaluate.ts`)

Add a pure helper so the UI can name *which* constraint binds without
computing money math in a component (model-purity rule):

```
capacityBreakdown(finances, stress): {
  frontEnd: number;   // comfortFrac × I
  backEnd:  number;   // backEndFrac × I − debt
  solvency: number;   // I − expenses − debt
  capacity: number;   // min of the three
  binding: 'front-end' | 'back-end' | 'solvency';
}
```

`capacity()` may delegate to this or vice versa; the scalar `capacity()`
signature stays for `region.ts` and existing callers.

### Income-drop margin (`evaluate.ts:74-76`)

The `incomeDropMonthly` margin gains a third branch to match the three-way
min. For a target `monthlyCost` and stressed income `I`, the max additional
income drop `d` is `max(0, min(d1, d2, d3))`:

```
d1 (front-end):  d ≤ I − monthlyCost / comfortFrac
d2 (back-end):   d ≤ I − (monthlyCost + debt) / backEndFrac
d3 (solvency):   d ≤ I − expenses − debt − monthlyCost
```

Both `comfortFrac` and `backEndFrac` are divisors, so both must be > 0
(enforced in the schema validator).

### Region polygon (`region.ts`)

No structural change. `regionConstraints` reads `capacity()` as a scalar and
picks up the corrected value automatically.

## State (`schema.ts`)

- Add `backEndFrac: number` to the `FinanceProfile` interface (`types.ts`)
  and to `defaultState().finances` (= 0.43).
- `isFinancesValid` requires `backEndFrac` in `(0, 1]` (strictly > 0 — it is
  a divisor in the income-drop margin, like `comfortFrac`).
- Every `FinanceProfile` literal (test fixtures, visual-QA state JSON) gains
  `backEndFrac`. `Presets` literals are untouched.
- **No backward-compatibility handling.** Old `v:1` hashes/localStorage
  without `backEndFrac` fail validation and fall back to `defaultState()`.
  State stays `v: 1`.

## UI (`EnvelopeMap.svelte`)

The empty-region card (`emptyMessage`, currently a hardcoded "the monthly
constraint binds" string) becomes constraint-aware using
`capacityBreakdown(...).binding`:

| Binding term | Message intent |
|---|---|
| back-end | "Your existing debt of $D/mo uses your full back-end allowance; pay it down or raise the DTI limit to fit a home." |
| front-end | "At a C% comfort threshold your home budget is only $A/mo, below the $I/mo insurance floor — raise the threshold." |
| solvency | "After $E expenses and $D debt, only $A/mo remains — below the $I/mo insurance floor." |

The existing "Income doesn't cover expenses" branch is unchanged. No new
slider for `backEndFrac` in this change (default + preset override is
sufficient).

## Testing (TDD, golden values)

**Existing `capacity`/margin assertions are unchanged in value** — the test
fixtures use `debt = 0`, and with no debt the front-end/solvency terms
already dominate, so `min` is identical. Their *comments/descriptions* are
updated to the new formula, and new `debt > 0` cases exercise the back-end
branch.

New golden `capacity` / `capacityBreakdown` cases (comfort 0.30, back 0.43):

| Case | I | exp | debt | front | back | solvency | capacity | binding |
|---|---|---|---|---|---|---|---|---|
| Reported profile | 12,916 | 1,378 | 4,266 | 3,874.80 | 1,287.88 | 7,272 | **1,287.88** | back-end |
| Front-end binds | 6,000 | 1,000 | 0 | 1,800 | 2,580 | 5,000 | **1,800** | front-end |
| Solvency binds | 6,000 | 5,200 | 0 | 1,800 | 2,580 | 800 | **800** | solvency |

Additional coverage:

- An `incomeDropMonthly` margin case with `debt > 0` where the back-end
  branch (`d2`) is the binding one.
- A `region` case with `debt > 0` producing a non-empty polygon that the old
  formula would have rendered empty.
- A visual-QA fixture in `tests/visual/states/` for a "back-end debt binds"
  state (empty card showing the debt message).

## Out of scope

- **Projected rental income** (Airbnb / long-term rent offsetting the home
  payment or adding to qualifying income) — deferred to its own brainstorm
  and spec.
- Any new UI control for editing `backEndFrac`.
