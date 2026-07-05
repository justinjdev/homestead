<script lang="ts">
	import { app, comboKey } from '$lib/state/store.svelte';
	import { evaluate } from '$lib/model';

	let { px, py }: { px: (v: number) => number; py: (v: number) => number } = $props();

	type Dot = { key: string; cx: number; cy: number; verdict: 'in' | 'out'; badge: string | null; selected: boolean };

	const dots = $derived.by((): Dot[] => {
		const out: Dot[] = [];
		for (const p of app.parcels) {
			for (const h of app.homes) {
				const key = comboKey(p.id, h.id);
				if (app.muted.includes(key)) continue;
				const ev = evaluate(app.finances, p, h, app.presets, app.stress, app.timeMonths);
				const badge = ev.verdict === 'out' && ev.readyInMonths != null && ev.readyInMonths > 0 ? `in ${ev.readyInMonths} mo` : null;
				out.push({ key, cx: px(p.landPrice), cy: py(h.homeCost + h.siteWork), verdict: ev.verdict, badge, selected: app.selected === key });
			}
		}
		return out;
	});

	function select(key: string) {
		app.selected = key;
	}
</script>

<g class="dots">
	{#each dots as d (d.key)}
		<g class="dot {d.verdict}" class:selected={d.selected} role="button" tabindex="0" aria-label={d.key}
			onclick={() => select(d.key)}
			onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && select(d.key)}>
			<circle class="hit" cx={d.cx} cy={d.cy} r="12" />
			<line class="pole" x1={d.cx} y1={d.cy} x2={d.cx} y2={d.cy - 15} />
			<path class="flag" d="M{d.cx} {d.cy - 15} L{d.cx + 11} {d.cy - 12} L{d.cx} {d.cy - 9} Z" />
			<circle class="base" cx={d.cx} cy={d.cy} r="3.2" />
			{#if d.selected}
				<circle class="ring" cx={d.cx} cy={d.cy} r="7" />
				<circle class="ring" cx={d.cx} cy={d.cy} r="4.5" />
			{/if}
			{#if d.badge}
				<text class="badge" x={d.cx + 13} y={d.cy - 9}>{d.badge}</text>
			{/if}
		</g>
	{/each}
</g>

<style>
	.dot { cursor: pointer; }
	.hit { fill: transparent; }
	.pole { stroke-width: 1.5; }
	.flag { stroke-width: 0.5; }
	.dot.in .pole, .dot.in .flag, .dot.in .base { stroke: var(--flag-in); }
	.dot.in .flag, .dot.in .base { fill: var(--flag-in); }
	.dot.out .pole, .dot.out .flag, .dot.out .base { stroke: var(--flag); }
	.dot.out .flag, .dot.out .base { fill: var(--flag); }
	.ring { fill: none; stroke-width: 1.3; }
	.dot.in .ring { stroke: var(--flag-in); }
	.dot.out .ring { stroke: var(--flag); }
	.badge { font-family: var(--font-figures); font-size: 10px; }
	.dot.in .badge { fill: var(--flag-in); }
	.dot.out .badge { fill: var(--flag); }
</style>
