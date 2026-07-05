<script lang="ts">
	import { ticks } from '$lib/map/scale';
	import { PLOT_LEFT, PLOT_TOP, PLOT_RIGHT, PLOT_BOTTOM, PLOT_H, compactDollar } from '$lib/map/layout';

	let { px, py, xMax, yMax }: {
		px: (v: number) => number;
		py: (v: number) => number;
		xMax: number;
		yMax: number;
	} = $props();

	const xTicks = $derived(ticks(xMax));
	const yTicks = $derived(ticks(yMax));
</script>

<g class="axes">
	<rect class="frame" x={PLOT_LEFT} y={PLOT_TOP} width={PLOT_RIGHT - PLOT_LEFT} height={PLOT_BOTTOM - PLOT_TOP} />

	{#each xTicks as t (t)}
		<line class="grid" x1={px(t)} y1={PLOT_TOP} x2={px(t)} y2={PLOT_BOTTOM} />
		<line class="tick" x1={px(t)} y1={PLOT_BOTTOM} x2={px(t)} y2={PLOT_BOTTOM + 6} />
		<text class="tick-label" x={px(t)} y={PLOT_BOTTOM + 18} text-anchor="middle">{compactDollar(t)}</text>
	{/each}

	{#each yTicks as t (t)}
		<line class="grid" x1={PLOT_LEFT} y1={py(t)} x2={PLOT_RIGHT} y2={py(t)} />
		<line class="tick" x1={PLOT_LEFT - 6} y1={py(t)} x2={PLOT_LEFT} y2={py(t)} />
		<text class="tick-label" x={PLOT_LEFT - 10} y={py(t) + 4} text-anchor="end">{compactDollar(t)}</text>
	{/each}

	<text class="axis-title" x={(PLOT_LEFT + PLOT_RIGHT) / 2} y={PLOT_BOTTOM + 40} text-anchor="middle">LAND PRICE</text>
	<text class="axis-title" text-anchor="middle" transform="translate(18 {PLOT_TOP + PLOT_H / 2}) rotate(-90)">HOME + SITE WORK</text>
</g>

<style>
	.frame { fill: none; stroke: var(--ink); stroke-opacity: 0.4; stroke-width: 1; }
	.grid { stroke: var(--ink); stroke-opacity: 0.08; stroke-width: 1; }
	.tick { stroke: var(--ink); stroke-opacity: 0.5; stroke-width: 1; }
	.tick-label { fill: var(--ink-faint); font-family: var(--font-figures); font-size: 11px; }
	.axis-title { fill: var(--ink); font-family: var(--font-body); font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; }
</style>
