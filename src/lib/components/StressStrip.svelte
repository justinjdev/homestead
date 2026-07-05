<script lang="ts">
	import { app } from '$lib/state/store.svelte';
	import { fullDollar } from '$lib/map/layout';

	const active = $derived(
		app.stress.rateDeltaPct !== 0 ||
			app.stress.siteWorkOverrunFrac !== 0 ||
			app.stress.incomeDropMonthly !== 0
	);

	function reset() {
		app.stress.rateDeltaPct = 0;
		app.stress.siteWorkOverrunFrac = 0;
		app.stress.incomeDropMonthly = 0;
	}
</script>

<section class="stress" class:active>
	<span class="lead">Stress test</span>
	<label>
		<span>Rate <em class="num">+{app.stress.rateDeltaPct.toFixed(2)} pp</em></span>
		<input type="range" min="0" max="5" step="0.25" bind:value={app.stress.rateDeltaPct} />
	</label>
	<label>
		<span>Site-work overrun <em class="num">+{Math.round(app.stress.siteWorkOverrunFrac * 100)}%</em></span>
		<input type="range" min="0" max="1" step="0.05" bind:value={app.stress.siteWorkOverrunFrac} />
	</label>
	<label>
		<span>Income <em class="num">−{fullDollar(app.stress.incomeDropMonthly)}/mo</em></span>
		<input type="range" min="0" max="2000" step="50" bind:value={app.stress.incomeDropMonthly} />
	</label>
	<button class="reset" onclick={reset} disabled={!active}>Reset</button>
</section>

<style>
	.stress {
		display: flex;
		align-items: center;
		gap: var(--space-4);
		flex-wrap: wrap;
		background: var(--paper-raised);
		border: var(--hairline);
		border-left: 3px solid transparent;
		border-radius: var(--radius);
		padding: var(--space-3);
	}
	.stress.active {
		border-left-color: var(--flag);
	}
	.lead {
		font-family: var(--font-display);
		font-variant-caps: small-caps;
		letter-spacing: 0.08em;
		font-size: 1rem;
	}
	label {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		font-family: var(--font-body);
		font-size: 0.72rem;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--ink-faint);
		min-width: 190px;
		flex: 1;
	}
	label em {
		font-style: normal;
		color: var(--ink);
	}
	input[type='range'] {
		accent-color: var(--flag);
		width: 100%;
	}
	.reset {
		font-family: var(--font-body);
		font-size: 0.75rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--ink);
		background: var(--paper);
		border: var(--hairline);
		border-radius: var(--radius);
		padding: var(--space-2) var(--space-3);
		cursor: pointer;
	}
	.reset:disabled {
		opacity: 0.4;
		cursor: default;
	}
</style>
