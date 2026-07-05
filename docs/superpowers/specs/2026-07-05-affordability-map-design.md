# Homey — Land + Tiny Home Affordability Map

**Date:** 2026-07-05
**Status:** Approved design, pre-implementation

## Purpose

An interactive tool for deciding whether (and when) buying land and adding a tiny
home is affordable. Instead of a calculator that answers "can I afford this one
scenario?", the tool inverts the question: the user's finances define an
**affordability envelope**, rendered as a shaded region on a 2D map of
land price × improvement budget. Candidate parcels and homes become dots on the
map — inside or outside the envelope at a glance.

Single user, personal finances, data never leaves the browser.

## Core concept

- **Map plane:** x = land price, y = improvement budget (tiny home + site work).
- **Feasible region:** intersection of two half-planes, both linear in (x, y),
  so the region is an exact polygon:
  - **Cash constraint:** land down payment + home down payment + site work
    (paid cash) + closing costs ≤ cash on hand + monthly savings × t.
  - **Monthly constraint:** land loan payment + home loan payment + property
    tax + insurance + existing debt payments ≤ min(comfort % × take-home
    income, income − expenses).
- The two boundary edges are visually distinct so the user can see *which*
  constraint binds.
- Site work is modeled as cash-paid by default (lenders rarely finance site
  work on raw land).

### Simplifications (v1)

- Purchase is simultaneous (land + home at once). Staged buy-now-build-later
  cash flow is deferred.
- Property tax = flat annual rate applied to (land price + home cost),
  default 1.0%/yr. Insurance = flat monthly amount, default $100/mo.
- Site work is excluded from the tax basis.

## Inputs

### Finance profile (entered once, collapsible panel)

| Input | Notes |
|---|---|
| Monthly take-home income | |
| Monthly expenses | Excluding current housing |
| Existing monthly debt payments | Reduces monthly capacity |
| Cash on hand | Available for down payments, site work, closing |
| Monthly savings rate | Drives the time axis |
| Comfort threshold | Max % of take-home for all-in housing cost, default 30% |

### Financing presets (each field manually overridable)

| Preset | Down | Rate | Term |
|---|---|---|---|
| Raw land loan | 25% | 8.0% | 15 yr |
| Tiny home RV/personal loan | 15% | 9.5% | 15 yr |
| Cash (either) | 100% | — | — |

Closing costs default: 3% of land price. 0% rate uses straight-line payment.

## Entities: parcels × homes

Parcels and home options are separate reusable lists; a scenario is a pairing.

- **Parcel:** name, land price, optional overrides (tax rate, closing %).
  Renders as a vertical guide line on the map.
- **Home option:** name, home cost, site work estimate. Renders as a
  horizontal guide line.
- **Combos:** every parcel × home intersection is plotted automatically as a
  dot. Individual combos can be muted. Editing a parcel or home updates all
  its combos.
- **Ad-hoc probe:** clicking anywhere on the map shows a crosshair readout for
  that point, promotable to a saved parcel + home.

## Extensions (all in v1)

1. **Time axis.** Cash constraint grows with savings × t. The map draws
   **time contours** — nested envelope boundaries at t = 0, 6, 12, 18, 24
   months, like a topo map. A dot outside today's envelope gets a
   "ready in ~N months" badge (smallest t that admits it). If the *monthly*
   constraint is what fails, the badge honestly reads "not reachable by
   saving" — saving more cash never fixes a monthly shortfall.
2. **Auto margin-of-safety.** For the selected combo, computed distance to
   each boundary expressed in real terms: max site-work overrun (%), max rate
   rise (percentage points, applied to both loans), max income drop ($/mo).
   Closed-form since constraints are linear.
3. **Site-work estimator drawer.** Optional checklist in the detail panel that
   sums line items into the home option's site-work figure. Static typical
   ranges: well $8–15k, septic $10–25k, driveway $5–15k, grading/pad $3–10k,
   power run $5–25k, permits/fees $2–8k, contingency (suggested 15%).
4. **Shareable URLs.** Full app state encoded in the URL hash
   (versioned JSON → base64url, `{v:1, ...}`). On load, a valid hash beats
   localStorage and prompts "opened from a link — keep it?" so a shared link
   never silently clobbers saved data. Malformed hash → ignored with a notice.

## Stress testing

Slider strip below the map: rate +Δ, site-work overrun %, income −Δ, plus
reset. Sliders deform the envelope live. Stress state is part of shareable
state.

## UI layout

Single route, desktop-first, responsive where cheap.

- **Map (hero, ~65% viewport):** SVG. Dollar axes, shaded polygon region,
  distinct constraint edges, time contours, parcel/home guide lines, combo
  dots, hover readout, click-to-probe. Time slider lives with the map.
- **Finances panel (left rail):** six inputs; collapses to a one-line summary
  after first entry.
- **Detail panel (right rail):** selected combo — parcel + home pickers,
  financing presets with overrides, upfront cash breakdown, monthly breakdown,
  three margin numbers, "ready in N months" badge, site-work estimator drawer.
- **Stress strip (below map):** three sliders + reset.
- **Dock (bottom):** parcel list and home option list as chips; chips show a
  compact verdict per combo (in / out / "in N mo"); mute toggles.

**Aesthetic:** surveyor's/plat-map theme — contour linework, stake-flag
markers, cartographic typography. Distinctive fonts (no Inter/Roboto/system
defaults); committed palette via CSS variables; CSS-only motion for reveals
and region morphs. Detailed art direction happens at implementation.

## Architecture

- SvelteKit + `adapter-static`, single prerendered route, Svelte 5 runes,
  TypeScript. Deployed to GitHub Pages via Actions workflow
  (base path `/homey`).
- **Zero runtime dependencies** beyond Svelte/SvelteKit. Map is hand-rolled
  SVG. Hash encoding is JSON + base64url, no compression lib.
- **Pure model module** `src/lib/model/` with no Svelte imports:
  - `payment(principal, rate, termMonths)` — amortized + 0%-rate cases
  - `evaluate(finances, parcel, home, presets, stress, t)` → full cost
    breakdown + in/out verdict + margins + readyInMonths
  - `region(finances, presets, stress, t)` → polygon vertices
- **State:** one runes store — finance profile, parcels, homes, mute flags,
  stress, time, selection. Synced to localStorage on change; encoded to URL
  hash on demand (share button) and parsed on load.

## Edge cases

| Case | Behavior |
|---|---|
| Income ≤ expenses | Empty region + plain-language explanation, not a broken chart |
| No feasible region | Map says so and names the binding constraint |
| Cash purchase | Loan constraint term collapses; no rate/term inputs shown |
| 0% rate | Straight-line payment formula |
| localStorage unavailable | In-memory session + warning |
| Malformed URL hash | Ignored + notice, fall back to localStorage |

## Testing

Vitest unit tests on `src/lib/model/` only (v1):

- Payment math vs. known amortization values
- Region polygon vertices for hand-computable cases
- Margin closed-form solutions
- Time-to-afford, including "not reachable by saving"
- All edge cases above

UI verified manually. No e2e in v1.

## Deferred (explicitly out of scope for v1)

- Staged purchase timeline (buy land now, build later)
- Itemized income/expense budgeting; CSV/bank import
- Rent-vs-buy comparison; amortization schedules
- Regional tax/cost datasets beyond the static site-work ranges
