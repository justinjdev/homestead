# Homestead v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **For fellowship:** each "Quest" section below is one quest. Quests 1–3 run in parallel; Quest 4 starts after Quest 1; Quests 5–6 after Quests 2 and 4; Quest 7 last. Quest 1 and 4 use the `model-work` template where noted; Quests 2, 5, 6 use `svelte-component`.

**Goal:** A static SvelteKit site that renders the user's finances as an affordability envelope on a land-price × improvement-budget plane, with parcels and home options plotted as combo dots, time contours, stress sliders, margins of safety, and shareable URL state.

**Architecture:** Pure-TS financial model (`src/lib/model/`) → runes store + persistence (`src/lib/state/`) → hand-rolled SVG map and panels (`src/lib/components/`). Single prerendered route. See `docs/superpowers/specs/2026-07-05-affordability-map-design.md` (product, source of truth) and `2026-07-05-build-system-design.md` (process).

**Tech Stack:** SvelteKit + adapter-static, Svelte 5 runes, TypeScript, Vitest, Playwright (visual QA harness only), GitHub Pages.

## Global Constraints

- `dependencies` in package.json stays **empty**. devDependencies only.
- `src/lib/model/` and `src/lib/state/schema.ts`/`codec.ts` import nothing from `svelte`, `@sveltejs/*`, or `$app/*`.
- Svelte 5 runes only (`$state`, `$derived`, `$effect`); no legacy stores, no `export let`.
- Every `.svelte`/`.svelte.ts` file is created/edited via the `svelte-file-editor` agent.
- Colors/fonts/spacing only via CSS variables from `src/lib/styles/tokens.css`.
- Base path: never hardcode `/homestead`; use `base` from `$app/paths`; build with `BASE_PATH=/homestead` for prod.
- URL hash contract: `base64url(JSON.stringify(state))`, state shape `{v: 1, ...}` (schema below).
- All money in dollars (floats), all rates as **annual percent** (e.g. `8.0`), all shares/fractions 0–1 (e.g. `downFrac: 0.25`), terms in months. Suffixes: `...Pct` = percent number, `...Frac` = 0–1 fraction, `...Monthly` = $/month.
- Commits: small, per task step, conventional style (`feat:`, `test:`, `chore:`).

## Shared type vocabulary (defined in Quest 1 Task 1; all quests use these exact names)

```ts
// src/lib/model/types.ts
export interface FinanceProfile {
	incomeMonthly: number;    // take-home $/mo
	expensesMonthly: number;  // excluding current housing
	debtMonthly: number;      // existing obligations $/mo
	cashOnHand: number;
	savingsMonthly: number;
	comfortFrac: number;      // max share of income for all-in housing, default 0.30
}

export interface LoanTerms {
	downFrac: number;         // 1 = cash purchase (no loan)
	annualRatePct: number;
	termMonths: number;
}

export interface Presets {
	land: LoanTerms;          // default { downFrac: 0.25, annualRatePct: 8.0, termMonths: 180 }
	home: LoanTerms;          // default { downFrac: 0.15, annualRatePct: 9.5, termMonths: 180 }
	closingFrac: number;      // of land price, default 0.03
	taxAnnualPct: number;     // of (land price + home cost), default 1.0
	insuranceMonthly: number; // default 100
}

export interface Parcel {
	id: string;               // crypto.randomUUID()
	name: string;
	landPrice: number;
	taxAnnualPct?: number;    // per-parcel override
	closingFrac?: number;     // per-parcel override
}

export interface HomeOption {
	id: string;
	name: string;
	homeCost: number;
	siteWork: number;
}

export interface Stress {
	rateDeltaPct: number;         // added to BOTH loans' annualRatePct, 0–10
	siteWorkOverrunFrac: number;  // site work multiplied by (1 + this), 0–1
	incomeDropMonthly: number;    // subtracted from incomeMonthly, ≥ 0
}

export interface Evaluation {
	cashNeeded: number;
	cashAvailable: number;        // cashOnHand + savingsMonthly * tMonths
	monthlyCost: number;          // loans + tax + insurance (excludes existing debt)
	monthlyCapacity: number;      // see formula in Quest 1 Task 3
	pctOfIncome: number;          // (monthlyCost + debtMonthly) / stressed income
	cashOk: boolean;
	monthlyOk: boolean;
	verdict: 'in' | 'out';
	readyInMonths: number | null; // null when monthlyOk is false or savings can't close the gap
	notReachableReason: 'monthly' | 'no-savings' | null;
	margins: {
		siteWorkOverrunFrac: number | null; // max extra overrun beyond current stress; null if no site work
		rateRisePct: number | null;         // max additional rate rise; null if both loans are cash
		incomeDropMonthly: number;          // max additional income drop
	};
}

export type Polygon = Array<[number, number]>; // [landPrice, improvementBudget], CCW, [] if empty
```

---

## Quest 1: Financial model (`model-work` template)

All files pure TS. TDD throughout: each task writes the failing test first, runs it (`npm run test`), implements, re-runs, commits.

### Task 1.1: Types + payment math

**Files:** Create `src/lib/model/types.ts` (exact content above), `src/lib/model/payment.ts`, `src/lib/model/payment.test.ts`.

**Produces:** `payment(principal: number, annualRatePct: number, termMonths: number): number` and `paymentFactor(annualRatePct: number, termMonths: number): number` (= payment per dollar of principal).

- [ ] Write failing tests with these golden values (sources: standard amortization formula, cross-checked against published calculator tables; tolerance ±0.05):

```ts
import { describe, expect, it } from 'vitest';
import { payment, paymentFactor } from './payment';

describe('payment', () => {
	it('matches golden amortization values', () => {
		expect(payment(200_000, 6.0, 360)).toBeCloseTo(1199.10, 1);
		expect(payment(100_000, 8.0, 180)).toBeCloseTo(955.65, 1);
		expect(payment(50_000, 9.5, 180)).toBeCloseTo(522.11, 1);
	});
	it('uses straight-line at 0% rate', () => {
		expect(payment(12_000, 0, 60)).toBe(200);
	});
	it('paymentFactor is payment per dollar', () => {
		expect(paymentFactor(8.0, 180) * 100_000).toBeCloseTo(payment(100_000, 8.0, 180), 6);
	});
});
```

- [ ] Run `npm run test` — expect FAIL (module missing).
- [ ] Implement: `const r = annualRatePct / 100 / 12; return r === 0 ? principal / termMonths : (principal * r) / (1 - Math.pow(1 + r, -termMonths));`
- [ ] Run `npm run test` — expect PASS. Commit `feat: payment math with golden-value tests`.

### Task 1.2: Per-combo cost breakdown

**Files:** Create `src/lib/model/costs.ts`, `src/lib/model/costs.test.ts`.

**Produces:**

```ts
export interface ComboCosts { landDown: number; homeDown: number; closing: number; siteWorkCash: number; cashNeeded: number; landPayment: number; homePayment: number; taxMonthly: number; monthlyCost: number; }
export function comboCosts(parcel: Parcel, home: HomeOption, presets: Presets, stress: Stress): ComboCosts
```

Rules (from spec "Core concept" + "Simplifications"): site work is paid cash and scaled by `(1 + stress.siteWorkOverrunFrac)`; closing = `(parcel.closingFrac ?? presets.closingFrac) * landPrice`; tax = `(parcel.taxAnnualPct ?? presets.taxAnnualPct) / 100 * (landPrice + homeCost) / 12` (site work excluded from basis); loans use `annualRatePct + stress.rateDeltaPct`; `downFrac === 1` means no loan (payment 0, down = full price); `monthlyCost = landPayment + homePayment + taxMonthly + presets.insuranceMonthly`.

- [ ] Failing test: parcel `{landPrice: 80_000}`, home `{homeCost: 100_000, siteWork: 40_000}`, default presets, zero stress. Expected (compute in test with exported `payment`): landDown 20 000, closing 2 400, homeDown 15 000, siteWorkCash 40 000, cashNeeded 77 400; landPayment = payment(60 000, 8.0, 180) ≈ 573.39; homePayment = payment(85 000, 9.5, 180) ≈ 887.58; taxMonthly = 150; monthlyCost ≈ 1 710.97. Also test: stress `{rateDeltaPct: 2, siteWorkOverrunFrac: 0.5, incomeDropMonthly: 0}` changes payments and siteWorkCash 60 000; cash-purchase home (`downFrac: 1`) → homePayment 0, homeDown 100 000.
- [ ] Implement, pass, commit `feat: combo cost breakdown`.

### Task 1.3: Capacity + evaluate

**Files:** Create `src/lib/model/evaluate.ts`, `src/lib/model/evaluate.test.ts`.

**Produces:** `capacity(finances: FinanceProfile, stress: Stress): number` and `evaluate(finances, parcel, home, presets, stress, tMonths): Evaluation`.

Formulas:
- stressed income `I = incomeMonthly - incomeDropMonthly`
- `capacity = min(comfortFrac * I, I - expensesMonthly) - debtMonthly` (may be ≤ 0)
- `cashOk = cashNeeded ≤ cashOnHand + savingsMonthly * tMonths`
- `monthlyOk = monthlyCost ≤ capacity`
- `readyInMonths`: if `!monthlyOk` → null, reason `'monthly'`. Else if cash short and `savingsMonthly ≤ 0` → null, reason `'no-savings'`. Else `Math.max(0, Math.ceil((cashNeeded - cashOnHand) / savingsMonthly))`.
- Margins (beyond current stress): `siteWorkOverrunFrac = cashSlack / (home.siteWork)` where `cashSlack = cashAvailable - cashNeeded` (null if siteWork is 0); `incomeDropMonthly`: capacity falls by `min(comfortFrac, 1)`… careful — capacity is a min of two linear functions of I with slopes `comfortFrac` and `1`; solve exactly: the max drop `d` satisfying `capacity(I - d) ≥ monthlyCost` is `d = min((comfortFrac*I - debt - monthlyCost)/comfortFrac, (I - expenses - debt - monthlyCost)/1)` clamped ≥ 0; `rateRisePct`: smallest Δ where monthlyCost(rate + Δ) > capacity found by bisection on Δ ∈ [0, 30], 40 iterations, return null if both loans have `downFrac === 1`.

- [ ] Failing tests: (a) the Task 1.2 combo with finances `{incomeMonthly: 6000, expensesMonthly: 3000, debtMonthly: 0, cashOnHand: 90_000, savingsMonthly: 1000, comfortFrac: 0.30}`, t=0 → capacity 1800, monthlyOk true (1710.97 ≤ 1800), cashOk true (77 400 ≤ 90 000), verdict `'in'`; incomeDrop margin = min((1800−1710.97)/0.3, (3000−1710.97)) = min(296.77, 1289.03) ≈ 296.77. (b) cashOnHand 50 000 → cashOk false, readyInMonths = ceil(27 400/1000) = 28. (c) savingsMonthly 0 + cash short → reason `'no-savings'`. (d) expensesMonthly 7000 → capacity < 0, verdict `'out'`, reason `'monthly'`. (e) rate margin: bisection result Δ where landPayment+homePayment grows by slack ≈ 89.03; assert `monthlyCost` recomputed at `rateDeltaPct + margin` ≈ capacity within $0.50.
- [ ] Implement, pass, commit `feat: evaluate combos with margins and time-to-afford`.

### Task 1.4: Region polygon

**Files:** Create `src/lib/model/region.ts`, `src/lib/model/region.test.ts`.

**Produces:** `region(finances: FinanceProfile, presets: Presets, stress: Stress, tMonths: number, siteWorkFrac?: number): Polygon` — `siteWorkFrac` (default **0.25**) is the assumed share of improvement budget `y` that is site work (cash); the rest is financed home.

Derivation (must appear as a comment in the file): with `s = siteWorkFrac`, `ov = 1 + stress.siteWorkOverrunFrac`, `kL/kH = paymentFactor(rate + Δ, term)`, `taxM = taxAnnualPct/100/12`:
- Cash: `x·(land.downFrac + closingFrac) + y·(s·ov + (1−s)·home.downFrac) ≤ cashOnHand + savingsMonthly·t`
- Monthly: `x·((1−land.downFrac)·kL + taxM) + y·(1−s)·((1−home.downFrac)·kH + taxM) ≤ capacity − insuranceMonthly`

Both are half-planes `a·x + b·y ≤ c` with `a,b > 0`. Region = first quadrant ∩ both. Implement `clipQuadrant(constraints: Array<{a,b,c}>): Polygon` by Sutherland–Hodgman starting from a huge quad `[[0,0],[M,0],[M,M],[0,M]]`, `M = 10^8`. Return `[]` when any `c < 0`.

- [ ] Failing tests: (a) single constraint `x + y ≤ 100` → triangle `[[0,0],[100,0],[0,100]]`. (b) two constraints `x + y ≤ 100`, `x + 3y ≤ 150` → quadrilateral with intersection vertex `[75, 25]`. (c) capacity ≤ insurance → `[]`. (d) default finances/presets from Task 1.3(a): region non-empty, every vertex satisfies both inequalities within 1e-6, and `region(..., t=12)` strictly contains the t=0 x-intercept. (e) order is CCW starting at `[0,0]`.
- [ ] Implement, pass, commit `feat: envelope region polygon`.

### Task 1.5: Barrel + purity check

**Files:** Create `src/lib/model/index.ts` re-exporting everything.

- [ ] `grep -rn "svelte\|\\$app" src/lib/model/` → no matches. `npm run test && npm run check` pass. Commit `chore: model barrel export`.

---

## Quest 2: Design system (`svelte-component` template)

### Task 2.1: Tokens, fonts, global styles

**Files:** Create `src/lib/styles/tokens.css`, `src/lib/styles/global.css`, `static/fonts/*.woff2`; modify `src/routes/+layout.svelte` (import both CSS files), `src/app.html` (font preload links).

Aesthetic (spec "Aesthetic" + CLAUDE.md): surveyor's plat-map. Light aged-paper field, ink linework, one signal accent for stake flags. Required tokens (exact names; components depend on them):

```css
:root {
	/* paper + ink */
	--paper: #f4efe3;        /* aged drafting paper */
	--paper-raised: #faf6ec;
	--ink: #2b2a24;          /* warm near-black */
	--ink-faint: #8a8574;
	--line-survey: #6b7f5e;  /* contour/section-line green */
	--region-fill: #6b7f5e26;
	--edge-cash: #a8672f;    /* cash-constraint edge, burnt sienna */
	--edge-monthly: #46628a; /* monthly-constraint edge, slate blue */
	--flag: #c8442c;         /* stake-flag accent (out) */
	--flag-in: #3d6b35;      /* stake-flag accent (in) */
	--font-display: 'Bricolage Grotesque', serif;  /* headings, verdicts */
	--font-body: 'Besley', serif;                  /* labels, prose */
	--font-figures: 'Spline Sans Mono', monospace; /* all numbers */
	--space-1: 4px; --space-2: 8px; --space-3: 16px; --space-4: 24px; --space-5: 40px;
	--radius: 3px;
	--hairline: 1px solid color-mix(in srgb, var(--ink) 25%, transparent);
}
```

Fonts: download woff2 (latin subset) for Bricolage Grotesque (700), Besley (400, 600 italic), Spline Sans Mono (400, 600) from Google Fonts (`https://fonts.googleapis.com/css2?family=...` → follow woff2 URLs), self-host in `static/fonts/`, `@font-face` in global.css with `font-display: swap`. No runtime font CDN requests. Global styles: paper background with a faint CSS-only graph grid (two layered `linear-gradient`s at 1px, `--ink` at 5% opacity, 24px cells), body in `--font-body`, `h1–h6` in `--font-display` letterspaced small-caps style for a cartouche feel.

- [ ] Implement (CSS files are not `.svelte` — direct edits fine; `+layout.svelte` via svelte-file-editor).
- [ ] Update `src/routes/+page.svelte` placeholder to render `<h1>Homestead</h1>` + one paragraph of each font/figure style so the checkpoint screenshot exercises all three fonts.
- [ ] Run `node scripts/visual-qa.mjs default`, Read the PNG: paper grid visible, three distinct non-system fonts render, tokens applied.
- [ ] Commit `feat: plat-map design system (tokens, self-hosted fonts, global styles)`.
- [ ] **HUMAN GATE (aesthetic checkpoint):** post the screenshot for user review before Quests 5–6 consume the tokens. Blocking.

---

## Quest 3: CI + GitHub Pages deploy

### Task 3.1: Workflow

**Files:** Create `.github/workflows/deploy.yml`.

```yaml
name: deploy
on:
  push: { branches: [main] }
  workflow_dispatch: {}
permissions: { contents: read, pages: write, id-token: write }
concurrency: { group: pages, cancel-in-progress: true }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm run test
      - run: npm run check
      - run: BASE_PATH=/homestead npm run build
      - uses: actions/upload-pages-artifact@v3
        with: { path: build }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: { name: github-pages, url: "${{ steps.deployment.outputs.page_url }}" }
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] Validate locally: `BASE_PATH=/homestead npm run build && grep -rl '/homestead' build/_app/immutable | head -1` (must match).
- [ ] Commit `chore: GitHub Pages deploy workflow`. Note in quest report: repo must be renamed `homestead` on GitHub and Pages source set to "GitHub Actions" (manual, user action).

---

## Quest 4: State + persistence (schema/codec via `model-work` discipline; store task follows runes rules)

### Task 4.1: Schema + defaults

**Files:** Create `src/lib/state/schema.ts`, `src/lib/state/schema.test.ts`.

**Produces:**

```ts
import type { FinanceProfile, HomeOption, Parcel, Presets, Stress } from '$lib/model/types';
// NOTE: $lib/model is pure TS; importing types from it is allowed everywhere.

export interface AppState {
	v: 1;
	finances: FinanceProfile;
	presets: Presets;
	parcels: Parcel[];
	homes: HomeOption[];
	muted: string[];            // combo keys `${parcelId}:${homeId}`
	selected: string | null;    // combo key
	stress: Stress;
	timeMonths: number;         // 0–24
}
export function defaultState(): AppState; // finances {6000, 3000, 0, 40000, 1000, 0.30}, presets per spec, empty lists, zero stress, timeMonths 0
export function comboKey(parcelId: string, homeId: string): string;
export function validateState(x: unknown): x is AppState; // v===1, all numeric fields finite & ≥ 0 (comfortFrac 0–1), arrays well-shaped; unknown extra keys rejected
```

- [ ] Failing tests: `validateState(defaultState())` true; mutated copies (v:2, `incomeMonthly: NaN`, parcel missing `landPrice`, extra top-level key) all false.
- [ ] Implement, pass, commit `feat: app state schema, defaults, validation`.

### Task 4.2: Hash codec

**Files:** Create `src/lib/state/codec.ts`, `src/lib/state/codec.test.ts`.

**Produces:** `encodeState(s: AppState): string`, `decodeState(hash: string): AppState | null`.

Contract (CLAUDE.md hard rule 4): `base64url(JSON.stringify(state))`, no padding. Browser-safe unicode: `TextEncoder` → binary string → `btoa`, then `+→-`, `/→_`, strip `=`. Decode reverses, `validateState` gates, any throw → `null`. Must work in Node (Vitest) too: feature-detect `globalThis.btoa` else `Buffer`.

- [ ] Failing tests: round-trip `defaultState()`; round-trip a state with unicode parcel name `"5 acres — 'Bächli' 🏕"`; `decodeState('!!!')` null; `decodeState(encode of {v:2})` null; encoded string matches `/^[A-Za-z0-9_-]+$/`; Node/Buffer path equals `Buffer.from(json).toString('base64url')` exactly (this pins compatibility with `scripts/visual-qa.mjs`).
- [ ] Implement, pass, commit `feat: URL hash codec`.

### Task 4.3: Runes store + localStorage + hash import

**Files:** Create `src/lib/state/store.svelte.ts` (via svelte-file-editor). Test: none automated (browser APIs); verified in Quest 7 fixtures.

**Produces (exact exports consumed by all components):**

```ts
export const app: AppState;                       // deep $state proxy
export function initPersistence(): void;          // call once from +page.svelte onMount:
//   1. location.hash present? decodeState → if valid, set pendingImport = decoded (do NOT apply yet)
//   2. else load localStorage['homestead:v1'] if validateState passes
//   3. $effect root: on any app change, debounce 250ms → localStorage.setItem
export const pendingImport: { state: AppState | null }; // $state; DetailPanel-level banner consumes
export function acceptImport(): void;             // apply pendingImport into app, clear hash
export function dismissImport(): void;            // clear pendingImport + hash, keep saved data
export function shareUrl(): string;               // location.origin + base + '/#' + encodeState(app)
// convenience mutators used by panels:
export function addParcel(p: Omit<Parcel, 'id'>): void;
export function addHome(h: Omit<HomeOption, 'id'>): void;
export function removeParcel(id: string): void;   // also drops muted/selected keys referencing it
export function removeHome(id: string): void;
export function toggleMuted(key: string): void;
```

localStorage unavailable (throws): wrap in try/catch, set `export const storageWarning: {active: boolean}` true, keep in-memory (spec edge case).

- [ ] Implement, `npm run check` passes, commit `feat: runes store with localStorage sync and link import`.

---

## Quest 5: Envelope map (`svelte-component` template)

Layout constants for all map code: SVG `viewBox="0 0 960 640"`, plot margins `{top: 24, right: 24, bottom: 48, left: 76}`.

### Task 5.1: Scales (pure TS)

**Files:** Create `src/lib/map/scale.ts`, `src/lib/map/scale.test.ts`.

**Produces:** `niceCeil(n: number): number` (smallest 1/2/5 × 10^k ≥ n; niceCeil(0) = 1000); `makeScale(domainMax: number, rangePx: number): (v: number) => number` (linear, 0-based); `domains(polys: Polygon[], parcels: Parcel[], homes: HomeOption[]): {xMax, yMax}` — 1.25 × max over all polygon vertices, parcel prices, home `homeCost + siteWork`, floor 50 000, then `niceCeil`; `ticks(max: number): number[]` (5 even ticks incl. 0 and max).

- [ ] TDD as usual: `niceCeil(73_000) === 100_000`, `niceCeil(180_000) === 200_000`, `niceCeil(420_000) === 500_000`; domain floor case. Commit `feat: map scales`.

### Task 5.2: Map components

**Files (each via svelte-file-editor):** Create `src/lib/components/map/EnvelopeMap.svelte` (owns scales + composition), `Axes.svelte`, `Region.svelte`, `Contours.svelte`, `GuideLines.svelte`, `ComboDots.svelte`, `Probe.svelte`. All consume `app` from `$lib/state/store.svelte` and `region`/`evaluate` from `$lib/model` via `$derived` — no local money math.

Contracts:
- **Region:** polygon at `app.timeMonths` filled `--region-fill`; cash edge stroked `--edge-cash`, monthly edge `--edge-monthly` (identify edges: cash edge endpoints satisfy cash constraint with equality). Region morphs are animated via CSS transition on `d` (or `points`) where supported — CSS-only.
- **Contours:** polygons at t = 0, 6, 12, 18, 24, stroked `--line-survey`, opacity descending (0.9 → 0.25), no fill, dashed `4 3`; small rotated month labels along the outermost segment, `--font-figures`.
- **GuideLines:** per parcel a vertical hairline at its price with name label along the line (top); per home a horizontal hairline at `homeCost + siteWork`.
- **ComboDots:** one dot per unmuted parcel×home at `[landPrice, homeCost + siteWork]`, rendered as a stake-flag marker (6px circle + 10px flag path), `--flag-in` when `evaluate(...).verdict === 'in'` else `--flag`; badge text next to out-dots: `in ${readyInMonths} mo` when reachable. Click selects (`app.selected = comboKey(...)`). Selected dot gets a double ring.
- **Probe:** pointermove shows crosshair + readout box (land $, improvement $, in/out at current t) using `--paper-raised` card; click on empty map space opens a small inline form ("Save as parcel + home?") that calls `addParcel`/`addHome` with the probed values.
- **Axes:** ticks from `ticks()`, `$` compact labels (`$150k`), axis titles "LAND PRICE" / "HOME + SITE WORK", letterspaced caps.
- **EnvelopeMap:** composes the above; time slider (`<input type=range min=0 max=24 step=1>`) bound to `app.timeMonths` in the map header, styled as a surveyor's chain.

- [ ] Implement components; `npm run check` passes.
- [ ] Add fixtures `tests/visual/states/map-typical.json` (finances from Quest 1 Task 1.3(a), 2 parcels: "Ridge 5ac" 80 000 / "Creek 10ac" 140 000, 2 homes: "Escape One" 100 000 + 40 000 / "Used park model" 55 000 + 35 000, one combo muted, selected `"<ridge>:<escape>"`, timeMonths 6) and `map-empty-region.json` (expensesMonthly 7000). Note: fixture IDs are literal strings like `"p1"`, `"h1"` — fine, `crypto.randomUUID()` only guards new UI entries.
- [ ] `node scripts/visual-qa.mjs map-typical map-empty-region`, Read PNGs against the visual-qa skill checklist (region, contours, dots, badges, empty-region message).
- [ ] Commit `feat: envelope map with contours, guide lines, combo dots, probe`.

### Task 5.3: Empty/degenerate messaging

**Files:** Modify `EnvelopeMap.svelte`.

- [ ] When `region(...) === []` at t=24: overlay a `--paper-raised` card: "Nothing is affordable at these settings — your monthly capacity is $X against a minimum cost of $Y" (numbers from `capacity()` and insurance; name the binding constraint). When `incomeMonthly - incomeDropMonthly ≤ expensesMonthly`: "Income doesn't cover expenses — the map needs a monthly surplus." Verify with `map-empty-region` fixture screenshot. Commit `feat: honest empty-region states`.

---

## Quest 6: Panels + composition (`svelte-component` template)

All components via svelte-file-editor; all numbers displayed in `--font-figures`; all data via store + `$lib/model`.

### Task 6.1: Finances panel

**Files:** Create `src/lib/components/FinancesPanel.svelte`.

Six labeled inputs bound to `app.finances` (`comfortFrac` as a 15–50% range slider). Collapsible (`<details>`): when collapsed shows summary line `"$6.0k/mo · $40k cash · saving $1.0k/mo"`. Starts expanded when `app.finances` equals defaults (first visit heuristic). Commit `feat: finances panel`.

### Task 6.2: Dock (parcels + homes lists)

**Files:** Create `src/lib/components/Dock.svelte`.

Two columns: parcels and homes. Each row: name, price(s), edit-in-place inputs, remove button. Add-row forms (name + numbers) calling `addParcel`/`addHome`. Below: combo chips (parcel × home grid) with verdict text from `evaluate` (`IN` / `OUT` / `in 14 mo`), click = select, small mute toggle per chip. Commit `feat: dock with parcel/home lists and combo chips`.

### Task 6.3: Detail panel + site-work estimator

**Files:** Create `src/lib/components/DetailPanel.svelte`, `src/lib/components/SiteWorkDrawer.svelte`.

DetailPanel for `app.selected` (placeholder text when null): parcel/home pickers (`<select>` over lists), financing editors (down %, rate %, term years) bound to `app.presets.land/home` plus per-parcel tax/closing overrides, upfront breakdown table (rows from `comboCosts`: land down, closing, home down, site work, total vs available), monthly breakdown table (land payment, home payment, tax, insurance, total vs capacity), margins block ("Survives: site work +42% · rate to 11.5% · income −$297/mo" from `evaluate().margins`), readiness badge. Import banner: when `pendingImport.state` non-null render "Opened from a link — keep it?" with Accept/Dismiss buttons wired to `acceptImport`/`dismissImport`. Share button copying `shareUrl()` to clipboard with "copied" flash.

SiteWorkDrawer (inside DetailPanel, `<details>`): checklist rows with editable amounts, defaults: well 12 000, septic 18 000, driveway 8 000, grading/pad 6 000, power run 12 000, permits/fees 4 000; checkbox includes row; "+15% contingency" toggle; footer "Apply $X to <home name>" sets `home.siteWork`. Commit `feat: detail panel, margins, share, site-work estimator`.

### Task 6.4: Stress strip

**Files:** Create `src/lib/components/StressStrip.svelte`.

Three range sliders bound to `app.stress`: rate +0–5% (step 0.25), site-work overrun 0–100% (step 5), income −$0–2000 (step 50); live value labels; reset button zeroing all three; strip gets a hazard-tint left border when any is nonzero. Commit `feat: stress strip`.

### Task 6.5: Page composition

**Files:** Modify `src/routes/+page.svelte` (replace placeholder), `src/routes/+layout.svelte` if needed.

Grid: header cartouche (title "HOMESTEAD", subtitle "an affordability survey"), left rail FinancesPanel (280px), center EnvelopeMap, right rail DetailPanel (320px), StressStrip full-width below map, Dock bottom full-width. `onMount(initPersistence)`. `storageWarning` toast. Page-load stagger: CSS `animation-delay` reveals (header → map → rails → dock). Single-column stack under 1100px. Commit `feat: page composition`.

- [ ] Add fixtures: `panels-selected.json` (map-typical + selected combo), `stressed.json` (rate +2, overrun 50%, income −500), `income-below-expenses.json`. Run full `node scripts/visual-qa.mjs`, Read all PNGs against the checklist. Commit `test: visual fixtures for panels and stress`.

---

## Quest 7: Integration, review sweep, deploy check

- [ ] **Fixture completeness:** ensure the recommended set exists (default, map-typical, map-empty-region, panels-selected, stressed, income-below-expenses); full visual QA run; judge every PNG.
- [ ] **Model/UI cross-check:** in the `stressed` screenshot confirm the region is visibly smaller than `map-typical` and margins text changed accordingly.
- [ ] `npm run test && npm run check` green.
- [ ] **Review sweep:** dispatch pr-review-toolkit agents — code-reviewer, silent-failure-hunter (hash/storage paths), type-design-analyzer (model + schema types) — plus `superpowers:requesting-code-review`. Address Critical/High findings.
- [ ] **Deploy check:** run the `/deploy-check` command steps (prod build, base-path grep, preview serve, asset 200s, seeded-state screenshot against preview).
- [ ] **README.md:** what it is, screenshot, "all data stays in your browser," dev commands, deploy notes (repo rename to `homestead`, Pages source = GitHub Actions).
- [ ] **HUMAN GATE (final):** present summary + screenshots; user merges/pushes to deploy.

---

## Self-review notes

- Spec coverage: all v1 features (map, contours, margins, estimator, share URLs, stress, parcels×homes, probe, edge cases) have tasks; deferred list untouched.
- Type names consistent across quests (`comboKey`, `Evaluation.margins`, token names, store exports).
- The one deliberate deviation: spec says margins are "closed-form"; rate margin is bisection because payment factor is nonlinear in rate — noted in Quest 1 Task 1.3.
