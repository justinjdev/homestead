<script lang="ts">
	import { onMount } from 'svelte';
	import { initPersistence, storageWarning, linkWarning, introSeen, pendingImport } from '$lib/state/store.svelte';
	import EnvelopeMap from '$lib/components/map/EnvelopeMap.svelte';
	import FinancesPanel from '$lib/components/FinancesPanel.svelte';
	import DetailPanel from '$lib/components/DetailPanel.svelte';
	import StressStrip from '$lib/components/StressStrip.svelte';
	import Dock from '$lib/components/Dock.svelte';
	import IntroCard from '$lib/components/IntroCard.svelte';

	let mounted = $state(false);
	let hadHash = $state(false);

	onMount(() => {
		hadHash = location.hash !== '';
		initPersistence();
		mounted = true;
	});

	// First-visit only: shown after mount when there is no shared-link hash, no
	// pending import, and the intro has not been dismissed on this device.
	const showIntro = $derived(
		mounted && !hadHash && pendingImport.state === null && !introSeen.seen
	);
</script>

<div class="survey">
	<header class="cartouche reveal" style="--d: 0ms">
		<p class="overline num">Survey No. 001 · Parcel Affordability Study</p>
		<h1>HOMESTEAD</h1>
		<p class="subtitle">an affordability survey</p>
	</header>

	<aside class="rail left reveal" style="--d: 220ms">
		<FinancesPanel />
	</aside>

	<div class="map-slot reveal" style="--d: 110ms">
		<EnvelopeMap />
	</div>

	<aside class="rail right reveal" style="--d: 220ms">
		<DetailPanel />
	</aside>

	<div class="stress-slot reveal" style="--d: 320ms">
		<StressStrip />
	</div>

	<div class="dock-slot reveal" style="--d: 420ms">
		<Dock />
	</div>
</div>

{#if showIntro}
	<IntroCard />
{/if}

{#if storageWarning.active}
	<div class="toast" role="status">
		Saving is unavailable — your changes stay in this browser session only.
	</div>
{/if}

{#if linkWarning.active}
	<div class="toast link-notice" role="status">
		<span>That shared link was malformed and couldn’t be read — showing your saved survey instead.</span>
		<button type="button" class="toast-dismiss" onclick={() => (linkWarning.active = false)} aria-label="Dismiss notice">×</button>
	</div>
{/if}

<style>
	.survey {
		display: grid;
		grid-template-columns: 280px minmax(0, 1fr) 320px;
		grid-template-areas:
			'header header header'
			'left map right'
			'stress stress stress'
			'dock dock dock';
		gap: var(--space-3);
		max-width: 1440px;
		margin: 0 auto;
		padding: var(--space-4);
		align-items: start;
	}
	.cartouche {
		grid-area: header;
		text-align: center;
		margin-bottom: var(--space-2);
	}
	.overline {
		margin: 0 0 var(--space-2);
		font-size: 0.72rem;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--ink-faint);
	}
	.cartouche h1 {
		margin: 0;
		letter-spacing: 0.12em;
	}
	.subtitle {
		margin: var(--space-1) 0 0;
		font-family: var(--font-body);
		font-style: italic;
		font-weight: 600;
		font-size: 1.2rem;
		color: var(--ink-faint);
	}
	.left {
		grid-area: left;
	}
	.map-slot {
		grid-area: map;
	}
	.right {
		grid-area: right;
	}
	.stress-slot {
		grid-area: stress;
	}
	.dock-slot {
		grid-area: dock;
	}

	.toast {
		position: fixed;
		bottom: var(--space-4);
		left: 50%;
		transform: translateX(-50%);
		background: var(--ink);
		color: var(--paper);
		font-family: var(--font-body);
		font-size: 0.85rem;
		padding: var(--space-2) var(--space-4);
		border-radius: var(--radius);
		box-shadow: 0 6px 24px color-mix(in srgb, var(--ink) 25%, transparent);
		z-index: 10;
	}

	.link-notice {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}
	.toast-dismiss {
		background: none;
		border: none;
		color: var(--paper);
		font-family: var(--font-body);
		font-size: 1.1rem;
		line-height: 1;
		cursor: pointer;
		padding: 0;
	}

	@keyframes rise {
		from {
			opacity: 0;
			transform: translateY(12px);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}
	.reveal {
		animation: rise 600ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
		animation-delay: var(--d, 0ms);
	}

	@media (max-width: 1100px) {
		.survey {
			grid-template-columns: 1fr;
			grid-template-areas:
				'header'
				'map'
				'left'
				'right'
				'stress'
				'dock';
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.reveal {
			animation: none;
		}
	}
</style>
