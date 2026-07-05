# Homey — Autonomous Build System Design

**Date:** 2026-07-05
**Status:** Approved design
**Companion to:** [2026-07-05-affordability-map-design.md](2026-07-05-affordability-map-design.md)

## Goal

Build the affordability map site autonomously using fellowship orchestration,
with verification strong enough that human checkpoints are gates, not
babysitting.

## Work tracks and dependencies

| # | Track | Depends on |
|---|---|---|
| 1 | Model module (`src/lib/model/`) — pure TS math, TDD | — |
| 2 | Design system — fonts, palette, plat-map theme tokens | — |
| 3 | State + persistence — runes store, localStorage, URL hash | 1 |
| 4 | Map SVG component | 1, 2, 3 |
| 5 | Panels, dock, stress strip, estimator drawer | 2, 3 |
| 6 | CI + GitHub Pages deploy workflow | — |
| 7 | Integration, review sweep, visual QA | all |

Phasing: (1, 2, 6) parallel → 3 → (4, 5) parallel → 7.

## Orchestration: fellowship, phased

- **Gandalf** (lead) spawns quest-runners per track in isolated worktrees,
  respecting the dependency order above.
- **palantir** monitors for stuck quests, scope drift, file conflicts.
- **balrog** adversarially validates each quest's diff between Implement and
  Review; Critical/High findings block the gate.
- Every quest inherits project CLAUDE.md; Svelte component quests must use
  the **svelte-file-editor** agent (with svelte-autofixer MCP) for all
  `.svelte` / `.svelte.ts` files.
- Review sweep (track 7) uses pr-review-toolkit agents: code-reviewer,
  silent-failure-hunter, type-design-analyzer, pr-test-analyzer.

## Custom pieces to create (bootstrap phase, before fellowship launch)

No custom agents are needed — only context and verification tooling.

1. **Project CLAUDE.md.** Highest-leverage artifact; inherited by every
   subagent. Encodes: zero runtime deps; model-module purity (no Svelte
   imports in `src/lib/model/`); Svelte 5 runes only; spec locations; test
   expectations (Vitest on model, golden amortization values); aesthetic
   direction (surveyor/plat-map, no generic fonts); base path `/homey`.
2. **Visual QA harness** (project skill + Playwright devDependency).
   Flow: start dev server → seed known app states via URL hash (already a
   product feature, doubles as the test hook) → screenshot each state →
   agent judges the render against the spec. Run by every UI quest before
   its Review gate. Judgment-based, no pixel-diff baselines (v1).
3. **Quest templates** (via fellowship:scribe):
   - *model-work* — TDD required, golden values, purity rule.
   - *svelte-component* — svelte-file-editor mandatory, visual QA mandatory,
     design tokens only (no ad-hoc colors/fonts).
4. **`/deploy-check` command.** Static build → verify base path → serve
   `build/` → smoke test (page loads, hash state round-trips).

## Bootstrap order

1. Scaffold SvelteKit project (adapter-static, Vitest, Playwright devDep) on
   a feature branch; merge to main so fellowship worktrees branch from a
   working skeleton.
2. Project CLAUDE.md (chronicle or by hand).
3. Visual QA harness + `/deploy-check`.
4. Quest templates via scribe.
5. Implementation plan via writing-plans (task breakdown per track).
6. Launch fellowship with the phased quest list.

## Human gates

- Review of this doc and the implementation plan (before launch).
- Aesthetic checkpoint after track 2 (design system) — visual taste is the
  one place agent judgment is weakest; a screenshot review here is cheap and
  prevents themed-wrong downstream UI.
- Final review before deploy to GitHub Pages.

## Out of scope

- Pixel-diff regression CI (revisit if the map churns post-v1)
- Custom subagent definitions
- e2e test suite (per app spec, v1 is unit tests + visual QA)
