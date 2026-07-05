<script lang="ts">
	import { app } from '$lib/state/store.svelte';
	import { PLOT_TOP, PLOT_BOTTOM, PLOT_LEFT, PLOT_RIGHT } from '$lib/map/layout';

	let { px, py }: { px: (v: number) => number; py: (v: number) => number } = $props();
</script>

<g class="guides">
	{#each app.parcels as p (p.id)}
		<line class="guide" x1={px(p.landPrice)} y1={PLOT_TOP} x2={px(p.landPrice)} y2={PLOT_BOTTOM} />
		<text class="guide-label" text-anchor="start" transform="translate({px(p.landPrice) + 3} {PLOT_TOP + 6}) rotate(90)">{p.name}</text>
	{/each}

	{#each app.homes as h (h.id)}
		<line class="guide" x1={PLOT_LEFT} y1={py(h.homeCost + h.siteWork)} x2={PLOT_RIGHT} y2={py(h.homeCost + h.siteWork)} />
		<text class="guide-label" x={PLOT_LEFT + 4} y={py(h.homeCost + h.siteWork) - 4} text-anchor="start">{h.name}</text>
	{/each}
</g>

<style>
	.guide { stroke: var(--ink-faint); stroke-opacity: 0.55; stroke-width: 1; stroke-dasharray: 2 4; }
	.guide-label { fill: var(--ink-faint); font-family: var(--font-body); font-size: 11px; font-style: italic; }
</style>
