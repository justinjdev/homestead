# Dock: listing links, field labels, currency `$` — design

**Status:** proposed
**Date:** 2026-07-05

## Goal

Three cohesive improvements to how parcels and homes are managed in the dock:

1. **Listing links** — attach the source-listing URL (LandWatch, Zillow,
   manufacturer page…) to each parcel/home so the map becomes a working
   shortlist you can click back through.
2. **Field labels** — the money fields in the dock are unlabeled; make it
   clear which is price vs cost vs site work.
3. **Currency `$`** — money inputs read as bare numbers; give them a `$`
   affordance, consistently across the dock and the Finances panel.

## 1. Listing links

### Data (`types.ts`)

Add an optional field to both interfaces:

```ts
export interface Parcel {
	…
	url?: string;   // source listing URL (http/https), optional
}
export interface HomeOption {
	…
	url?: string;   // source listing URL (http/https), optional
}
```

Optional → no fixture/literal backfill, existing hashes stay valid. URLs ride
in the shareable base64url hash with the rest of state.

### Validation & security (`schema.ts`)

Add an exported helper:

```ts
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

In `isParcelValid` and `isHomeOptionValid`, reject a present-but-invalid url:

```ts
if (o.url !== undefined && !isHttpUrl(o.url)) return false;
```

This closes the crafted-hash XSS surface the file already guards: a shared or
hostile hash can never smuggle a `javascript:`/`data:` URL into an `href`.
Validation is strict — an invalid `url` fails `validateState` and the state
falls back to `defaultState()`. Therefore the editor must only ever *persist*
a valid or cleared value (see Dock UI).

### Dock UI (`Dock.svelte`)

Each parcel/home row keeps its editable `name` + money field(s); add a
compact **link control** before the `×`:

- **No URL** → a faint "+ link" button. Clicking it opens an inline URL
  editor for that row.
- **URL set** → a gold `↗` anchor (`href={item.url}`,
  `target="_blank" rel="noopener noreferrer"`) that opens the listing, plus a
  small toggle to re-open the editor.

The inline editor is a full-width `<input type="url">` beneath the row (URLs
are long), bound to a **local draft** (`$state` string), not the model. Only
one editor is open at a time (`editingUrlId: string | null`). On commit
(blur or Enter):

- valid http(s) → `item.url = draft.trim()`
- empty/whitespace → `item.url = undefined`
- invalid → keep the draft, show a subtle invalid border, do **not** persist

Because binding is to the draft, mid-typing never touches the persisted model
— a half-finished URL can't corrupt a reload or a shared link. The add-form
stays `name + price` (add first, link after). All `href`s are validated
http(s) with `rel="noopener noreferrer" target="_blank"`.

## 2. Field labels (`Dock.svelte`)

Add a compact caption line under each column header naming the fields:

- `PARCELS` → *"name · price"*
- `HOMES` → *"name · cost · site work"*

Styled small/faint (`--ink-faint`), it labels the columns without adding
per-row clutter. The add-form retains its placeholders.

## 3. Currency `$` — shared `MoneyInput` component

### New component (`src/lib/components/MoneyInput.svelte`)

A single focused unit owns the `$`-adornment so both panels stay DRY:

```svelte
<script lang="ts">
	let {
		value = $bindable(),
		min = 0,
		step = 1000,
		placeholder = '',
		ariaLabel = ''
	}: {
		value: number;
		min?: number;
		step?: number;
		placeholder?: string;
		ariaLabel?: string;
	} = $props();
</script>

<span class="money">
	<span class="sign" aria-hidden="true">$</span>
	<input type="number" {min} {step} {placeholder} aria-label={ariaLabel} bind:value />
</span>
```

Styling: the `.money` wrapper carries the border/radius (design tokens); the
inner `<input>` is borderless so the `$` and number read as one field. Keeps
the native number input (spinners, numeric validation). No commas inside the
field (the declined "full text-format" option).

### Adoption

Replace the raw money `<input type="number">`s with `<MoneyInput
bind:value={…} />`:

- **Dock** — parcel price, home cost, home site work (rows *and* add-form).
- **Finances panel** — take-home, expenses, existing debt, cash on hand,
  savings, rental income. (`comfortFrac` stays a range slider.)

Read-only displays (dock chips, detail panel) already render `fullDollar`
("$80,000") and are unchanged.

## Testing

- **Schema (TDD):** `isHttpUrl` — accepts `http://`/`https://`, rejects
  `javascript:`, `data:`, `ftp:`, `""`, non-string, malformed. Parcel/home
  validation: absent url ok; valid http(s) ok; invalid url rejected;
  `defaultState()` still validates.
- **Visual QA:** a `dock-links.json` fixture with a parcel and a home
  carrying `url`s — screenshot shows the gold `↗` controls, an open inline
  editor, the column captions, and `$`-prefixed money inputs across the dock
  and Finances panel.

## Out of scope

- Auto-filling name/price by fetching a URL (needs a network call — violates
  the no-network rule).
- Links on combos (derived) or on the map dots.
- Thousands-separators inside editable fields (the `$` adornment keeps raw
  numbers; full text-formatting was declined).
