# Dock: Listing Links, Field Labels, Currency `$` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let parcels/homes carry a source-listing URL (opened from the dock), label the dock money columns, and give every money input a consistent `$` affordance.

**Architecture:** An optional `url` field on `Parcel`/`HomeOption`, strictly validated to http(s) in `schema.ts` (guards the shared-hash XSS surface). A new reusable `MoneyInput.svelte` owns the `$` adornment, adopted by the dock and Finances panel. The dock gains a per-row link control with a draft-committing inline editor and column captions.

**Tech Stack:** TypeScript (pure model + state validation), Svelte 5 runes, Vitest, Playwright visual QA.

## Global Constraints

- **Zero runtime dependencies** (package.json `dependencies` stays empty).
- **Model purity:** `src/lib/model/` imports no Svelte/SvelteKit/`$app/*`. (`schema.ts` is in `state/`, not `model/` — it may use `new URL()`.)
- **Svelte 5 runes only** (`$props`/`$state`/`$derived`/`$bindable`); no stores, `export let`, or `$:`.
- **Design tokens only** in components — colors from CSS variables in `src/lib/styles/`, no ad-hoc hex/font.
- **URL hash contract stays `{v:1}`**; `url` is OPTIONAL so no fixture/literal backfill and old hashes stay valid.
- **Security:** an `href` is only ever a validated http(s) URL; every link uses `target="_blank" rel="noopener noreferrer"`.
- **Every `.svelte` file edited/created via the `svelte-file-editor` agent** (svelte-autofixer MCP), never raw. When dispatching it, do so SYNCHRONOUSLY and wait for it to finish.
- **Model/schema work is TDD**; **UI work must pass visual QA** (`node scripts/visual-qa.mjs`) before review.

**Test commands:** single file `npx vitest run <path>`; full `npm run test`; types `npm run check`; visual QA `node scripts/visual-qa.mjs`.

---

### Task 1: `url` field + `isHttpUrl` validation

**Files:**
- Modify: `src/lib/model/types.ts` (`Parcel`, `HomeOption`)
- Modify: `src/lib/state/schema.ts` (`isHttpUrl`, `isParcelValid`, `isHomeOptionValid`)
- Test: `src/lib/state/schema.test.ts`

**Interfaces:**
- Produces: `Parcel.url?: string`, `HomeOption.url?: string`; exported `isHttpUrl(u: unknown): boolean` (accepts only `http:`/`https:`). Consumed by `Dock.svelte` (Task 3) and the validators.

- [ ] **Step 1: Write the failing tests**

Add `isHttpUrl` to the import on line 2 of `src/lib/state/schema.test.ts`:

```ts
import { comboKey, defaultState, isHttpUrl, validateState } from './schema';
```

Add these test blocks:

```ts
describe('isHttpUrl', () => {
	it('accepts http and https', () => {
		expect(isHttpUrl('http://example.com')).toBe(true);
		expect(isHttpUrl('https://landwatch.com/listing/123')).toBe(true);
	});
	it('rejects other schemes, malformed input, and non-strings', () => {
		expect(isHttpUrl('javascript:alert(1)')).toBe(false);
		expect(isHttpUrl('data:text/html,x')).toBe(false);
		expect(isHttpUrl('ftp://example.com')).toBe(false);
		expect(isHttpUrl('not a url')).toBe(false);
		expect(isHttpUrl('')).toBe(false);
		expect(isHttpUrl(42)).toBe(false);
		expect(isHttpUrl(undefined)).toBe(false);
	});
});

describe('url validation in state', () => {
	it('accepts a parcel with a valid https url', () => {
		const s = defaultState();
		s.parcels = [{ id: 'p1', name: 'Ridge', landPrice: 80_000, url: 'https://landwatch.com/x' }];
		expect(validateState(s)).toBe(true);
	});
	it('rejects a parcel with a javascript: url', () => {
		const s = defaultState();
		s.parcels = [{ id: 'p1', name: 'Ridge', landPrice: 80_000, url: 'javascript:alert(1)' }];
		expect(validateState(s)).toBe(false);
	});
	it('accepts a home with a valid url, rejects a data: url', () => {
		const s = defaultState();
		s.homes = [{ id: 'h1', name: 'Escape', homeCost: 100_000, siteWork: 40_000, url: 'https://x.com' }];
		expect(validateState(s)).toBe(true);
		s.homes = [{ id: 'h1', name: 'Escape', homeCost: 100_000, siteWork: 40_000, url: 'data:x' }];
		expect(validateState(s)).toBe(false);
	});
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/lib/state/schema.test.ts`
Expected: FAIL — `isHttpUrl` not exported; validators ignore `url` so the `javascript:`/`data:` cases return `true`. (TS also errors: `url` not yet on the interfaces.)

- [ ] **Step 3: Add the field to the interfaces**

In `src/lib/model/types.ts`, add to `Parcel` (after `closingFrac?`) and to `HomeOption` (after `siteWork`):

```ts
	url?: string;            // source listing URL (http/https), optional
```

- [ ] **Step 4: Add `isHttpUrl` and wire the validators**

In `src/lib/state/schema.ts`, add after the `inRange` helper (around line 61):

```ts
// Only http/https URLs are accepted for listing links, so a crafted hash
// can never inject a javascript:/data: URL that later renders as an href.
export function isHttpUrl(u: unknown): boolean {
	if (typeof u !== 'string') return false;
	try {
		const { protocol } = new URL(u);
		return protocol === 'http:' || protocol === 'https:';
	} catch {
		return false;
	}
}
```

In `isParcelValid`, add before `return true;`:

```ts
	if (o.url !== undefined && !isHttpUrl(o.url)) return false;
```

In `isHomeOptionValid`, add the same guard as an early statement before its `return (...)`:

```ts
	if (o.url !== undefined && !isHttpUrl(o.url)) return false;
	return (
```

- [ ] **Step 5: Run to verify pass**

Run: `npx vitest run src/lib/state/schema.test.ts && npm run check`
Expected: PASS; 0 type errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/model/types.ts src/lib/state/schema.ts src/lib/state/schema.test.ts
git commit -m "$(cat <<'EOF'
feat: optional listing url on parcels/homes with http(s) validation

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: `MoneyInput` component + `$` adornment + dock column captions

**Files:**
- Create (via svelte-file-editor): `src/lib/components/MoneyInput.svelte`
- Modify (via svelte-file-editor): `src/lib/components/FinancesPanel.svelte` (6 money inputs), `src/lib/components/Dock.svelte` (price/cost/site inputs in rows + add-forms; column captions)

**Interfaces:**
- Produces: `MoneyInput.svelte` with props `{ value = $bindable(), min?, step?, placeholder?, ariaLabel?, class? }` rendering a `$`-prefixed native number input. Consumed by FinancesPanel and Dock. `class="compact"` gives the narrow dock width.

- [ ] **Step 1: Create `MoneyInput.svelte` (via svelte-file-editor agent)**

Dispatch the `svelte-file-editor` agent to create `src/lib/components/MoneyInput.svelte`:

```svelte
<script lang="ts">
	let {
		value = $bindable(),
		min = 0,
		step = 1000,
		placeholder = '',
		ariaLabel = '',
		class: className = ''
	}: {
		value: number;
		min?: number;
		step?: number;
		placeholder?: string;
		ariaLabel?: string;
		class?: string;
	} = $props();
</script>

<span class="money {className}">
	<span class="sign" aria-hidden="true">$</span>
	<input type="number" {min} {step} {placeholder} aria-label={ariaLabel} bind:value />
</span>

<style>
	.money {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		width: 100%;
		background: var(--paper);
		border: var(--hairline);
		border-radius: var(--radius);
		padding: 0 var(--space-2);
	}
	.money.compact {
		width: 7em;
		flex: none;
	}
	.sign {
		font-family: var(--font-figures);
		font-size: 0.9rem;
		color: var(--ink-faint);
	}
	.money input {
		font-family: var(--font-figures);
		font-size: 0.95rem;
		color: var(--ink);
		background: none;
		border: none;
		padding: var(--space-1) 0;
		width: 100%;
		min-width: 0;
		text-align: right;
	}
	.money input:focus {
		outline: none;
	}
	.money:focus-within {
		outline: 2px solid var(--edge-monthly);
		outline-offset: 1px;
	}
</style>
```

Instruct the agent to run svelte-autofixer validation and confirm no issues.

- [ ] **Step 2: Adopt `MoneyInput` in `FinancesPanel.svelte` (via svelte-file-editor agent)**

Dispatch the `svelte-file-editor` agent to edit `src/lib/components/FinancesPanel.svelte`:

Add the import at the top of the `<script>`:

```ts
	import MoneyInput from './MoneyInput.svelte';
```

Replace each of the 6 money `<input class="num" type="number" …>` elements (income, expenses, debt, cash, savings, rental — lines ~33-54) with the corresponding `MoneyInput`, keeping the surrounding `<label><span>…</span> … </label>`:

```svelte
		<label>
			<span>Take-home / mo</span>
			<MoneyInput bind:value={app.finances.incomeMonthly} step={100} ariaLabel="Take-home per month" />
		</label>
		<label>
			<span>Expenses / mo</span>
			<MoneyInput bind:value={app.finances.expensesMonthly} step={100} ariaLabel="Expenses per month" />
		</label>
		<label>
			<span>Existing debt / mo</span>
			<MoneyInput bind:value={app.finances.debtMonthly} step={50} ariaLabel="Existing debt per month" />
		</label>
		<label>
			<span>Cash on hand</span>
			<MoneyInput bind:value={app.finances.cashOnHand} step={1000} ariaLabel="Cash on hand" />
		</label>
		<label>
			<span>Savings / mo</span>
			<MoneyInput bind:value={app.finances.savingsMonthly} step={100} ariaLabel="Savings per month" />
		</label>
		<label>
			<span>Rental income / mo</span>
			<MoneyInput bind:value={app.finances.rentalMonthly} step={50} ariaLabel="Rental income per month" />
		</label>
```

Leave the `Comfort threshold` range slider unchanged. The now-unused `input[type='number']` style rule in this file may remain (harmless) or be removed. Instruct the agent to run svelte-autofixer validation and confirm no issues.

- [ ] **Step 3: Adopt `MoneyInput` + add captions in `Dock.svelte` (via svelte-file-editor agent)**

Dispatch the `svelte-file-editor` agent to edit `src/lib/components/Dock.svelte`:

Add the import in the `<script>`:

```ts
	import MoneyInput from './MoneyInput.svelte';
```

Add a caption `<p class="cols">` right after each column `<h3>`:

```svelte
		<h3>Parcels</h3>
		<p class="cols">name · price</p>
```
```svelte
		<h3>Homes</h3>
		<p class="cols">name · cost · site work</p>
```

Replace the parcel-row and add-form price `<input class="num price" …>` with:

```svelte
<MoneyInput class="compact" bind:value={parcel.landPrice} ariaLabel="Land price" />
```
```svelte
<MoneyInput class="compact" bind:value={newParcel.landPrice} placeholder="price" ariaLabel="New parcel price" />
```

Replace the home-row and add-form cost/site `<input class="num price" …>` with:

```svelte
<MoneyInput class="compact" bind:value={home.homeCost} ariaLabel="Home cost" />
<MoneyInput class="compact" bind:value={home.siteWork} ariaLabel="Site work" />
```
```svelte
<MoneyInput class="compact" bind:value={newHome.homeCost} placeholder="cost" ariaLabel="New home cost" />
<MoneyInput class="compact" bind:value={newHome.siteWork} placeholder="site" ariaLabel="New home site work" />
```

Add the caption style in the `<style>` block:

```css
	.cols {
		margin: -0.35rem 0 var(--space-2);
		font-family: var(--font-body);
		font-size: 0.68rem;
		letter-spacing: 0.04em;
		color: var(--ink-faint);
	}
```

Instruct the agent to run svelte-autofixer validation and confirm no issues.

- [ ] **Step 4: Type check + visual QA**

Run: `npm run check` — expect 0 errors.
Run: `node scripts/visual-qa.mjs`, then READ `.visual-qa/map-typical.png` and `.visual-qa/panels-selected.png`. Confirm: every money field in the Finances panel AND the dock (parcel price, home cost, home site work) shows a leading `$`; the dock shows `name · price` / `name · cost · site work` captions under the headers; layout is not broken (rows still fit). If wrong, fix (via svelte-file-editor) and re-run.

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/MoneyInput.svelte src/lib/components/FinancesPanel.svelte src/lib/components/Dock.svelte
git commit -m "$(cat <<'EOF'
feat: MoneyInput $-adornment across dock + finances; dock column captions

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Dock listing-link control

**Files:**
- Modify (via svelte-file-editor): `src/lib/components/Dock.svelte`
- Create: `tests/visual/states/dock-links.json`

**Interfaces:**
- Consumes: `Parcel.url`/`HomeOption.url` (Task 1); `isHttpUrl` from `$lib/state/schema` (Task 1); the post-Task-2 dock rows (with `MoneyInput`).

- [ ] **Step 1: Create the visual fixture**

Create `tests/visual/states/dock-links.json`:

```json
{
	"name": "dock-links",
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
			"rentalMonthly": 0
		},
		"presets": {
			"land": { "downFrac": 0.25, "annualRatePct": 8.0, "termMonths": 180 },
			"home": { "downFrac": 0.15, "annualRatePct": 9.5, "termMonths": 180 },
			"closingFrac": 0.03,
			"taxAnnualPct": 1.0,
			"insuranceMonthly": 100
		},
		"parcels": [
			{ "id": "p1", "name": "Ridge 5ac", "landPrice": 80000, "url": "https://www.landwatch.com/ridge-5ac" },
			{ "id": "p2", "name": "Creek 10ac", "landPrice": 140000 }
		],
		"homes": [
			{ "id": "h1", "name": "Escape One", "homeCost": 100000, "siteWork": 40000, "url": "https://escapetraveler.net/escape-one" },
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

- [ ] **Step 2: Add the link control (via svelte-file-editor agent)**

Dispatch the `svelte-file-editor` agent to edit `src/lib/components/Dock.svelte`.

Add the import in the `<script>`:

```ts
	import { isHttpUrl } from '$lib/state/schema';
```

Add link-editor state and helpers after the `newHome` `$state` (around line 14):

```ts
	let editingUrlId = $state<string | null>(null);
	let urlDraft = $state('');
	const draftInvalid = $derived(urlDraft.trim() !== '' && !isHttpUrl(urlDraft.trim()));

	function openUrlEditor(id: string, current: string | undefined) {
		editingUrlId = id;
		urlDraft = current ?? '';
	}
	function commitUrl(item: { url?: string }) {
		const t = urlDraft.trim();
		if (t === '') {
			item.url = undefined;
			editingUrlId = null;
		} else if (isHttpUrl(t)) {
			item.url = t;
			editingUrlId = null;
		}
		// invalid draft: keep the editor open, retain the draft, show invalid border
	}
```

Replace the parcel `{#each}` block so each row has the link control and an inline editor beneath it:

```svelte
			{#each app.parcels as parcel (parcel.id)}
				<li class="row">
					<input class="name" type="text" bind:value={parcel.name} aria-label="Parcel name" />
					<MoneyInput class="compact" bind:value={parcel.landPrice} ariaLabel="Land price" />
					{#if parcel.url}
						<a class="link open" href={parcel.url} target="_blank" rel="noopener noreferrer" title={parcel.url} aria-label="Open parcel listing">↗</a>
						<button class="link edit" onclick={() => openUrlEditor(parcel.id, parcel.url)} aria-label="Edit parcel link">edit</button>
					{:else}
						<button class="link add" onclick={() => openUrlEditor(parcel.id, parcel.url)} aria-label="Add parcel link">link</button>
					{/if}
					<button class="remove" onclick={() => removeParcel(parcel.id)} aria-label="Remove parcel">×</button>
				</li>
				{#if editingUrlId === parcel.id}
					<li class="url-editor">
						<input
							class="url"
							class:invalid={draftInvalid}
							type="url"
							placeholder="https://…"
							bind:value={urlDraft}
							onblur={() => commitUrl(parcel)}
							onkeydown={(e) => { if (e.key === 'Enter') commitUrl(parcel); }}
							aria-label="Listing URL"
						/>
					</li>
				{/if}
			{/each}
```

Replace the home `{#each}` block the same way (using `home`, `removeHome`, both `MoneyInput`s):

```svelte
			{#each app.homes as home (home.id)}
				<li class="row">
					<input class="name" type="text" bind:value={home.name} aria-label="Home name" />
					<MoneyInput class="compact" bind:value={home.homeCost} ariaLabel="Home cost" />
					<MoneyInput class="compact" bind:value={home.siteWork} ariaLabel="Site work" />
					{#if home.url}
						<a class="link open" href={home.url} target="_blank" rel="noopener noreferrer" title={home.url} aria-label="Open home listing">↗</a>
						<button class="link edit" onclick={() => openUrlEditor(home.id, home.url)} aria-label="Edit home link">edit</button>
					{:else}
						<button class="link add" onclick={() => openUrlEditor(home.id, home.url)} aria-label="Add home link">link</button>
					{/if}
					<button class="remove" onclick={() => removeHome(home.id)} aria-label="Remove home">×</button>
				</li>
				{#if editingUrlId === home.id}
					<li class="url-editor">
						<input
							class="url"
							class:invalid={draftInvalid}
							type="url"
							placeholder="https://…"
							bind:value={urlDraft}
							onblur={() => commitUrl(home)}
							onkeydown={(e) => { if (e.key === 'Enter') commitUrl(home); }}
							aria-label="Listing URL"
						/>
					</li>
				{/if}
			{/each}
```

Add the link-control styles in the `<style>` block:

```css
	.link {
		font-family: var(--font-figures);
		font-size: 0.72rem;
		line-height: 1;
		height: 1.8em;
		padding: 0 var(--space-2);
		display: inline-flex;
		align-items: center;
		color: var(--ink-faint);
		background: var(--paper);
		border: var(--hairline);
		border-radius: var(--radius);
		text-decoration: none;
		cursor: pointer;
		flex: none;
	}
	.link.open {
		color: var(--edge-rental);
		border-color: var(--edge-rental);
		font-weight: 600;
	}
	.link.add:hover,
	.link.edit:hover {
		color: var(--ink);
	}
	.url-editor {
		display: flex;
		padding: 0 0 var(--space-1);
	}
	.url-editor .url {
		flex: 1;
		font-family: var(--font-body);
		font-size: 0.78rem;
		color: var(--ink);
		background: var(--paper);
		border: var(--hairline);
		border-radius: var(--radius);
		padding: var(--space-1) var(--space-2);
	}
	.url-editor .url.invalid {
		border-color: var(--flag);
	}
```

Instruct the agent to run svelte-autofixer validation and confirm no issues.

- [ ] **Step 3: Type check + visual QA**

Run: `npm run check` — expect 0 errors.
Run: `node scripts/visual-qa.mjs`, then READ `.visual-qa/dock-links.png`. Confirm: the parcel "Ridge 5ac" and home "Escape One" show a gold `↗` link plus an `edit` button; "Creek 10ac" and "Used park model" show a faint `link` button; nothing is broken. (The inline editor is component-local state and does not appear in a static fixture; verifying the editor interaction is out of scope for the screenshot.) If wrong, fix (via svelte-file-editor) and re-run.

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/Dock.svelte tests/visual/states/dock-links.json
git commit -m "$(cat <<'EOF'
feat: dock listing-link control with draft-committing url editor

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review

**Spec coverage:**
- `url?` on Parcel/HomeOption, optional, in hash → Task 1 ✓
- `isHttpUrl` strict http(s), rejects javascript:/data: → Task 1 ✓
- Parcel/home validators reject bad url → Task 1 ✓
- Dock link control (faint "link" → gold `↗` + edit) → Task 3 ✓
- Inline editor, local draft, commit valid/cleared only, invalid keeps draft → Task 3 Step 2 ✓
- `rel="noopener noreferrer" target="_blank"` on hrefs → Task 3 ✓
- Column captions → Task 2 Step 3 ✓
- `MoneyInput` shared component, `$` adornment → Task 2 Step 1 ✓
- Adopted in dock + Finances (all money inputs; comfort slider unchanged) → Task 2 Steps 2-3 ✓
- Read-only displays unchanged (already `fullDollar`) → not modified ✓
- Schema TDD + visual fixture → Tasks 1, 3 ✓
- Out of scope (URL auto-fill, combo/dot links, in-field commas) → not planned ✓

**Placeholder scan:** No TBD/TODO; every code step shows complete code. ✓

**Type consistency:** `isHttpUrl(u: unknown): boolean`, `MoneyInput` prop names (`value`/`min`/`step`/`placeholder`/`ariaLabel`/`class`), `editingUrlId`/`urlDraft`/`commitUrl`/`openUrlEditor`/`draftInvalid`, and `parcel.url`/`home.url` are used identically across tasks. `class="compact"` is defined in MoneyInput (Task 2) and used in Dock (Tasks 2-3). ✓

**Note:** The inline URL editor's behavior (draft binding, commit-on-blur/Enter, invalid-border retention) is component-local and not captured by a static visual-QA fixture. Its logic is small and reviewed by reading the diff; deeper interaction testing would require driving the dev server (out of scope for this plan's gates).
