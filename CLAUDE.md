# Homestead

Land + tiny home affordability map. A static SvelteKit site that renders the
user's finances as an **affordability envelope** (polygon) on a plane of
land price × improvement budget, with parcels and home options plotted as
combo dots.

**Read before implementing anything:**

- `docs/superpowers/specs/2026-07-05-affordability-map-design.md` — product spec (source of truth)
- `docs/superpowers/specs/2026-07-05-build-system-design.md` — build process, quest phasing

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Static build to `build/` (set `BASE_PATH=/homestead` for prod parity) |
| `npm run test` | Vitest, single run |
| `npm run check` | svelte-check + TS |
| `node scripts/visual-qa.mjs` | Screenshot seeded app states to `.visual-qa/` |

## Hard rules

1. **Zero runtime dependencies.** `dependencies` in package.json stays empty.
   Svelte/SvelteKit and devDependencies only. No chart, state, or utility
   libraries — the map is hand-rolled SVG.
2. **Model purity.** Nothing in `src/lib/model/` may import from Svelte,
   SvelteKit, or `$app/*`. Pure TypeScript functions only. All money math
   lives here, nowhere else — components never compute payments or
   constraints inline.
3. **Svelte 5 runes only.** `$state`, `$derived`, `$effect`. No legacy
   stores, no `export let`, no `$:` reactivity. Runes mode is forced in
   `vite.config.ts`.
4. **URL hash contract.** Shareable state is exactly
   `base64url(JSON.stringify(state))` with a versioned shape `{v: 1, ...}`.
   The visual QA harness (`scripts/visual-qa.mjs`) encodes fixtures the same
   way — changing the encoding breaks the harness; change both together.
5. **Base path.** Production serves under `/homestead` (GitHub Pages).
   Never hardcode it — use `$app/paths` `base` in components and the
   `BASE_PATH` env var at build time.
6. **Design tokens only.** Colors, fonts, spacing come from CSS variables
   defined by the design system (`src/lib/styles/`). No ad-hoc hex values or
   font names in components.
7. **No new runtime persistence.** localStorage + URL hash only. No cookies,
   no network calls — finances never leave the browser.

## Process rules (for agents)

- **Every `.svelte` / `.svelte.ts` file** must be created or edited via the
  `svelte-file-editor` agent (svelte-autofixer MCP), never edited raw.
- **Model work is TDD:** failing Vitest test first, then implementation.
  Amortization must be verified against golden values (see spec Testing
  section).
- **UI work must pass visual QA before review:** run
  `node scripts/visual-qa.mjs`, read the screenshots, judge against the spec
  UI section. Add a fixture in `tests/visual/states/` for any new UI state
  you introduce.
- Pre-existing bugs: flag them, don't silently fix or ignore.

## Aesthetic direction

Surveyor's/plat-map theme: contour linework, stake-flag markers,
cartographic typography. Distinctive fonts only — no Inter, Roboto, Arial,
or system font stacks. Committed palette via CSS variables. CSS-only motion
(page-load staggered reveals, envelope morph transitions). When in doubt,
consult the spec's UI layout section; art direction decisions belong to the
design-system track (`src/lib/styles/`), not individual components.

## Layout map

| Path | Contents |
|---|---|
| `src/lib/model/` | Pure math: payments, constraints, region polygon, margins, time-to-afford |
| `src/lib/state/` | Runes store, localStorage sync, URL hash encode/decode |
| `src/lib/styles/` | Design tokens, global CSS, fonts |
| `src/lib/components/` | Map, panels, dock, stress strip, estimator drawer |
| `src/routes/+page.svelte` | The single route, composition only |
| `tests/visual/states/` | Visual QA fixtures (full app state JSON) |
| `scripts/visual-qa.mjs` | Screenshot harness |
