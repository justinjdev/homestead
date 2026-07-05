<script lang="ts">
	import { app } from '$lib/state/store.svelte';
	import { region, regionConstraints, SITE_WORK_FRAC } from '$lib/model';

	let {
		px,
		py,
		rentalOffsetMonthly = 0,
		variant = 'baseline'
	}: {
		px: (v: number) => number;
		py: (v: number) => number;
		rentalOffsetMonthly?: number;
		variant?: 'baseline' | 'optimistic';
	} = $props();

	const poly = $derived(
		region(app.finances, app.presets, app.stress, app.timeMonths, SITE_WORK_FRAC, rentalOffsetMonthly)
	);
	const cons = $derived(
		regionConstraints(app.finances, app.presets, app.stress, app.timeMonths, SITE_WORK_FRAC, rentalOffsetMonthly)
	);

	const fillPath = $derived(
		poly.length >= 3
			? poly.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${px(x)},${py(y)}`).join(' ') + 'Z'
			: ''
	);

	type Edge = { x1: number; y1: number; x2: number; y2: number; kind: 'cash' | 'monthly' | 'axis' };

	function classify(mx: number, my: number): 'cash' | 'monthly' | 'axis' {
		const c = cons.cash;
		const m = cons.monthly;
		if (Math.abs(c.a * mx + c.b * my - c.c) < Math.max(1, c.c) * 1e-6) return 'cash';
		if (Math.abs(m.a * mx + m.b * my - m.c) < Math.max(1, m.c) * 1e-6) return 'monthly';
		return 'axis';
	}

	const edges = $derived.by((): Edge[] => {
		if (variant === 'optimistic' || poly.length < 3) return [];
		const out: Edge[] = [];
		for (let i = 0; i < poly.length; i++) {
			const [ax, ay] = poly[i];
			const [bx, by] = poly[(i + 1) % poly.length];
			out.push({
				x1: px(ax), y1: py(ay), x2: px(bx), y2: py(by),
				kind: classify((ax + bx) / 2, (ay + by) / 2)
			});
		}
		return out;
	});
</script>

{#if fillPath}
	{#if variant === 'optimistic'}
		<path class="outline optimistic" d={fillPath} />
	{:else}
		<path class="region-fill" d={fillPath} />
		{#each edges as e, i (i)}
			{#if e.kind !== 'axis'}
				<line class="edge {e.kind}" x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} />
			{/if}
		{/each}
	{/if}
{/if}

<style>
	.region-fill { fill: var(--region-fill); stroke: none; transition: d 0.45s ease; }
	.edge { stroke-width: 2.5; stroke-linecap: round; transition: x1 0.45s ease, y1 0.45s ease, x2 0.45s ease, y2 0.45s ease; }
	.edge.cash { stroke: var(--edge-cash); }
	.edge.monthly { stroke: var(--edge-monthly); }
	.outline.optimistic {
		fill: none;
		stroke: var(--edge-rental);
		stroke-width: 2;
		stroke-dasharray: 5 4;
		stroke-linejoin: round;
		transition: d 0.45s ease;
	}
</style>
