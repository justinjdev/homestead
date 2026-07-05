---
name: visual-qa
description: Use after any UI change and before a review gate — screenshots the app at seeded states so you can judge the render against the spec. Mandatory for all Svelte component quests.
---

# Visual QA

Screenshot the running app at known states and judge the result with your own
eyes. Math is verified by Vitest; this is how UI work gets verified.

## Run it

```bash
node scripts/visual-qa.mjs            # all fixtures
node scripts/visual-qa.mjs default    # one fixture by name
```

Screenshots land in `.visual-qa/<name>.png`. Read each PNG with the Read tool
and judge it.

## Judging checklist

Compare against the UI layout section of
`docs/superpowers/specs/2026-07-05-affordability-map-design.md`:

1. Does the layout match the spec (map hero ~65%, left finances rail, right
   detail rail, stress strip, bottom dock)?
2. Is the envelope polygon visible and sensibly shaped for the fixture's
   finances (not degenerate, not clipped)?
3. Are combo dots, guide lines, and time contours rendered where the state
   says they should be?
4. Aesthetic rules: surveyor/plat-map theme, design-token colors only, no
   fallback/system fonts visibly rendering, nothing overlapping or overflowing.
5. Edge-case fixtures: empty region and error states must show their
   plain-language explanations, never a broken or blank chart.

If anything fails, fix it and re-run before proceeding to review. Do not mark
a UI task complete on a failing or ambiguous screenshot.

## Adding fixtures

Every new UI state you introduce needs a fixture in `tests/visual/states/`:

```json
{
	"name": "kebab-case-name",
	"state": { "v": 1, "...": "full app state, same shape the URL hash encodes" },
	"viewport": { "width": 1440, "height": 900 }
}
```

`"state": null` means load with no hash (fresh visit). The harness encodes
`state` as `base64url(JSON.stringify(state))` — identical to the app's hash
contract. If the state schema changes, update fixtures in the same PR.

Recommended minimum fixture set once the app exists: default (empty),
typical-finances with 2 parcels × 2 homes, no-feasible-region,
income-below-expenses, stressed (all three stress sliders active).
