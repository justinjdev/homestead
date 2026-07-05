<script lang="ts">
	let {
		value = $bindable(),
		min = 0,
		step = 1000,
		placeholder = '',
		ariaLabel = '',
		class: className = ''
	}: {
		value: number;
		min?: number;
		step?: number;
		placeholder?: string;
		ariaLabel?: string;
		class?: string;
	} = $props();
</script>

<span class="money {className}">
	<span class="sign" aria-hidden="true">$</span>
	<input type="number" {min} {step} {placeholder} aria-label={ariaLabel} bind:value />
</span>

<style>
	.money {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		width: 100%;
		background: var(--paper);
		border: var(--hairline);
		border-radius: var(--radius);
		padding: 0 var(--space-2);
	}
	.money.compact {
		width: 7em;
		flex: none;
	}
	.sign {
		font-family: var(--font-figures);
		font-size: 0.9rem;
		color: var(--ink-faint);
	}
	.money input {
		font-family: var(--font-figures);
		font-size: 0.95rem;
		color: var(--ink);
		background: none;
		border: none;
		padding: var(--space-1) 0;
		width: 100%;
		min-width: 0;
		text-align: right;
	}
	.money input:focus {
		outline: none;
	}
	.money:focus-within {
		outline: 2px solid var(--edge-monthly);
		outline-offset: 1px;
	}
</style>
