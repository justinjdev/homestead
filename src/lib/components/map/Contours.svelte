<script lang="ts">
	import { app } from '$lib/state/store.svelte';
	import { region } from '$lib/model';
	import { CONTOUR_TIMES } from '$lib/map/layout';

	let { px, py }: { px: (v: number) => number; py: (v: number) => number } = $props();

	type Contour = { t: number; d: string; opacity: number; labelX: number; labelY: number };

	const contours = $derived.by((): Contour[] => {
		const out: Contour[] = [];
		CONTOUR_TIMES.forEach((t, i) => {
			const poly = region(app.finances, app.presets, app.stress, t);
			if (poly.length < 3) return;
			const d = poly.map(([x, y], j) => `${j === 0 ? 'M' : 'L'}${px(x)},${py(y)}`).join(' ') + 'Z';
			const opacity = 0.9 - (i / (CONTOUR_TIMES.length - 1)) * (0.9 - 0.25);
			let outer = poly[0];
			for (const v of poly) if (v[0] + v[1] > outer[0] + outer[1]) outer = v;
			out.push({ t, d, opacity, labelX: px(outer[0]) + 4, labelY: py(outer[1]) - 4 });
		});
		return out;
	});
</script>

<g class="contours">
	{#each contours as c (c.t)}
		<path class="contour" d={c.d} style="opacity: {c.opacity}" />
		<text class="contour-label" x={c.labelX} y={c.labelY} style="opacity: {c.opacity}">{c.t === 0 ? 'now' : `${c.t} mo`}</text>
	{/each}
</g>

<style>
	.contour { fill: none; stroke: var(--line-survey); stroke-width: 1.25; stroke-dasharray: 4 3; transition: d 0.45s ease; }
	.contour-label { fill: var(--line-survey); font-family: var(--font-figures); font-size: 10px; }
</style>
