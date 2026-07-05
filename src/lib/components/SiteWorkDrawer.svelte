<script lang="ts">
	import type { HomeOption } from '$lib/model/types';
	import { fullDollar } from '$lib/map/layout';

	let { home }: { home: HomeOption } = $props();

	type Row = { label: string; amount: number; included: boolean };

	let rows = $state<Row[]>([
		{ label: 'Well', amount: 12000, included: true },
		{ label: 'Septic', amount: 18000, included: true },
		{ label: 'Driveway', amount: 8000, included: true },
		{ label: 'Grading / pad', amount: 6000, included: true },
		{ label: 'Power run', amount: 12000, included: true },
		{ label: 'Permits / fees', amount: 4000, included: true }
	]);
	let contingency = $state(true);

	const subtotal = $derived(rows.reduce((s, r) => s + (r.included ? r.amount : 0), 0));
	const total = $derived(Math.round(contingency ? subtotal * 1.15 : subtotal));

	function apply() {
		home.siteWork = total;
	}
</script>

<details class="drawer">
	<summary>Site-work estimator</summary>
	<ul class="items">
		{#each rows as row (row.label)}
			<li class="item">
				<label class="inc">
					<input type="checkbox" bind:checked={row.included} />
					<span>{row.label}</span>
				</label>
				<input class="num amt" type="number" min="0" step="500" bind:value={row.amount} />
			</li>
		{/each}
	</ul>
	<label class="cont">
		<input type="checkbox" bind:checked={contingency} />
		<span>+15% contingency</span>
	</label>
	<div class="foot">
		<button class="apply" onclick={apply}>
			Apply <span class="num">{fullDollar(total)}</span> to {home.name}
		</button>
	</div>
</details>

<style>
	.drawer {
		border: var(--hairline);
		border-radius: var(--radius);
		padding: var(--space-2) var(--space-3);
		background: var(--paper);
	}
	summary {
		cursor: pointer;
		font-family: var(--font-body);
		font-size: 0.78rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--ink-faint);
	}
	.items {
		list-style: none;
		margin: var(--space-3) 0 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}
	.item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2);
	}
	.inc {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-family: var(--font-body);
		font-size: 0.85rem;
		color: var(--ink);
	}
	.amt {
		width: 6.5em;
		font-family: var(--font-figures);
		font-size: 0.9rem;
		color: var(--ink);
		background: var(--paper-raised);
		border: var(--hairline);
		border-radius: var(--radius);
		padding: var(--space-1) var(--space-2);
		text-align: right;
	}
	.cont {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		margin-top: var(--space-3);
		font-family: var(--font-body);
		font-size: 0.85rem;
		color: var(--ink);
	}
	.foot {
		margin-top: var(--space-3);
		padding-top: var(--space-3);
		border-top: var(--hairline);
	}
	.apply {
		font-family: var(--font-body);
		font-size: 0.8rem;
		letter-spacing: 0.04em;
		color: var(--paper);
		background: var(--line-survey);
		border: none;
		border-radius: var(--radius);
		padding: var(--space-2) var(--space-3);
		cursor: pointer;
		width: 100%;
	}
</style>
