# Projected Rental Income Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Factor a projected monthly rental income into affordability by netting counted rent (75%) against the home's monthly cost, shown as a separate optimistic envelope over the income-only baseline.

**Architecture:** Rent is a constant outward shift of the monthly constraint only (`c2 += rentalOffsetMonthly` in `region.ts`); `capacity()`/DTI are untouched. A `countedRentMonthly(finances)` model helper applies the fixed 0.75 factor. `Region.svelte` is generalized with a `variant`/`rentalOffsetMonthly` so the same pure `region()` draws both envelopes; the optimistic one overlays at the current horizon only.

**Tech Stack:** TypeScript (pure model), Svelte 5 runes, Vitest, Playwright visual QA.

## Global Constraints

- **Zero runtime dependencies** (`dependencies` in package.json stays empty).
- **Model purity:** nothing in `src/lib/model/` imports Svelte/SvelteKit/`$app/*`; all money math lives in the model, never inline in components.
- **Svelte 5 runes only** (`$state`/`$derived`/`$props`); no stores, `export let`, or `$:`.
- **Design tokens only** in components — colors come from CSS variables in `src/lib/styles/`, no ad-hoc hex/font in components.
- **URL hash contract stays `{v:1}`**; no back-compat — old hashes lacking `rentalMonthly` fall back to defaults.
- **Every `.svelte` file edited via the `svelte-file-editor` agent** (svelte-autofixer MCP), never raw.
- **Model work is TDD**; **UI work must pass visual QA** (`node scripts/visual-qa.mjs`) before review.
- Fixed constant `RENT_COUNTED_FRAC = 0.75`. Global single `rentalMonthly` input; `0` = off.

**Test commands:** single file `npx vitest run <path>`; full `npm run test`; types `npm run check`; visual QA `node scripts/visual-qa.mjs`.

---

### Task 1: Add `rentalMonthly` to the finance profile

Adds the field, validation, and backfills every `FinanceProfile` literal/fixture (required field → all literals must compile and all fixtures must validate).

**Files:**
- Modify: `src/lib/model/types.ts` (FinanceProfile)
- Modify: `src/lib/state/schema.ts` (`defaultState().finances`, `isFinancesValid`)
- Test: `src/lib/state/schema.test.ts`
- Modify (literals): `src/lib/model/evaluate.test.ts` (the base `finances` fixture AND the two full `FinanceProfile` literals added for DTI: `reported` in the `capacityBreakdown` block and `f` in test `(f)`), `src/lib/model/region.test.ts` (base `finances` fixture AND the inline literal in the debt>0 case `(e)`)
- Modify (fixtures): the 7 visual fixtures with a `finances` block (`map-typical`, `income-below-expenses`, `stressed`, `map-cash-limited`, `panels-selected`, `map-empty-region`, `back-end-debt-binds`); NOT `default.json` (`state: null`). The visual-QA harness auto-discovers every `*.json` in `tests/visual/states/`, so a missed fixture silently validates false and falls back to default state.

**Interfaces:**
- Produces: `FinanceProfile.rentalMonthly: number` — consumed by `countedRentMonthly` (Task 2) and the components (Tasks 3–4).

- [ ] **Step 1: Write the failing validation tests**

Add to `src/lib/state/schema.test.ts` (beside the existing finance-field cases):

```ts
it('rejects negative rentalMonthly', () => {
	const s = defaultState();
	s.finances.rentalMonthly = -1;
	expect(validateState(s)).toBe(false);
});

it('rejects finances missing rentalMonthly', () => {
	const s = defaultState();
	delete (s.finances as Partial<typeof s.finances>).rentalMonthly;
	expect(validateState(s)).toBe(false);
});

it('accepts rentalMonthly === 0 and positive', () => {
	const s = defaultState();
	s.finances.rentalMonthly = 0;
	expect(validateState(s)).toBe(true);
	s.finances.rentalMonthly = 2000;
	expect(validateState(s)).toBe(true);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/lib/state/schema.test.ts`
Expected: FAIL — the "missing" case returns true (validator ignores the field) and `defaultState()` has no `rentalMonthly` (TS error).

- [ ] **Step 3: Add the field to the interface**

In `src/lib/model/types.ts`, add to `FinanceProfile` after `backEndFrac`:

```ts
	backEndFrac: number;      // back-end DTI: max share of income for housing payment + existing debt, default 0.43
	rentalMonthly: number;    // projected gross rental income $/mo (Airbnb etc.), default 0 = none
```

- [ ] **Step 4: Add the default and the validator**

In `src/lib/state/schema.ts`, add to `defaultState().finances` after `backEndFrac: 0.43`:

```ts
			backEndFrac: 0.43,
			rentalMonthly: 0
```

In `isFinancesValid`, extend the return expression (after the `backEndFrac` clause, before the closing `)`):

```ts
			o.backEndFrac > 0 &&
			o.backEndFrac <= 1 &&
			isFiniteNonNeg(o.rentalMonthly)
```

- [ ] **Step 5: Backfill the test `FinanceProfile` literals**

Add `rentalMonthly: 0,` to every full `FinanceProfile` literal. In `src/lib/model/evaluate.test.ts`: the base `finances` fixture, the `reported` literal (in the `capacityBreakdown` describe block), and the `f` literal in test `(f)`. In `src/lib/model/region.test.ts`: the base `finances` fixture and the inline literal in case `(e)`. (Literals created via spread — `{ ...finances, ... }` — inherit the field and need no change.) Verify with `grep -rn "incomeMonthly:" src/lib/model/*.test.ts` that each full literal now has `rentalMonthly`.

- [ ] **Step 6: Backfill the 6 visual fixtures**

In each of `tests/visual/states/{map-typical,income-below-expenses,stressed,map-cash-limited,panels-selected,map-empty-region,back-end-debt-binds}.json`, add `"rentalMonthly": 0` to the `finances` object (after `"backEndFrac"`). Example:

```json
			"comfortFrac": 0.3,
			"backEndFrac": 0.43,
			"rentalMonthly": 0
```

- [ ] **Step 7: Run tests + type check**

Run: `npx vitest run src/lib/state/schema.test.ts && npm run check`
Expected: PASS (schema tests green; 0 type errors — all literals compile).

- [ ] **Step 8: Commit**

```bash
git add src/lib/model/types.ts src/lib/state/schema.ts src/lib/state/schema.test.ts \
  src/lib/model/evaluate.test.ts src/lib/model/region.test.ts tests/visual/states/
git commit -m "$(cat <<'EOF'
feat: add rentalMonthly to finance profile

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Model — `countedRentMonthly` helper + `region` rental offset

Adds the 0.75-factor helper and a `rentalOffsetMonthly` parameter that shifts the monthly-constraint RHS outward.

**Files:**
- Modify: `src/lib/model/evaluate.ts` (add `RENT_COUNTED_FRAC`, `countedRentMonthly`)
- Modify: `src/lib/model/region.ts` (`regionConstraints`, `region` gain `rentalOffsetMonthly`)
- Test: `src/lib/model/evaluate.test.ts`, `src/lib/model/region.test.ts`

**Interfaces:**
- Consumes: `FinanceProfile.rentalMonthly` (Task 1); `SITE_WORK_FRAC` (already exported from `$lib/model`).
- Produces:
  - `RENT_COUNTED_FRAC = 0.75` and `countedRentMonthly(finances: FinanceProfile): number` (= `0.75 × rentalMonthly`), exported from `$lib/model`.
  - `region(finances, presets, stress, tMonths, siteWorkFrac?, rentalOffsetMonthly = 0): Polygon` and `regionConstraints(finances, presets, stress, tMonths, siteWorkFrac?, rentalOffsetMonthly = 0): RegionConstraints` — the offset adds to `monthly.c`. Consumed by `Region.svelte`/`EnvelopeMap.svelte` (Task 3) and `DetailPanel.svelte` (Task 4, `countedRentMonthly` only).

- [ ] **Step 1: Write the failing model tests**

In `src/lib/model/evaluate.test.ts`, add `countedRentMonthly` to the import on line 2 and add:

```ts
describe('countedRentMonthly', () => {
	it('counts 75% of rentalMonthly', () => {
		expect(countedRentMonthly({ ...finances, rentalMonthly: 2000 })).toBe(1500);
	});
	it('is 0 when rentalMonthly is 0', () => {
		expect(countedRentMonthly(finances)).toBe(0);
	});
});
```

In `src/lib/model/region.test.ts`, add `regionConstraints`, `region`, and `SITE_WORK_FRAC` to the imports from `./region` (regionConstraints/region already imported; add `SITE_WORK_FRAC`), then add inside `describe('region', ...)`:

```ts
	it('rentalOffsetMonthly shifts monthly.c up and leaves cash.c unchanged', () => {
		const base = regionConstraints(finances, defaultPresets, zeroStress, 0);
		const withRent = regionConstraints(finances, defaultPresets, zeroStress, 0, SITE_WORK_FRAC, 500);
		expect(withRent.monthly.c).toBeCloseTo(base.monthly.c + 500, 6);
		expect(withRent.cash.c).toBeCloseTo(base.cash.c, 6);
	});

	it('rental offset expands the region area (monthly constraint binds)', () => {
		const area = (poly: [number, number][]) => {
			let a = 0;
			for (let i = 0; i < poly.length; i++) {
				const [x1, y1] = poly[i];
				const [x2, y2] = poly[(i + 1) % poly.length];
				a += x1 * y2 - x2 * y1;
			}
			return Math.abs(a) / 2;
		};
		const base = region(finances, defaultPresets, zeroStress, 0);
		const withRent = region(finances, defaultPresets, zeroStress, 0, SITE_WORK_FRAC, 800);
		expect(area(withRent)).toBeGreaterThan(area(base));
	});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/lib/model/evaluate.test.ts src/lib/model/region.test.ts`
Expected: FAIL — `countedRentMonthly` not exported; `regionConstraints`/`region` ignore the 6th arg so `monthly.c` and area are unchanged.

- [ ] **Step 3: Add the model helper**

In `src/lib/model/evaluate.ts`, add near the top (after the imports, before `capacityBreakdown`):

```ts
/** Fraction of projected rental income counted toward affordability (lender 25% vacancy factor). */
export const RENT_COUNTED_FRAC = 0.75;

/** Counted monthly rental income: RENT_COUNTED_FRAC × gross rentalMonthly. */
export function countedRentMonthly(finances: FinanceProfile): number {
	return RENT_COUNTED_FRAC * finances.rentalMonthly;
}
```

- [ ] **Step 4: Add the offset parameter to region**

In `src/lib/model/region.ts`, add `rentalOffsetMonthly = 0` as the last parameter of both `regionConstraints` and `region`:

```ts
export function regionConstraints(
	finances: FinanceProfile,
	presets: Presets,
	stress: Stress,
	tMonths: number,
	siteWorkFrac = SITE_WORK_FRAC,
	rentalOffsetMonthly = 0
): RegionConstraints {
```

Change the `c2` line (currently `const c2 = cap - insuranceMonthly;`) to:

```ts
	const c2 = cap - insuranceMonthly + rentalOffsetMonthly;
```

In `region(...)`, add the same trailing parameter and forward it:

```ts
export function region(
	finances: FinanceProfile,
	presets: Presets,
	stress: Stress,
	tMonths: number,
	siteWorkFrac = SITE_WORK_FRAC,
	rentalOffsetMonthly = 0
): Polygon {
	const { cash, monthly } = regionConstraints(finances, presets, stress, tMonths, siteWorkFrac, rentalOffsetMonthly);
	const poly = clipQuadrant([cash, monthly]);
	return normalizePolygon(poly);
}
```

- [ ] **Step 5: Run tests + type check**

Run: `npx vitest run src/lib/model/evaluate.test.ts src/lib/model/region.test.ts && npm run check`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/model/evaluate.ts src/lib/model/region.ts src/lib/model/evaluate.test.ts src/lib/model/region.test.ts
git commit -m "$(cat <<'EOF'
feat: countedRentMonthly helper + region rental offset

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Map — optimistic envelope overlay

Adds the design token, generalizes `Region.svelte`, renders the overlay + includes it in axis domains, adds the legend entry, and a visual fixture.

**Files:**
- Modify: `src/lib/styles/tokens.css` (new `--edge-rental` token)
- Modify (via svelte-file-editor): `src/lib/components/map/Region.svelte`, `src/lib/components/map/EnvelopeMap.svelte`, `src/lib/components/map/Legend.svelte`
- Create: `tests/visual/states/rental-income.json`

**Interfaces:**
- Consumes: `countedRentMonthly`, `region`, `regionConstraints`, `SITE_WORK_FRAC` from `$lib/model` (Task 2).

- [ ] **Step 1: Add the design token**

In `src/lib/styles/tokens.css`, add after the `--flag-in` line (inside the same `:root` block):

```css
	--edge-rental: #9c7a2e;  /* optimistic 'with rental income' edge, antique gold */
```

- [ ] **Step 2: Create the visual fixture**

Create `tests/visual/states/rental-income.json`:

```json
{
	"name": "rental-income",
	"state": {
		"v": 1,
		"finances": {
			"incomeMonthly": 6000,
			"expensesMonthly": 3000,
			"debtMonthly": 0,
			"cashOnHand": 90000,
			"savingsMonthly": 1000,
			"comfortFrac": 0.3,
			"backEndFrac": 0.43,
			"rentalMonthly": 1600
		},
		"presets": {
			"land": { "downFrac": 0.25, "annualRatePct": 8.0, "termMonths": 180 },
			"home": { "downFrac": 0.15, "annualRatePct": 9.5, "termMonths": 180 },
			"closingFrac": 0.03,
			"taxAnnualPct": 1.0,
			"insuranceMonthly": 100
		},
		"parcels": [
			{ "id": "p1", "name": "Ridge 5ac", "landPrice": 80000 },
			{ "id": "p2", "name": "Creek 10ac", "landPrice": 140000 }
		],
		"homes": [
			{ "id": "h1", "name": "Escape One", "homeCost": 100000, "siteWork": 40000 },
			{ "id": "h2", "name": "Used park model", "homeCost": 55000, "siteWork": 35000 }
		],
		"muted": [],
		"selected": "p1:h1",
		"stress": { "rateDeltaPct": 0, "siteWorkOverrunFrac": 0, "incomeDropMonthly": 0 },
		"timeMonths": 6
	},
	"viewport": { "width": 1440, "height": 900 }
}
```

- [ ] **Step 3: Generalize `Region.svelte` (via svelte-file-editor agent)**

Dispatch the `svelte-file-editor` agent to replace `src/lib/components/map/Region.svelte` with:

```svelte
<script lang="ts">
	import { app } from '$lib/state/store.svelte';
	import { region, regionConstraints, SITE_WORK_FRAC } from '$lib/model';

	let {
		px,
		py,
		rentalOffsetMonthly = 0,
		variant = 'baseline'
	}: {
		px: (v: number) => number;
		py: (v: number) => number;
		rentalOffsetMonthly?: number;
		variant?: 'baseline' | 'optimistic';
	} = $props();

	const poly = $derived(
		region(app.finances, app.presets, app.stress, app.timeMonths, SITE_WORK_FRAC, rentalOffsetMonthly)
	);
	const cons = $derived(
		regionConstraints(app.finances, app.presets, app.stress, app.timeMonths, SITE_WORK_FRAC, rentalOffsetMonthly)
	);

	const fillPath = $derived(
		poly.length >= 3
			? poly.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${px(x)},${py(y)}`).join(' ') + 'Z'
			: ''
	);

	type Edge = { x1: number; y1: number; x2: number; y2: number; kind: 'cash' | 'monthly' | 'axis' };

	function classify(mx: number, my: number): 'cash' | 'monthly' | 'axis' {
		const c = cons.cash;
		const m = cons.monthly;
		if (Math.abs(c.a * mx + c.b * my - c.c) < Math.max(1, c.c) * 1e-6) return 'cash';
		if (Math.abs(m.a * mx + m.b * my - m.c) < Math.max(1, m.c) * 1e-6) return 'monthly';
		return 'axis';
	}

	const edges = $derived.by((): Edge[] => {
		if (variant === 'optimistic' || poly.length < 3) return [];
		const out: Edge[] = [];
		for (let i = 0; i < poly.length; i++) {
			const [ax, ay] = poly[i];
			const [bx, by] = poly[(i + 1) % poly.length];
			out.push({
				x1: px(ax), y1: py(ay), x2: px(bx), y2: py(by),
				kind: classify((ax + bx) / 2, (ay + by) / 2)
			});
		}
		return out;
	});
</script>

{#if fillPath}
	{#if variant === 'optimistic'}
		<path class="outline optimistic" d={fillPath} />
	{:else}
		<path class="region-fill" d={fillPath} />
		{#each edges as e, i (i)}
			{#if e.kind !== 'axis'}
				<line class="edge {e.kind}" x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} />
			{/if}
		{/each}
	{/if}
{/if}

<style>
	.region-fill { fill: var(--region-fill); stroke: none; transition: d 0.45s ease; }
	.edge { stroke-width: 2.5; stroke-linecap: round; transition: x1 0.45s ease, y1 0.45s ease, x2 0.45s ease, y2 0.45s ease; }
	.edge.cash { stroke: var(--edge-cash); }
	.edge.monthly { stroke: var(--edge-monthly); }
	.outline.optimistic {
		fill: none;
		stroke: var(--edge-rental);
		stroke-width: 2;
		stroke-dasharray: 5 4;
		stroke-linejoin: round;
		transition: d 0.45s ease;
	}
</style>
```

Instruct the agent to run svelte-autofixer validation and confirm no issues.

- [ ] **Step 4: Wire the overlay into `EnvelopeMap.svelte` (via svelte-file-editor agent)**

Dispatch the `svelte-file-editor` agent to make these edits to `src/lib/components/map/EnvelopeMap.svelte`:

Change the model import (line 3) to add `countedRentMonthly` and `SITE_WORK_FRAC`:

```ts
	import { region, capacityBreakdown, countedRentMonthly, SITE_WORK_FRAC } from '$lib/model';
```

After the `currentPoly` derived (line 15), add:

```ts
	const counted = $derived(countedRentMonthly(app.finances));
	const showRental = $derived(app.finances.rentalMonthly > 0);
	const optimisticPoly = $derived(
		showRental ? region(app.finances, app.presets, app.stress, app.timeMonths, SITE_WORK_FRAC, counted) : []
	);
```

Change the `dom` derived (line 17) to include the optimistic poly:

```ts
	const dom = $derived(domains([...contourPolys, currentPoly, optimisticPoly], app.parcels, app.homes));
```

In the SVG, immediately after `<Region {px} {py} />` (line 68), add:

```svelte
			{#if showRental}
				<Region {px} {py} rentalOffsetMonthly={counted} variant="optimistic" />
			{/if}
```

Instruct the agent to run svelte-autofixer validation and confirm no issues.

- [ ] **Step 5: Add the legend entry (via svelte-file-editor agent)**

Dispatch the `svelte-file-editor` agent to add, in `src/lib/components/map/Legend.svelte`, a new `<li>` immediately after the existing monthly-limit `<li>` (the one labeled "Monthly limit — payments + tax + insurance"):

```svelte
		<li>
			<span class="swatch line rental" aria-hidden="true"></span>
			<span class="legend-label">With rental income</span>
		</li>
```

And add a matching swatch style in the component's `<style>` block, mirroring the existing `.swatch.line.cash` / `.swatch.line.monthly` rules but using the rental token with a dashed treatment:

```css
	.swatch.line.rental {
		background: none;
		border-top: 2px dashed var(--edge-rental);
	}
```

(If the existing `.swatch.line` rules set color via `background`, keep this consistent — the agent should match the sibling swatch pattern; the defining trait is the dashed `--edge-rental` stroke.) Instruct the agent to run svelte-autofixer validation and confirm no issues.

- [ ] **Step 6: Type check + visual QA**

Run: `npm run check` — expect 0 errors.
Run: `node scripts/visual-qa.mjs`, then READ `.visual-qa/rental-income.png`. Confirm: the baseline green envelope PLUS a distinct dashed gold envelope extending beyond it, and a "With rental income" legend entry. Also READ `.visual-qa/map-typical.png` and confirm it is UNCHANGED (its `rentalMonthly` is 0 → no overlay). If wrong, fix and re-run.

- [ ] **Step 7: Commit**

```bash
git add src/lib/styles/tokens.css src/lib/components/map/Region.svelte \
  src/lib/components/map/EnvelopeMap.svelte src/lib/components/map/Legend.svelte \
  tests/visual/states/rental-income.json
git commit -m "$(cat <<'EOF'
feat: optimistic rental-income envelope overlay

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Finances input + detail-panel rental rows

Adds the `rentalMonthly` input to the Finances panel and the counted-rent rows to the detail panel's monthly breakdown.

**Files:**
- Modify (via svelte-file-editor): `src/lib/components/FinancesPanel.svelte`, `src/lib/components/DetailPanel.svelte`

**Interfaces:**
- Consumes: `app.finances.rentalMonthly` (Task 1), `countedRentMonthly` from `$lib/model` (Task 2).

- [ ] **Step 1: Add the Finances input (via svelte-file-editor agent)**

Dispatch the `svelte-file-editor` agent to add, in `src/lib/components/FinancesPanel.svelte`, a new `<label>` immediately after the "Savings / mo" label and before the "Comfort threshold" label:

```svelte
		<label>
			<span>Rental income / mo</span>
			<input class="num" type="number" min="0" step="50" bind:value={app.finances.rentalMonthly} />
		</label>
```

Instruct the agent to run svelte-autofixer validation and confirm no issues.

- [ ] **Step 2: Add the detail-panel rows (via svelte-file-editor agent)**

Dispatch the `svelte-file-editor` agent to edit `src/lib/components/DetailPanel.svelte`:

Add `countedRentMonthly` to the `$lib/model` import (find the existing model import; add the name to it). Add a derived after the existing `costs`/`ev` deriveds in the `<script>`:

```ts
	const counted = $derived(countedRentMonthly(app.finances));
```

In the monthly breakdown `<table class="breakdown">`, immediately after the `<tr class="total"><th>Monthly cost</th>…</tr>` row and before the `<tr class="avail" …><th>Capacity</th>…</tr>` row, add:

```svelte
				{#if app.finances.rentalMonthly > 0}
					<tr class="rental"><th>Rental income (75%)</th><td class="num">−{fullDollar(counted)}</td></tr>
					<tr class="total"><th>Net monthly</th><td class="num">{fullDollar(costs.monthlyCost - counted)}</td></tr>
				{/if}
```

Instruct the agent to run svelte-autofixer validation and confirm no issues.

- [ ] **Step 3: Type check + visual QA**

Run: `npm run check` — expect 0 errors.
Run: `node scripts/visual-qa.mjs`, then READ `.visual-qa/rental-income.png` (its state has `selected: "p1:h1"` and `rentalMonthly: 1600`). Confirm: the Finances panel shows a "Rental income / mo" field with 1600, and the detail panel's monthly breakdown shows "Rental income (75%) −$1,200" and a "Net monthly" row. If wrong, fix and re-run.

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/FinancesPanel.svelte src/lib/components/DetailPanel.svelte
git commit -m "$(cat <<'EOF'
feat: rental income input + detail-panel net-monthly rows

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review

**Spec coverage:**
- `RENT_COUNTED_FRAC = 0.75` + `countedRentMonthly` helper → Task 2 ✓
- Cost-offset via monthly constraint `c2 += rentalOffsetMonthly` → Task 2 ✓
- `capacity()`/DTI unchanged → not modified (verified: only `c2` changes) ✓
- Baseline + optimistic overlay, current horizon only → Task 3 ✓
- Optimistic poly in `domains()` (no clipping) → Task 3 Step 4 ✓
- `Region.svelte` generalized (variant + offset) → Task 3 Step 3 ✓
- Distinct styling via design token → Task 3 Steps 1,3 (`--edge-rental`, dashed, outline-only) ✓
- `rentalMonthly` input, 0 = off → Task 4 Step 1 ✓
- Detail-panel rental line → Task 4 Step 2 ✓
- State field + validation + backfills, no back-compat → Task 1 ✓
- Legend entry → Task 3 Step 5 ✓
- Tests: helper golden, region offset/containment, schema, visual fixture → Tasks 1,2,3 ✓
- Out of scope (rental-aware dots, contours, per-home, occupancy, adjustable haircut) → not planned ✓

**Deviation from spec:** the spec named two tokens (`--region-optimistic`, `--edge-rental`) with "faint or no fill"; this plan uses a single `--edge-rental` token with an **outline-only** (no fill) optimistic envelope, because the baseline region fill is already green (`--region-fill: #6b7f5e26`) and a second translucent fill over it would muddy both. Outline-only is within the spec's "no fill" option.

**Placeholder scan:** No TBD/TODO; every code step shows complete code. ✓

**Type consistency:** `countedRentMonthly(finances): number`, `rentalOffsetMonthly` param name, and `variant: 'baseline' | 'optimistic'` are used identically across Tasks 2–4. `counted` derived name reused consistently in EnvelopeMap and DetailPanel. ✓
