<script lang="ts">
	import { app } from '$lib/state/store.svelte';
	import { defaultState } from '$lib/state/schema';
	import MoneyInput from './MoneyInput.svelte';

	const defaults = defaultState().finances;

	// First-visit heuristic: start expanded only when finances still equal defaults.
	const startOpen =
		app.finances.incomeMonthly === defaults.incomeMonthly &&
		app.finances.expensesMonthly === defaults.expensesMonthly &&
		app.finances.debtMonthly === defaults.debtMonthly &&
		app.finances.cashOnHand === defaults.cashOnHand &&
		app.finances.savingsMonthly === defaults.savingsMonthly &&
		app.finances.comfortFrac === defaults.comfortFrac;

	const summary = $derived(
		`$${(app.finances.incomeMonthly / 1000).toFixed(1)}k/mo · ` +
			`$${Math.round(app.finances.cashOnHand / 1000)}k cash · ` +
			`saving $${(app.finances.savingsMonthly / 1000).toFixed(1)}k/mo`
	);

	const comfortPct = $derived(Math.round(app.finances.comfortFrac * 100));
</script>

<details class="panel" open={startOpen}>
	<summary>
		<span class="title">Finances</span>
		<span class="sum num">{summary}</span>
	</summary>

	<div class="fields">
		<label>
			<span>Take-home / mo</span>
			<MoneyInput bind:value={app.finances.incomeMonthly} step={100} ariaLabel="Take-home per month" />
		</label>
		<label>
			<span>Expenses / mo</span>
			<MoneyInput bind:value={app.finances.expensesMonthly} step={100} ariaLabel="Expenses per month" />
		</label>
		<label>
			<span>Existing debt / mo</span>
			<MoneyInput bind:value={app.finances.debtMonthly} step={50} ariaLabel="Existing debt per month" />
		</label>
		<label>
			<span>Cash on hand</span>
			<MoneyInput bind:value={app.finances.cashOnHand} step={1000} ariaLabel="Cash on hand" />
		</label>
		<label>
			<span>Savings / mo</span>
			<MoneyInput bind:value={app.finances.savingsMonthly} step={100} ariaLabel="Savings per month" />
		</label>
		<label>
			<span>Rental income / mo</span>
			<MoneyInput bind:value={app.finances.rentalMonthly} step={50} ariaLabel="Rental income per month" />
		</label>
		<label class="comfort">
			<span>Comfort threshold <em class="num">{comfortPct}%</em></span>
			<input type="range" min="0.15" max="0.5" step="0.01" bind:value={app.finances.comfortFrac} />
		</label>
	</div>
</details>

<style>
	.panel {
		background: var(--paper-raised);
		border: var(--hairline);
		border-radius: var(--radius);
		padding: var(--space-3);
	}
	summary {
		cursor: pointer;
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		list-style: none;
	}
	summary::-webkit-details-marker {
		display: none;
	}
	.title {
		font-family: var(--font-display);
		font-variant-caps: small-caps;
		letter-spacing: 0.08em;
		font-size: 1.1rem;
	}
	.sum {
		font-size: 0.72rem;
		color: var(--ink-faint);
	}
	.fields {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		margin-top: var(--space-3);
		padding-top: var(--space-3);
		border-top: var(--hairline);
	}
	label {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		font-family: var(--font-body);
		font-size: 0.78rem;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--ink-faint);
	}
	label em {
		font-style: normal;
		color: var(--ink);
	}
	input[type='range'] {
		accent-color: var(--edge-cash);
		width: 100%;
	}
</style>
