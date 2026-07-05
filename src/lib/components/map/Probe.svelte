<script lang="ts">
	import { app, addParcel, addHome } from '$lib/state/store.svelte';
	import { region, SITE_WORK_FRAC } from '$lib/model';
	import { PLOT_LEFT, PLOT_TOP, PLOT_RIGHT, PLOT_BOTTOM, PLOT_W, PLOT_H, fullDollar } from '$lib/map/layout';

	let { px, py, xMax, yMax }: {
		px: (v: number) => number;
		py: (v: number) => number;
		xMax: number;
		yMax: number;
	} = $props();

	let probe = $state<{ x: number; y: number } | null>(null);
	let form = $state<{ x: number; y: number; name: string; land: number; home: number; site: number } | null>(null);

	const currentRegion = $derived(region(app.finances, app.presets, app.stress, app.timeMonths));

	function pointInPolygon(x: number, y: number, poly: [number, number][]): boolean {
		let inside = false;
		for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
			const [xi, yi] = poly[i];
			const [xj, yj] = poly[j];
			if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
		}
		return inside;
	}

	const probeInside = $derived(probe && currentRegion.length >= 3 ? pointInPolygon(probe.x, probe.y, currentRegion) : false);

	function svgCoords(evt: PointerEvent | MouseEvent): { sx: number; sy: number } | null {
		const target = evt.currentTarget as SVGGraphicsElement;
		const svg = target.ownerSVGElement;
		if (!svg) return null;
		const pt = svg.createSVGPoint();
		pt.x = evt.clientX;
		pt.y = evt.clientY;
		const ctm = svg.getScreenCTM();
		if (!ctm) return null;
		const local = pt.matrixTransform(ctm.inverse());
		return { sx: local.x, sy: local.y };
	}

	function toData(sx: number, sy: number): { x: number; y: number } {
		return {
			x: Math.max(0, ((sx - PLOT_LEFT) / PLOT_W) * xMax),
			y: Math.max(0, ((PLOT_BOTTOM - sy) / PLOT_H) * yMax)
		};
	}

	function onMove(evt: PointerEvent) {
		const c = svgCoords(evt);
		if (c) probe = toData(c.sx, c.sy);
	}
	function onLeave() {
		probe = null;
	}
	function onClick(evt: MouseEvent) {
		const c = svgCoords(evt);
		if (!c) return;
		const d = toData(c.sx, c.sy);
		form = { x: d.x, y: d.y, name: 'Probed', land: Math.round(d.x), home: Math.round(d.y * (1 - SITE_WORK_FRAC)), site: Math.round(d.y * SITE_WORK_FRAC) };
	}
	function saveForm() {
		if (!form) return;
		addParcel({ name: `${form.name} parcel`, landPrice: form.land });
		addHome({ name: `${form.name} home`, homeCost: form.home, siteWork: form.site });
		form = null;
	}
	function cancelForm() {
		form = null;
	}
</script>

<g class="probe">
	<rect class="capture" x={PLOT_LEFT} y={PLOT_TOP} width={PLOT_RIGHT - PLOT_LEFT} height={PLOT_BOTTOM - PLOT_TOP}
		role="presentation" onpointermove={onMove} onpointerleave={onLeave} onclick={onClick} />

	{#if probe}
		<line class="cross" x1={px(probe.x)} y1={PLOT_TOP} x2={px(probe.x)} y2={PLOT_BOTTOM} />
		<line class="cross" x1={PLOT_LEFT} y1={py(probe.y)} x2={PLOT_RIGHT} y2={py(probe.y)} />
		<circle class="cross-dot" cx={px(probe.x)} cy={py(probe.y)} r="3" />
		<foreignObject class="fo-readout" x={Math.min(px(probe.x) + 8, PLOT_RIGHT - 150)} y={Math.max(py(probe.y) - 62, PLOT_TOP)} width="150" height="64">
			<div class="readout">
				<div class="row"><span>land</span><b>{fullDollar(probe.x)}</b></div>
				<div class="row"><span>improve</span><b>{fullDollar(probe.y)}</b></div>
				<div class="verdict {probeInside ? 'in' : 'out'}">{probeInside ? 'in reach' : 'out of reach'}</div>
			</div>
		</foreignObject>
	{/if}

	{#if form}
		<foreignObject x={Math.min(px(form.x) + 8, PLOT_RIGHT - 190)} y={Math.min(py(form.y) + 8, PLOT_BOTTOM - 158)} width="190" height="158">
			<div class="save-form">
				<div class="title">Save as parcel + home?</div>
				<label>name <input bind:value={form.name} /></label>
				<label>land $ <input type="number" bind:value={form.land} /></label>
				<label>home $ <input type="number" bind:value={form.home} /></label>
				<label>site $ <input type="number" bind:value={form.site} /></label>
				<div class="actions">
					<button type="button" class="primary" onclick={saveForm}>Save</button>
					<button type="button" onclick={cancelForm}>Cancel</button>
				</div>
			</div>
		</foreignObject>
	{/if}
</g>

<style>
	.capture { fill: transparent; cursor: crosshair; }
	.cross { stroke: var(--ink); stroke-opacity: 0.4; stroke-width: 1; stroke-dasharray: 3 3; pointer-events: none; }
	.cross-dot { fill: var(--ink); pointer-events: none; }
	.fo-readout { pointer-events: none; }
	.readout {
		font-family: var(--font-figures); font-size: 11px; color: var(--ink);
		background: var(--paper-raised); border: var(--hairline); border-radius: var(--radius);
		padding: var(--space-2);
	}
	.readout .row { display: flex; justify-content: space-between; gap: var(--space-2); }
	.readout .verdict { margin-top: var(--space-1); font-family: var(--font-display); }
	.readout .verdict.in { color: var(--flag-in); }
	.readout .verdict.out { color: var(--flag); }
	.save-form {
		font-family: var(--font-body); font-size: 12px; color: var(--ink);
		background: var(--paper-raised); border: var(--hairline); border-radius: var(--radius);
		padding: var(--space-2); display: flex; flex-direction: column; gap: var(--space-1);
	}
	.save-form .title { font-family: var(--font-display); font-size: 13px; margin-bottom: var(--space-1); }
	.save-form label { display: flex; justify-content: space-between; align-items: center; gap: var(--space-2); }
	.save-form input { width: 96px; font-family: var(--font-figures); font-size: 11px; }
	.save-form .actions { display: flex; gap: var(--space-2); margin-top: var(--space-1); }
	.save-form button { font-family: var(--font-body); font-size: 11px; cursor: pointer; }
	.save-form button.primary { color: var(--flag-in); font-weight: 600; }
</style>
