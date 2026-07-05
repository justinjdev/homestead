<script lang="ts">
	import { app } from '$lib/state/store.svelte';
	import { region, capacity } from '$lib/model';
	import { domains, makeScale } from '$lib/map/scale';
	import { VIEW_W, VIEW_H, MARGIN, PLOT_W, PLOT_H, CONTOUR_TIMES, fullDollar } from '$lib/map/layout';
	import Axes from './Axes.svelte';
	import Region from './Region.svelte';
	import Contours from './Contours.svelte';
	import GuideLines from './GuideLines.svelte';
	import ComboDots from './ComboDots.svelte';
	import Probe from './Probe.svelte';
	import Legend from './Legend.svelte';

	const contourPolys = $derived(CONTOUR_TIMES.map((t) => region(app.finances, app.presets, app.stress, t)));
	const currentPoly = $derived(region(app.finances, app.presets, app.stress, app.timeMonths));

	const dom = $derived(domains([...contourPolys, currentPoly], app.parcels, app.homes));
	const xScale = $derived(makeScale(dom.xMax, PLOT_W));
	const yScale = $derived(makeScale(dom.yMax, PLOT_H));

	const px = $derived.by(() => (x: number) => MARGIN.left + xScale(x));
	const py = $derived.by(() => (y: number) => MARGIN.top + PLOT_H - yScale(y));

	const polyAtMax = $derived(region(app.finances, app.presets, app.stress, 24));
	const incomeBelowExpenses = $derived(app.finances.incomeMonthly - app.stress.incomeDropMonthly <= app.finances.expensesMonthly);
	const cap = $derived(capacity(app.finances, app.stress));

	const emptyMessage = $derived.by((): { title: string; body: string } | null => {
		if (polyAtMax.length >= 3) return null;
		if (incomeBelowExpenses) {
			return { title: 'Income doesn’t cover expenses', body: 'The map needs a monthly surplus — income minus expenses is what funds any housing payment.' };
		}
		return {
			title: 'Nothing is affordable at these settings',
			body: `Your monthly capacity is ${fullDollar(cap)} against a floor of ${fullDollar(app.presets.insuranceMonthly)}/mo in insurance alone. The monthly constraint binds — even a $0 parcel and home don’t fit.`
		};
	});
</script>

<section class="map">
	<header class="map-head">
		<div class="chain">
			<label for="t-slider">horizon</label>
			<input id="t-slider" type="range" min="0" max="24" step="1" bind:value={app.timeMonths} />
			<output class="t-value">{app.timeMonths === 0 ? 'now' : `${app.timeMonths} mo`}</output>
		</div>
	</header>

	<div class="canvas">
		<svg viewBox="0 0 {VIEW_W} {VIEW_H}" role="img" aria-label="Affordability envelope map">
			<Axes {px} {py} xMax={dom.xMax} yMax={dom.yMax} />
			<Contours {px} {py} />
			<Region {px} {py} />
			<GuideLines {px} {py} />
			<Probe {px} {py} xMax={dom.xMax} yMax={dom.yMax} />
			<ComboDots {px} {py} />
		</svg>

		{#if emptyMessage}
			<div class="empty-card">
				<h3>{emptyMessage.title}</h3>
				<p>{emptyMessage.body}</p>
			</div>
		{/if}
	</div>

	<Legend />
</section>

<style>
	.map { display: flex; flex-direction: column; gap: var(--space-2); }
	.map-head { display: flex; justify-content: flex-end; }
	.chain { display: flex; align-items: center; gap: var(--space-2); font-family: var(--font-body); font-size: 0.75rem; letter-spacing: 0.16em; text-transform: uppercase; color: var(--ink-faint); }
	.chain input[type='range'] { width: 220px; accent-color: var(--edge-cash); }
	.t-value { font-family: var(--font-figures); min-width: 3.5em; color: var(--ink); }
	.canvas { position: relative; }
	svg { display: block; width: 100%; height: auto; background: var(--paper-raised); border: var(--hairline); border-radius: var(--radius); }
	.empty-card {
		position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
		max-width: 380px; padding: var(--space-4); background: var(--paper-raised);
		border: var(--hairline); border-left: 3px solid var(--flag); border-radius: var(--radius);
		box-shadow: 0 6px 24px color-mix(in srgb, var(--ink) 15%, transparent);
	}
	.empty-card h3 { margin: 0 0 var(--space-2); font-size: 1rem; color: var(--flag); }
	.empty-card p { margin: 0; font-family: var(--font-body); font-size: 0.9rem; line-height: 1.5; color: var(--ink); }
</style>
