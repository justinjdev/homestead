<script lang="ts">
	import {
		app,
		comboKey,
		addParcel,
		addHome,
		removeParcel,
		removeHome,
		toggleMuted
	} from '$lib/state/store.svelte';
	import { evaluate } from '$lib/model';
	import MoneyInput from './MoneyInput.svelte';

	let newParcel = $state({ name: '', landPrice: 0 });
	let newHome = $state({ name: '', homeCost: 0, siteWork: 0 });

	function submitParcel(e: SubmitEvent) {
		e.preventDefault();
		if (!newParcel.name.trim()) return;
		addParcel({ name: newParcel.name.trim(), landPrice: newParcel.landPrice });
		newParcel = { name: '', landPrice: 0 };
	}

	function submitHome(e: SubmitEvent) {
		e.preventDefault();
		if (!newHome.name.trim()) return;
		addHome({ name: newHome.name.trim(), homeCost: newHome.homeCost, siteWork: newHome.siteWork });
		newHome = { name: '', homeCost: 0, siteWork: 0 };
	}

	type Chip = { key: string; label: string; verdict: string; state: 'in' | 'out'; muted: boolean };

	const chips = $derived.by((): Chip[] => {
		const out: Chip[] = [];
		for (const p of app.parcels) {
			for (const h of app.homes) {
				const key = comboKey(p.id, h.id);
				const ev = evaluate(app.finances, p, h, app.presets, app.stress, app.timeMonths);
				let verdict: string;
				if (ev.verdict === 'in') verdict = 'IN';
				else if (ev.readyInMonths != null && ev.readyInMonths > 0) verdict = `in ${ev.readyInMonths} mo`;
				else verdict = 'OUT';
				out.push({
					key,
					label: `${p.name} × ${h.name}`,
					verdict,
					state: ev.verdict,
					muted: app.muted.includes(key)
				});
			}
		}
		return out;
	});
</script>

<section class="dock">
	<div class="col">
		<h3>Parcels</h3>
		<p class="cols">name · price</p>
		<ul class="rows">
			{#each app.parcels as parcel (parcel.id)}
				<li class="row">
					<input class="name" type="text" bind:value={parcel.name} aria-label="Parcel name" />
					<MoneyInput class="compact" bind:value={parcel.landPrice} ariaLabel="Land price" />
					<button class="remove" onclick={() => removeParcel(parcel.id)} aria-label="Remove parcel">×</button>
				</li>
			{/each}
		</ul>
		<form class="add" onsubmit={submitParcel}>
			<input class="name" type="text" placeholder="New parcel" bind:value={newParcel.name} />
			<MoneyInput class="compact" bind:value={newParcel.landPrice} placeholder="price" ariaLabel="New parcel price" />
			<button type="submit" class="add-btn" aria-label="Add parcel">+</button>
		</form>
	</div>

	<div class="col">
		<h3>Homes</h3>
		<p class="cols">name · cost · site work</p>
		<ul class="rows">
			{#each app.homes as home (home.id)}
				<li class="row">
					<input class="name" type="text" bind:value={home.name} aria-label="Home name" />
					<MoneyInput class="compact" bind:value={home.homeCost} ariaLabel="Home cost" />
					<MoneyInput class="compact" bind:value={home.siteWork} ariaLabel="Site work" />
					<button class="remove" onclick={() => removeHome(home.id)} aria-label="Remove home">×</button>
				</li>
			{/each}
		</ul>
		<form class="add" onsubmit={submitHome}>
			<input class="name" type="text" placeholder="New home" bind:value={newHome.name} />
			<MoneyInput class="compact" bind:value={newHome.homeCost} placeholder="cost" ariaLabel="New home cost" />
			<MoneyInput class="compact" bind:value={newHome.siteWork} placeholder="site" ariaLabel="New home site work" />
			<button type="submit" class="add-btn" aria-label="Add home">+</button>
		</form>
	</div>

	<div class="col chips-col">
		<h3>Combos</h3>
		{#if chips.length === 0}
			<p class="hint">Add a parcel and a home to plot combos.</p>
		{:else}
			<ul class="chips">
				{#each chips as chip (chip.key)}
					<li class="chip {chip.state}" class:muted={chip.muted} class:selected={app.selected === chip.key}>
						<button class="chip-main" onclick={() => (app.selected = chip.key)}>
							<span class="chip-label">{chip.label}</span>
							<span class="chip-verdict num">{chip.verdict}</span>
						</button>
						<button class="mute" onclick={() => toggleMuted(chip.key)} aria-label={chip.muted ? 'Unmute combo' : 'Mute combo'}>
							{chip.muted ? 'show' : 'hide'}
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</section>

<style>
	.dock {
		display: grid;
		grid-template-columns: 1fr 1fr 1.4fr;
		gap: var(--space-4);
		background: var(--paper-raised);
		border: var(--hairline);
		border-radius: var(--radius);
		padding: var(--space-4);
	}
	h3 {
		margin: 0 0 var(--space-3);
		font-size: 1.05rem;
		font-variant-caps: small-caps;
		letter-spacing: 0.08em;
	}
	.cols {
		margin: -0.35rem 0 var(--space-2);
		font-family: var(--font-body);
		font-size: 0.68rem;
		letter-spacing: 0.04em;
		color: var(--ink-faint);
	}
	.rows,
	.chips {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}
	.row,
	.add {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}
	.add {
		margin-top: var(--space-2);
	}
	input {
		font-family: var(--font-body);
		font-size: 0.85rem;
		color: var(--ink);
		background: var(--paper);
		border: var(--hairline);
		border-radius: var(--radius);
		padding: var(--space-1) var(--space-2);
	}
	.name {
		flex: 1;
		min-width: 0;
	}
	.num {
		font-family: var(--font-figures);
		text-align: right;
		width: 5.5em;
	}
	.remove,
	.add-btn {
		font-family: var(--font-figures);
		font-size: 1rem;
		line-height: 1;
		color: var(--ink-faint);
		background: var(--paper);
		border: var(--hairline);
		border-radius: var(--radius);
		width: 1.8em;
		height: 1.8em;
		cursor: pointer;
		flex: none;
	}
	.add-btn {
		color: var(--line-survey);
	}
	.remove:hover {
		color: var(--flag);
	}
	.hint {
		font-family: var(--font-body);
		font-style: italic;
		font-size: 0.85rem;
		color: var(--ink-faint);
	}
	.chip {
		display: flex;
		align-items: stretch;
		border: var(--hairline);
		border-radius: var(--radius);
		overflow: hidden;
		background: var(--paper);
	}
	.chip.selected {
		outline: 2px solid var(--edge-monthly);
		outline-offset: 1px;
	}
	.chip.muted {
		opacity: 0.45;
	}
	.chip-main {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2);
		background: none;
		border: none;
		cursor: pointer;
		padding: var(--space-2) var(--space-3);
		text-align: left;
	}
	.chip-label {
		font-family: var(--font-body);
		font-size: 0.82rem;
		color: var(--ink);
	}
	.chip-verdict {
		font-size: 0.75rem;
		letter-spacing: 0.04em;
	}
	.chip.in .chip-verdict {
		color: var(--flag-in);
	}
	.chip.out .chip-verdict {
		color: var(--flag);
	}
	.mute {
		font-family: var(--font-body);
		font-size: 0.68rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--ink-faint);
		background: var(--paper-raised);
		border: none;
		border-left: var(--hairline);
		padding: 0 var(--space-2);
		cursor: pointer;
	}
	@media (max-width: 1100px) {
		.dock {
			grid-template-columns: 1fr;
		}
	}
</style>
