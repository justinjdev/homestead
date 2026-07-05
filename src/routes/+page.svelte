<script lang="ts">
	import { onMount } from 'svelte';
	import { initPersistence } from '$lib/state/store.svelte';
	import EnvelopeMap from '$lib/components/map/EnvelopeMap.svelte';

	onMount(() => {
		initPersistence();
	});
</script>

<main class="page">
	<header class="cartouche">
		<p class="overline">Survey No. 001 &middot; Parcel Affordability Study</p>
		<h1>HOMESTEAD</h1>
		<p class="subtitle">an affordability survey</p>
	</header>

	<EnvelopeMap />
</main>

<style>
	.page { max-width: 1080px; margin: 0 auto; padding: var(--space-5) var(--space-4); display: flex; flex-direction: column; gap: var(--space-4); }
	.cartouche { text-align: center; }
	.overline { margin: 0 0 var(--space-2); font-family: var(--font-figures); font-size: 0.72rem; letter-spacing: 0.22em; text-transform: uppercase; color: var(--ink-faint); }
	.cartouche h1 { margin: 0; letter-spacing: 0.08em; }
	.subtitle { margin: var(--space-1) 0 0; font-family: var(--font-body); font-style: italic; font-weight: 600; font-size: 1.2rem; color: var(--ink-faint); }
</style>
