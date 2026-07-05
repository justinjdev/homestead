---
name: svelte-component
description: Quests creating or editing Svelte components, styles, or the map UI
keywords: [component, svelte, map, panel, dock, drawer, slider, stress, UI, style, design]
---

## Research Guidance

- Read the "UI layout" and "Aesthetic" sections of
  `docs/superpowers/specs/2026-07-05-affordability-map-design.md` and the
  judging checklist in `.claude/skills/visual-qa/SKILL.md` before planning.
- Inventory existing design tokens in `src/lib/styles/` first; if a token you
  need is missing, that's a design-system change to surface, not a hex value
  to inline.

## Plan Guidance

- Plan the visual QA fixtures alongside the component: every user-visible
  state you add needs a fixture in `tests/visual/states/` (state shape =
  the URL hash contract, `{v: 1, ...}`).
- Components consume `src/lib/model/` and the runes store — if the plan has a
  component computing payments/constraints locally, the plan is wrong.

## Implement Guidance

- Every `.svelte` / `.svelte.ts` file goes through the `svelte-file-editor`
  agent (svelte-autofixer MCP) — never raw edits. Svelte 5 runes only.
- Colors, fonts, spacing from CSS variables in `src/lib/styles/` only.
- Links/assets use `base` from `$app/paths` — production serves under
  `/homestead`.

## Review Guidance

- Run `node scripts/visual-qa.mjs`, Read every produced PNG, and judge
  against the checklist in `.claude/skills/visual-qa/SKILL.md`. A UI quest
  without fresh screenshots does not pass Review.
- `npm run check` passes; no new entries in package.json `dependencies`
  (must stay empty — CLAUDE.md hard rule 1).
