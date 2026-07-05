<script lang="ts">
	import {
		app,
		comboKey,
		pendingImport,
		acceptImport,
		dismissImport,
		shareUrl
	} from '$lib/state/store.svelte';
	import { evaluate, comboCosts, countedRentMonthly } from '$lib/model';
	import type { LoanTerms } from '$lib/model/types';
	import { fullDollar } from '$lib/map/layout';
	import SiteWorkDrawer from './SiteWorkDrawer.svelte';

	const sel = $derived.by(() => {
		if (!app.selected) return null;
		const [pid, hid] = app.selected.split(':');
		const parcel = app.parcels.find((p) => p.id === pid);
		const home = app.homes.find((h) => h.id === hid);
		if (!parcel || !home) return null;
		return { parcel, home };
	});

	const costs = $derived(sel ? comboCosts(sel.parcel, sel.home, app.presets, app.stress) : null);
	const ev = $derived(
		sel ? evaluate(app.finances, sel.parcel, sel.home, app.presets, app.stress, app.timeMonths) : null
	);
	const counted = $derived(countedRentMonthly(app.finances));

	function pickParcel(e: Event) {
		const pid = (e.currentTarget as HTMLSelectElement).value;
		if (sel) app.selected = comboKey(pid, sel.home.id);
	}
	function pickHome(e: Event) {
		const hid = (e.currentTarget as HTMLSelectElement).value;
		if (sel) app.selected = comboKey(sel.parcel.id, hid);
	}

	function num(e: Event): number {
		return Number((e.currentTarget as HTMLInputElement).value) || 0;
	}

	let copied = $state(false);
	async function share() {
		try {
			await navigator.clipboard.writeText(shareUrl());
			copied = true;
			setTimeout(() => (copied = false), 1500);
		} catch {
			copied = false;
		}
	}

	const readiness = $derived.by(() => {
		if (!ev) return null;
		if (ev.verdict === 'in') return { text: 'Ready now', tone: 'in' };
		if (ev.readyInMonths != null && ev.readyInMonths > 0)
			return { text: `Ready in ${ev.readyInMonths} mo`, tone: 'wait' };
		if (ev.notReachableReason === 'no-savings') return { text: 'Needs more cash', tone: 'out' };
		return { text: 'Not reachable by saving', tone: 'out' };
	});

	function marginsLine(m: { siteWorkOverrunFrac: number | null; rateRisePct: number | null; incomeDropMonthly: number }): string {
		const site = m.siteWorkOverrunFrac == null ? 'n/a' : `${m.siteWorkOverrunFrac >= 0 ? '+' : ''}${Math.round(m.siteWorkOverrunFrac * 100)}%`;
		const rate = m.rateRisePct == null ? 'n/a' : `+${m.rateRisePct.toFixed(1)} pp`;
		const income = `−${fullDollar(Math.max(0, m.incomeDropMonthly))}/mo`;
		return `site work ${site} · rate ${rate} · income ${income}`;
	}
</script>

{#snippet financing(loan: LoanTerms, label: string)}
	<div class="fin">
		<span class="fin-label">{label}</span>
		<label>
			down
			<input class="num" type="number" min="0" max="100" step="5" value={Math.round(loan.downFrac * 100)} oninput={(e) => (loan.downFrac = num(e) / 100)} />%
		</label>
		{#if loan.downFrac < 1}
			<label>
				rate
				<input class="num" type="number" min="0" step="0.25" bind:value={loan.annualRatePct} />%
			</label>
			<label>
				term
				<input class="num" type="number" min="1" step="1" value={Math.round(loan.termMonths / 12)} oninput={(e) => (loan.termMonths = num(e) * 12)} />yr
			</label>
		{/if}
	</div>
{/snippet}

<aside class="detail">
	{#if pendingImport.state}
		<div class="import">
			<p>Opened from a link — keep it?</p>
			<div class="import-acts">
				<button class="keep" onclick={acceptImport}>Keep</button>
				<button class="dismiss" onclick={dismissImport}>Dismiss</button>
			</div>
		</div>
	{/if}

	<header class="detail-head">
		<h3>Detail</h3>
		<button class="share" onclick={share}>{copied ? 'copied' : 'Share'}</button>
	</header>

	{#if sel && costs && ev}
		<div class="pickers">
			<label>
				parcel
				<select value={sel.parcel.id} onchange={pickParcel}>
					{#each app.parcels as p (p.id)}
						<option value={p.id}>{p.name}</option>
					{/each}
				</select>
			</label>
			<label>
				home
				<select value={sel.home.id} onchange={pickHome}>
					{#each app.homes as h (h.id)}
						<option value={h.id}>{h.name}</option>
					{/each}
				</select>
			</label>
		</div>

		{#if readiness}
			<div class="badge {readiness.tone}">{readiness.text}</div>
		{/if}

		{@render financing(app.presets.land, 'Land loan')}
		{@render financing(app.presets.home, 'Home loan')}

		<div class="fin overrides">
			<span class="fin-label">This parcel</span>
			<label>
				tax
				<input class="num" type="number" min="0" step="0.1" value={sel.parcel.taxAnnualPct ?? app.presets.taxAnnualPct} oninput={(e) => (sel.parcel.taxAnnualPct = num(e))} />%/yr
			</label>
			<label>
				closing
				<input class="num" type="number" min="0" step="0.5" value={Math.round((sel.parcel.closingFrac ?? app.presets.closingFrac) * 100)} oninput={(e) => (sel.parcel.closingFrac = num(e) / 100)} />%
			</label>
		</div>

		<table class="breakdown">
			<caption>Upfront cash</caption>
			<tbody>
				<tr><th>Land down</th><td class="num">{fullDollar(costs.landDown)}</td></tr>
				<tr><th>Closing</th><td class="num">{fullDollar(costs.closing)}</td></tr>
				<tr><th>Home down</th><td class="num">{fullDollar(costs.homeDown)}</td></tr>
				<tr><th>Site work</th><td class="num">{fullDollar(costs.siteWorkCash)}</td></tr>
				<tr class="total"><th>Cash needed</th><td class="num">{fullDollar(costs.cashNeeded)}</td></tr>
				<tr class="avail" class:short={!ev.cashOk}><th>Available</th><td class="num">{fullDollar(ev.cashAvailable)}</td></tr>
			</tbody>
		</table>

		<table class="breakdown">
			<caption>Monthly</caption>
			<tbody>
				<tr><th>Land payment</th><td class="num">{fullDollar(costs.landPayment)}</td></tr>
				<tr><th>Home payment</th><td class="num">{fullDollar(costs.homePayment)}</td></tr>
				<tr><th>Tax</th><td class="num">{fullDollar(costs.taxMonthly)}</td></tr>
				<tr><th>Insurance</th><td class="num">{fullDollar(app.presets.insuranceMonthly)}</td></tr>
				<tr class="total"><th>Monthly cost</th><td class="num">{fullDollar(costs.monthlyCost)}</td></tr>
				{#if app.finances.rentalMonthly > 0}
					<tr class="rental"><th>Rental income (75%)</th><td class="num">−{fullDollar(counted)}</td></tr>
					<tr class="total"><th>Net monthly</th><td class="num">{fullDollar(costs.monthlyCost - counted)}</td></tr>
				{/if}
				<tr class="avail" class:short={!ev.monthlyOk}><th>Capacity</th><td class="num">{fullDollar(ev.monthlyCapacity)}</td></tr>
			</tbody>
		</table>

		<div class="margins">
			<span class="m-label">Survives</span>
			<span class="m-body num">{marginsLine(ev.margins)}</span>
		</div>

		<SiteWorkDrawer home={sel.home} />
	{:else}
		<p class="placeholder">
			Select a combo — click a stake-flag dot on the map or a chip in the dock — to see its full
			cost breakdown, margins of safety, and the site-work estimator.
		</p>
	{/if}
</aside>

<style>
	.detail {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		background: var(--paper-raised);
		border: var(--hairline);
		border-radius: var(--radius);
		padding: var(--space-3);
	}
	.detail-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.detail-head h3 {
		margin: 0;
		font-size: 1.1rem;
		font-variant-caps: small-caps;
		letter-spacing: 0.08em;
	}
	.share {
		font-family: var(--font-body);
		font-size: 0.72rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--paper);
		background: var(--edge-monthly);
		border: none;
		border-radius: var(--radius);
		padding: var(--space-1) var(--space-3);
		cursor: pointer;
	}
	.import {
		background: var(--paper);
		border: var(--hairline);
		border-left: 3px solid var(--edge-cash);
		border-radius: var(--radius);
		padding: var(--space-2) var(--space-3);
	}
	.import p {
		margin: 0 0 var(--space-2);
		font-family: var(--font-body);
		font-size: 0.85rem;
	}
	.import-acts {
		display: flex;
		gap: var(--space-2);
	}
	.import-acts button {
		font-family: var(--font-body);
		font-size: 0.75rem;
		letter-spacing: 0.04em;
		border: var(--hairline);
		border-radius: var(--radius);
		padding: var(--space-1) var(--space-3);
		cursor: pointer;
	}
	.keep {
		color: var(--paper);
		background: var(--line-survey);
		border-color: transparent;
	}
	.dismiss {
		color: var(--ink);
		background: var(--paper);
	}
	.pickers {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}
	.pickers label,
	.fin label {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-family: var(--font-body);
		font-size: 0.72rem;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--ink-faint);
	}
	select {
		flex: 1;
		font-family: var(--font-body);
		font-size: 0.85rem;
		color: var(--ink);
		background: var(--paper);
		border: var(--hairline);
		border-radius: var(--radius);
		padding: var(--space-1) var(--space-2);
	}
	.fin {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2) var(--space-3);
		padding: var(--space-2) var(--space-3);
		border: var(--hairline);
		border-radius: var(--radius);
	}
	.fin-label {
		width: 100%;
		font-family: var(--font-body);
		font-size: 0.7rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--ink);
	}
	.fin input,
	.overrides input {
		width: 4em;
		font-family: var(--font-figures);
		font-size: 0.85rem;
		color: var(--ink);
		background: var(--paper);
		border: var(--hairline);
		border-radius: var(--radius);
		padding: var(--space-1) var(--space-2);
		text-align: right;
	}
	.badge {
		align-self: flex-start;
		font-family: var(--font-display);
		font-variant-caps: small-caps;
		letter-spacing: 0.06em;
		font-size: 0.95rem;
		padding: var(--space-1) var(--space-3);
		border-radius: var(--radius);
		border: var(--hairline);
	}
	.badge.in {
		color: var(--paper);
		background: var(--flag-in);
		border-color: transparent;
	}
	.badge.wait {
		color: var(--ink);
		background: color-mix(in srgb, var(--edge-cash) 22%, transparent);
	}
	.badge.out {
		color: var(--paper);
		background: var(--flag);
		border-color: transparent;
	}
	.breakdown {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.82rem;
	}
	.breakdown caption {
		text-align: left;
		font-family: var(--font-body);
		font-size: 0.7rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--ink-faint);
		margin-bottom: var(--space-1);
	}
	.breakdown th {
		text-align: left;
		font-family: var(--font-body);
		font-weight: 400;
		color: var(--ink);
		padding: 2px 0;
	}
	.breakdown td {
		text-align: right;
		font-family: var(--font-figures);
		color: var(--ink);
		padding: 2px 0;
	}
	.breakdown .total th,
	.breakdown .total td {
		border-top: var(--hairline);
		font-weight: 600;
	}
	.breakdown .avail td {
		color: var(--flag-in);
	}
	.breakdown .avail.short td {
		color: var(--flag);
	}
	.margins {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		padding: var(--space-2) var(--space-3);
		background: var(--paper);
		border: var(--hairline);
		border-radius: var(--radius);
	}
	.m-label {
		font-family: var(--font-body);
		font-size: 0.7rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--ink-faint);
	}
	.m-body {
		font-size: 0.82rem;
		color: var(--ink);
	}
	.placeholder {
		margin: 0;
		font-family: var(--font-body);
		font-style: italic;
		font-size: 0.9rem;
		line-height: 1.5;
		color: var(--ink-faint);
	}
</style>
