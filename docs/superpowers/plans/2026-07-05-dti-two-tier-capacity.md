# Two-tier DTI Capacity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single-ratio capacity formula (which reports negative capacity for high-income/high-debt profiles) with a two-tier DTI model: front-end housing ratio, back-end total-debt ratio, and a solvency floor.

**Architecture:** Pure change to `src/lib/model/evaluate.ts` (formula + a new `capacityBreakdown` helper that names the binding constraint), a new `backEndFrac` field on `FinanceProfile`, and a constraint-aware empty-region message in `EnvelopeMap.svelte`. The region polygon reads `capacity()` as a scalar, so it changes for free.

**Tech Stack:** TypeScript (pure model), Svelte 5 runes, Vitest, Playwright visual QA.

## Global Constraints

Copied verbatim from `CLAUDE.md` / the spec — every task's requirements implicitly include these:

- **Zero runtime dependencies.** `dependencies` in package.json stays empty.
- **Model purity.** Nothing in `src/lib/model/` may import from Svelte, SvelteKit, or `$app/*`. All money math lives in the model; components never compute constraints inline.
- **Svelte 5 runes only** (`$state`, `$derived`, `$effect`). No stores, no `export let`, no `$:`.
- **URL hash contract stays `{v: 1, ...}`.** No version bump. No backward-compat handling — old hashes lacking `backEndFrac` fail validation and fall back to `defaultState()`.
- **Design tokens only** in components — no ad-hoc hex/font values.
- **Every `.svelte` / `.svelte.ts` file** must be created/edited via the `svelte-file-editor` agent (svelte-autofixer MCP), never raw.
- **Model work is TDD:** failing Vitest test first, then implementation.
- **UI work must pass visual QA** (`node scripts/visual-qa.mjs`) before review.
- `backEndFrac` default = **0.43**. `comfortFrac` default stays 0.30.

**Test commands:**
- Single test file: `npx vitest run <path>`
- Full suite: `npm run test`
- Types + Svelte: `npm run check`
- Visual QA: `node scripts/visual-qa.mjs`

---

### Task 1: Add `backEndFrac` to the finance profile

Adds the field, its validation, and backfills every `FinanceProfile` literal so the project compiles and the visual-QA fixtures still validate. This is atomic (a required field breaks all literals at once).

**Files:**
- Modify: `src/lib/model/types.ts` (FinanceProfile interface)
- Modify: `src/lib/state/schema.ts` (`defaultState().finances`, `isFinancesValid`)
- Test: `src/lib/state/schema.test.ts` (new validation cases)
- Modify (backfill literals): `src/lib/model/evaluate.test.ts:20-27`, `src/lib/model/region.test.ts:16-23`
- Modify (backfill fixtures): `tests/visual/states/map-typical.json`, `income-below-expenses.json`, `stressed.json`, `map-cash-limited.json`, `panels-selected.json`, `map-empty-region.json` (NOT `default.json` — its `state` is `null`)

**Interfaces:**
- Produces: `FinanceProfile.backEndFrac: number` — read by `capacityBreakdown`/`capacity` (Task 2) and the income-drop margin (Task 3).

- [ ] **Step 1: Write the failing validation tests**

Add to `src/lib/state/schema.test.ts` (place beside the existing `comfortFrac` cases, ~line 67):

```ts
it('rejects backEndFrac > 1', () => {
	const s = defaultState();
	s.finances.backEndFrac = 1.5;
	expect(validateState(s)).toBe(false);
});

it('rejects backEndFrac === 0 (would divide by zero downstream)', () => {
	const s = defaultState();
	s.finances.backEndFrac = 0;
	expect(validateState(s)).toBe(false);
});

it('rejects finances missing backEndFrac', () => {
	const s = defaultState();
	delete (s.finances as Partial<typeof s.finances>).backEndFrac;
	expect(validateState(s)).toBe(false);
});

it('accepts backEndFrac === 1', () => {
	const s = defaultState();
	s.finances.backEndFrac = 1;
	expect(validateState(s)).toBe(true);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/state/schema.test.ts`
Expected: FAIL — the "missing" and ">1"/"0" cases return `true` (validator ignores the field) and `defaultState()` has no `backEndFrac` (TS error), and/or assertions fail.

- [ ] **Step 3: Add the field to the interface**

In `src/lib/model/types.ts`, replace the `comfortFrac` line in `FinanceProfile`:

```ts
	comfortFrac: number;      // front-end DTI: max share of income for the housing payment alone, default 0.30
	backEndFrac: number;      // back-end DTI: max share of income for housing payment + existing debt, default 0.43
```

- [ ] **Step 4: Add the default and the validator**

In `src/lib/state/schema.ts`, add to the `finances` object in `defaultState()` (after `comfortFrac: 0.30`):

```ts
			comfortFrac: 0.30,
			backEndFrac: 0.43
```

And in `isFinancesValid`, extend the return expression (after the `comfortFrac` clause, before the closing `)`):

```ts
			o.comfortFrac > 0 &&
			o.comfortFrac <= 1 &&
			// Strictly > 0: backEndFrac is a divisor in the income-drop margin.
			typeof o.backEndFrac === 'number' &&
			Number.isFinite(o.backEndFrac) &&
			o.backEndFrac > 0 &&
			o.backEndFrac <= 1
```

- [ ] **Step 5: Backfill the test `FinanceProfile` literals**

In `src/lib/model/evaluate.test.ts`, the `finances` fixture (~line 20):

```ts
const finances: FinanceProfile = {
	incomeMonthly: 6000,
	expensesMonthly: 3000,
	debtMonthly: 0,
	cashOnHand: 90_000,
	savingsMonthly: 1000,
	comfortFrac: 0.30,
	backEndFrac: 0.43,
};
```

In `src/lib/model/region.test.ts`, the `finances` fixture (~line 16) — add the same `backEndFrac: 0.43,` line after `comfortFrac: 0.30,`.

- [ ] **Step 6: Backfill the 6 visual-QA fixtures**

In each of `tests/visual/states/{map-typical,income-below-expenses,stressed,map-cash-limited,panels-selected,map-empty-region}.json`, add `"backEndFrac": 0.43` to the `finances` object (after `"comfortFrac"`). Example for `map-typical.json`:

```json
		"finances": {
			"incomeMonthly": 6000,
			"expensesMonthly": 3000,
			"debtMonthly": 0,
			"cashOnHand": 90000,
			"savingsMonthly": 1000,
			"comfortFrac": 0.3,
			"backEndFrac": 0.43
		},
```

(Use each fixture's own existing finance values — only add the one `backEndFrac` line.)

- [ ] **Step 7: Run tests + type check to verify green**

Run: `npx vitest run src/lib/state/schema.test.ts && npm run check`
Expected: PASS (all schema tests green; svelte-check reports 0 errors).

- [ ] **Step 8: Commit**

```bash
git add src/lib/model/types.ts src/lib/state/schema.ts src/lib/state/schema.test.ts \
  src/lib/model/evaluate.test.ts src/lib/model/region.test.ts tests/visual/states/
git commit -m "$(cat <<'EOF'
feat: add backEndFrac (back-end DTI) to finance profile

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Two-tier capacity formula + `capacityBreakdown` helper

Rewrites `capacity()` as a three-way min and adds `capacityBreakdown()` which names the binding constraint. Refreshes the region test's manual formula and adds a debt>0 non-empty-region case.

**Files:**
- Modify: `src/lib/model/evaluate.ts:4-16` (capacity + new helper)
- Test: `src/lib/model/evaluate.test.ts` (update comments, add debt>0 + breakdown cases)
- Modify/Test: `src/lib/model/region.test.ts:83` (refresh formula), add case (e)

**Interfaces:**
- Consumes: `FinanceProfile.backEndFrac` (Task 1).
- Produces:
  - `capacity(finances: FinanceProfile, stress: Stress): number` — unchanged signature, new value.
  - `capacityBreakdown(finances: FinanceProfile, stress: Stress): CapacityBreakdown` where `CapacityBreakdown = { frontEnd: number; backEnd: number; solvency: number; capacity: number; binding: 'front-end' | 'back-end' | 'solvency' }`. Consumed by `EnvelopeMap.svelte` (Task 4). Exported via `src/lib/model/index.ts` (already `export * from './evaluate'`).

- [ ] **Step 1: Write the failing capacity + breakdown tests**

In `src/lib/model/evaluate.test.ts`, add `capacityBreakdown` to the import on line 2:

```ts
import { capacity, capacityBreakdown, evaluate } from './evaluate';
```

Add these tests after the existing `describe('capacity', ...)` block:

```ts
describe('capacityBreakdown', () => {
	const reported: FinanceProfile = {
		incomeMonthly: 12_916, expensesMonthly: 1_378, debtMonthly: 4_266,
		cashOnHand: 90_000, savingsMonthly: 1_200, comfortFrac: 0.30, backEndFrac: 0.43,
	};

	it('reported profile: back-end binds at +$1,287.88 (was −$391)', () => {
		const b = capacityBreakdown(reported, zeroStress);
		expect(b.frontEnd).toBeCloseTo(3874.8, 2);   // 0.30 * 12916
		expect(b.backEnd).toBeCloseTo(1287.88, 2);   // 0.43 * 12916 - 4266
		expect(b.solvency).toBeCloseTo(7272, 2);     // 12916 - 1378 - 4266
		expect(b.capacity).toBeCloseTo(1287.88, 2);
		expect(b.binding).toBe('back-end');
	});

	it('capacity() returns the same min', () => {
		expect(capacity(reported, zeroStress)).toBeCloseTo(1287.88, 2);
	});

	it('front-end binds with low debt and low expenses', () => {
		const f: FinanceProfile = { ...finances, expensesMonthly: 1_000 };
		// front 1800, back 2580, solvency 5000
		const b = capacityBreakdown(f, zeroStress);
		expect(b.binding).toBe('front-end');
		expect(b.capacity).toBe(1800);
	});

	it('solvency binds when expenses are high', () => {
		const f: FinanceProfile = { ...finances, expensesMonthly: 5_200 };
		// front 1800, back 2580, solvency 800
		const b = capacityBreakdown(f, zeroStress);
		expect(b.binding).toBe('solvency');
		expect(b.capacity).toBe(800);
	});
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/lib/model/evaluate.test.ts`
Expected: FAIL — `capacityBreakdown` is not exported.

- [ ] **Step 3: Implement the formula + helper**

Replace `src/lib/model/evaluate.ts` lines 4-16 (the doc comment and `capacity` function) with:

```ts
export type BindingConstraint = 'front-end' | 'back-end' | 'solvency';

export interface CapacityBreakdown {
	frontEnd: number; // comfortFrac × I           (housing payment alone)
	backEnd: number;  // backEndFrac × I − debt     (housing payment + existing debt)
	solvency: number; // I − expenses − debt        (never cash-flow negative)
	capacity: number; // min(frontEnd, backEnd, solvency)
	binding: BindingConstraint; // which term equals capacity (front-end wins ties)
}

/**
 * Two-tier DTI breakdown of monthly housing capacity.
 *
 *   I = incomeMonthly − incomeDropMonthly              (stressed take-home)
 *   frontEnd = comfortFrac × I                         (front-end DTI: housing only)
 *   backEnd  = backEndFrac × I − debtMonthly           (back-end DTI: housing + debt)
 *   solvency = I − expensesMonthly − debtMonthly       (cash-flow floor)
 *   capacity = min(frontEnd, backEnd, solvency)
 */
export function capacityBreakdown(finances: FinanceProfile, stress: Stress): CapacityBreakdown {
	const I = finances.incomeMonthly - stress.incomeDropMonthly;
	const frontEnd = finances.comfortFrac * I;
	const backEnd = finances.backEndFrac * I - finances.debtMonthly;
	const solvency = I - finances.expensesMonthly - finances.debtMonthly;
	const capacity = Math.min(frontEnd, backEnd, solvency);
	const binding: BindingConstraint =
		capacity === frontEnd ? 'front-end' : capacity === backEnd ? 'back-end' : 'solvency';
	return { frontEnd, backEnd, solvency, capacity, binding };
}

/**
 * Monthly capacity: how much can be spent on housing loans, tax, and insurance.
 * See capacityBreakdown for the formula. May be ≤ 0 when debt or expenses are too high.
 */
export function capacity(finances: FinanceProfile, stress: Stress): number {
	return capacityBreakdown(finances, stress).capacity;
}
```

- [ ] **Step 4: Update the existing capacity-test comments (values unchanged)**

In `src/lib/model/evaluate.test.ts`, the existing `describe('capacity', ...)` assertions still hold (fixtures use `debt = 0`); update only their comments to the new formula:

```ts
	it('returns min(front-end, back-end, solvency)', () => {
		// min(0.30*6000, 0.43*6000 - 0, 6000 - 3000 - 0) = min(1800, 2580, 3000) = 1800
		expect(capacity(finances, zeroStress)).toBe(1800);
	});

	it('applies income drop stress', () => {
		const stress: Stress = { ...zeroStress, incomeDropMonthly: 500 };
		// I = 5500 → min(1650, 2365, 2500) = 1650
		expect(capacity(finances, stress)).toBe(1650);
	});

	it('returns negative when expenses exceed income (solvency binds)', () => {
		const broke: FinanceProfile = { ...finances, expensesMonthly: 7000 };
		// min(1800, 2580, 6000 - 7000 - 0) = min(1800, 2580, -1000) = -1000
		expect(capacity(broke, zeroStress)).toBe(-1000);
	});
```

- [ ] **Step 5: Refresh the region test's manual formula + add debt>0 case**

In `src/lib/model/region.test.ts`, replace the `cap` line (~line 83) with the three-way min:

```ts
		const cap = Math.min(
			finances.comfortFrac * finances.incomeMonthly,
			finances.backEndFrac * finances.incomeMonthly - finances.debtMonthly,
			finances.incomeMonthly - finances.expensesMonthly - finances.debtMonthly
		);
```

Add a new case at the end of the `describe('region', ...)` block:

```ts
	it('(e) high income + high debt now yields a non-empty region', () => {
		const f: FinanceProfile = {
			incomeMonthly: 12_916, expensesMonthly: 1_378, debtMonthly: 4_266,
			cashOnHand: 90_000, savingsMonthly: 1_200, comfortFrac: 0.30, backEndFrac: 0.43,
		};
		// capacity ≈ 1287.88 > insurance 100 → the monthly constraint admits area
		const poly = region(f, defaultPresets, zeroStress, 0);
		expect(poly.length).toBeGreaterThan(0);
	});
```

- [ ] **Step 6: Run tests + type check to verify green**

Run: `npx vitest run src/lib/model/evaluate.test.ts src/lib/model/region.test.ts && npm run check`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/model/evaluate.ts src/lib/model/evaluate.test.ts src/lib/model/region.test.ts
git commit -m "$(cat <<'EOF'
feat: two-tier DTI capacity with binding-constraint breakdown

capacity = min(front-end, back-end, solvency). Adds capacityBreakdown()
so callers can name which constraint binds. Fixes the negative-capacity
artifact for high-income/high-debt profiles.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Income-drop margin gains the back-end branch

The `incomeDropMonthly` margin in `evaluate()` still uses the old two-branch formula. Extend it to three branches so it matches the new capacity. (Values for the existing debt=0 baseline test are unchanged; a new debt>0 test exercises the back-end branch.)

**Files:**
- Modify: `src/lib/model/evaluate.ts:62-76` (income-drop margin block)
- Test: `src/lib/model/evaluate.test.ts` (new debt>0 margin case)

**Interfaces:**
- Consumes: `capacity()` semantics from Task 2, `FinanceProfile.backEndFrac`.
- Produces: `Evaluation.margins.incomeDropMonthly` (unchanged shape, corrected value when debt>0).

- [ ] **Step 1: Write the failing margin test**

In `src/lib/model/evaluate.test.ts`, inside `describe('evaluate', ...)`, add:

```ts
	it('(f) income-drop margin respects the back-end DTI branch', () => {
		// Debt-heavy profile where back-end is the binding branch on the margin.
		const f: FinanceProfile = {
			incomeMonthly: 12_916, expensesMonthly: 1_378, debtMonthly: 4_266,
			cashOnHand: 200_000, savingsMonthly: 1_200, comfortFrac: 0.30, backEndFrac: 0.43,
		};
		const ev = evaluate(f, parcel, home, defaultPresets, zeroStress, 0);
		// At the margin d, capacity(I - d) must equal monthlyCost (the binding point).
		const stressedCap = capacity(
			{ ...f },
			{ ...zeroStress, incomeDropMonthly: ev.margins.incomeDropMonthly }
		);
		expect(stressedCap).toBeCloseTo(ev.monthlyCost, 2);
	});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/lib/model/evaluate.test.ts -t "back-end DTI branch"`
Expected: FAIL — old margin uses `comfortFrac*I - debt` in branch 1, so `capacity(I - d)` at the reported margin will not equal `monthlyCost`.

- [ ] **Step 3: Implement the three-branch margin**

In `src/lib/model/evaluate.ts`, replace the income-drop margin block (the comment starting `// incomeDropMonthly:` through the `const incomeDropMonthly = ...` line, ~lines 68-76) with:

```ts
	// incomeDropMonthly: max additional drop d such that capacity(I - d) >= monthlyCost.
	// capacity = min(comfortFrac*(I-d), backEndFrac*(I-d) - debt, (I-d) - expenses - debt).
	// Each term ≥ monthlyCost (mc) gives an upper bound on d; take the min:
	//   front-end:  comfortFrac*(I-d) >= mc         → d <= I - mc/comfortFrac
	//   back-end:   backEndFrac*(I-d) - debt >= mc  → d <= I - (mc + debt)/backEndFrac
	//   solvency:   (I-d) - expenses - debt >= mc   → d <= I - expenses - debt - mc
	const I = stressedIncome;
	const mc = costs.monthlyCost;
	const dFront = I - mc / finances.comfortFrac;
	const dBack = I - (mc + finances.debtMonthly) / finances.backEndFrac;
	const dSolvency = I - finances.expensesMonthly - finances.debtMonthly - mc;
	const incomeDropMonthly = Math.max(0, Math.min(dFront, dBack, dSolvency));
```

- [ ] **Step 4: Run tests to verify green (incl. the unchanged baseline (a))**

Run: `npx vitest run src/lib/model/evaluate.test.ts`
Expected: PASS — including the existing test (a) whose `incomeDropMonthly ≈ 296.77` is unchanged (debt=0, front-end branch binds).

- [ ] **Step 5: Commit**

```bash
git add src/lib/model/evaluate.ts src/lib/model/evaluate.test.ts
git commit -m "$(cat <<'EOF'
fix: income-drop margin accounts for the back-end DTI branch

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Constraint-aware empty-region message

The empty-region card in `EnvelopeMap.svelte` currently always says "the monthly constraint binds." Use `capacityBreakdown(...).binding` to name the real limit and its lever. Add a visual-QA fixture for the "back-end debt binds" state.

**Files:**
- Modify: `src/lib/components/map/EnvelopeMap.svelte:3,26,28-37` (**via `svelte-file-editor` agent**)
- Create: `tests/visual/states/back-end-debt-binds.json`

**Interfaces:**
- Consumes: `capacityBreakdown` from `$lib/model` (Task 2).

- [ ] **Step 1: Create the visual-QA fixture**

Create `tests/visual/states/back-end-debt-binds.json`:

```json
{
	"name": "back-end-debt-binds",
	"state": {
		"v": 1,
		"finances": {
			"incomeMonthly": 6000,
			"expensesMonthly": 1000,
			"debtMonthly": 2600,
			"cashOnHand": 40000,
			"savingsMonthly": 1000,
			"comfortFrac": 0.3,
			"backEndFrac": 0.43
		},
		"presets": {
			"land": { "downFrac": 0.25, "annualRatePct": 8.0, "termMonths": 180 },
			"home": { "downFrac": 0.15, "annualRatePct": 9.5, "termMonths": 180 },
			"closingFrac": 0.03,
			"taxAnnualPct": 1.0,
			"insuranceMonthly": 100
		},
		"parcels": [{ "id": "p1", "name": "Ridge 5ac", "landPrice": 80000 }],
		"homes": [{ "id": "h1", "name": "Escape One", "homeCost": 100000, "siteWork": 40000 }],
		"muted": [],
		"selected": null,
		"stress": { "rateDeltaPct": 0, "siteWorkOverrunFrac": 0, "incomeDropMonthly": 0 },
		"timeMonths": 0
	},
	"viewport": { "width": 1440, "height": 900 }
}
```

This profile: front 1800, back `0.43*6000 - 2600 = -20`, solvency `6000-1000-2600 = 2400` → capacity −20, binding back-end, income (6000) > expenses (1000). Region is empty and the back-end message shows.

- [ ] **Step 2: Edit `EnvelopeMap.svelte` via the svelte-file-editor agent**

Dispatch the `svelte-file-editor` agent with these exact changes to `src/lib/components/map/EnvelopeMap.svelte`:

Change the model import (line 3) from `import { region, capacity } from '$lib/model';` to:

```ts
	import { region, capacityBreakdown } from '$lib/model';
```

Replace the `cap` derived (line 26):

```ts
	const breakdown = $derived(capacityBreakdown(app.finances, app.stress));
```

Replace the `emptyMessage` derived (lines 28-37) with:

```ts
	const emptyMessage = $derived.by((): { title: string; body: string } | null => {
		if (polyAtMax.length >= 3) return null;
		if (incomeBelowExpenses) {
			return { title: 'Income doesn’t cover expenses', body: 'The map needs a monthly surplus — income minus expenses is what funds any housing payment.' };
		}
		const insurance = `${fullDollar(app.presets.insuranceMonthly)}/mo`;
		const budget = `${fullDollar(breakdown.capacity)}/mo`;
		if (breakdown.binding === 'back-end') {
			return {
				title: 'Existing debt is the limit',
				body: `Your ${fullDollar(app.finances.debtMonthly)}/mo of existing debt uses up your back-end budget, leaving ${budget} for a home — below the ${insurance} insurance floor. Pay down debt or raise the back-end DTI limit.`
			};
		}
		if (breakdown.binding === 'solvency') {
			return {
				title: 'Nothing is affordable at these settings',
				body: `After expenses and existing debt, only ${budget} remains — below the ${insurance} insurance floor.`
			};
		}
		return {
			title: 'Nothing is affordable at these settings',
			body: `At a ${Math.round(app.finances.comfortFrac * 100)}% comfort threshold your home budget is ${budget} — below the ${insurance} insurance floor. Raise the comfort threshold to allow more.`
		};
	});
```

The agent must run the svelte-autofixer MCP validation and confirm no issues before returning.

- [ ] **Step 3: Type check**

Run: `npm run check`
Expected: PASS — 0 errors (confirms `capacity` import is no longer referenced and `capacityBreakdown` types line up).

- [ ] **Step 4: Run visual QA and read the screenshots**

Run: `node scripts/visual-qa.mjs`
Then read `.visual-qa/back-end-debt-binds.png` (new) and `.visual-qa/map-empty-region.png`. Confirm:
- `back-end-debt-binds` shows the "Existing debt is the limit" card with the debt figure and the pay-down/raise-limit guidance.
- `map-empty-region` still renders its expected empty state (binding branch text is coherent).
- No other fixture regressed (spot-check `map-typical.png`).

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/map/EnvelopeMap.svelte tests/visual/states/back-end-debt-binds.json
git commit -m "$(cat <<'EOF'
feat: constraint-aware empty-region message

Names the binding constraint (back-end debt / front-end comfort /
solvency) and its lever instead of the generic "monthly constraint binds".

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review

**Spec coverage:**
- New capacity formula → Task 2 ✓
- `comfortFrac` meaning narrows (doc) → Task 1 Step 3 ✓
- `backEndFrac` preset default 0.43 → Task 1 ✓
- `capacityBreakdown` helper → Task 2 ✓
- Income-drop third branch → Task 3 ✓
- Region no structural change (scalar) → verified in Task 2 Step 5 ✓
- Empty-message constraint-aware → Task 4 ✓
- State: field + validator, no back-compat, `v:1` → Task 1 ✓
- Golden values (reported / front / solvency) → Task 2 Step 1 ✓
- Margin debt>0 case → Task 3 ✓
- Region debt>0 non-empty case → Task 2 Step 5 ✓
- Visual fixture "debt binds" → Task 4 ✓
- Out of scope (rental income, back-end UI slider) → not planned ✓

**Placeholder scan:** No TBD/TODO; every code step shows complete code. ✓

**Type consistency:** `capacityBreakdown` returns `{ frontEnd, backEnd, solvency, capacity, binding }` in Task 2 and is consumed with those exact names in Task 4. `backEndFrac` field name consistent across Tasks 1–4. `BindingConstraint` union `'front-end' | 'back-end' | 'solvency'` matches the `binding ===` checks in Task 4. ✓
