<script lang="ts">
	import { dismissIntro } from '$lib/state/store.svelte';
</script>

<div class="intro-scrim">
	<div class="intro-card" role="dialog" aria-modal="true" aria-labelledby="intro-title">
		<p class="intro-overline num">Field Notes · Orientation</p>
		<h2 id="intro-title">Reading the survey</h2>
		<p class="intro-lede">
			Homestead maps what land + a tiny home you can afford — land price (→) against home +
			site-work budget (↑). The shaded field is what’s within reach; each dot is a parcel × home.
		</p>
		<ol class="intro-steps">
			<li><span class="step-n num" aria-hidden="true">1</span><span>Enter your finances in the left rail.</span></li>
			<li><span class="step-n num" aria-hidden="true">2</span><span>Add parcels &amp; homes from the bottom dock.</span></li>
			<li><span class="step-n num" aria-hidden="true">3</span><span>Read the envelope — dots inside the field are affordable; open one for the full breakdown.</span></li>
		</ol>
		<button type="button" class="intro-begin" onclick={dismissIntro}>Begin the survey</button>
	</div>
</div>

<style>
	.intro-scrim {
		position: fixed;
		inset: 0;
		z-index: 20;
		display: grid;
		place-items: center;
		padding: var(--space-4);
		background: color-mix(in srgb, var(--ink) 30%, transparent);
		animation: scrim-in 400ms ease both;
	}
	.intro-card {
		max-width: 440px;
		width: 100%;
		padding: var(--space-5) var(--space-5) var(--space-4);
		background: var(--paper-raised);
		border: var(--hairline);
		border-top: 3px solid var(--line-survey);
		border-radius: var(--radius);
		box-shadow: 0 18px 50px color-mix(in srgb, var(--ink) 30%, transparent);
		animation: card-in 500ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
	}
	.intro-overline {
		margin: 0 0 var(--space-2);
		font-size: 0.7rem;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--ink-faint);
	}
	.intro-card h2 {
		margin: 0 0 var(--space-3);
	}
	.intro-lede {
		margin: 0 0 var(--space-4);
		font-family: var(--font-body);
		font-size: 0.95rem;
		line-height: 1.55;
		color: var(--ink);
	}
	.intro-steps {
		list-style: none;
		margin: 0 0 var(--space-4);
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}
	.intro-steps li {
		display: grid;
		grid-template-columns: auto 1fr;
		align-items: start;
		gap: var(--space-3);
		font-family: var(--font-body);
		font-size: 0.9rem;
		line-height: 1.4;
		color: var(--ink);
	}
	.step-n {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--edge-cash);
		border: var(--hairline);
		border-radius: 50%;
		width: 1.8em;
		height: 1.8em;
		display: grid;
		place-items: center;
	}
	.intro-begin {
		font-family: var(--font-body);
		font-weight: 600;
		font-size: 0.9rem;
		letter-spacing: 0.04em;
		color: var(--paper);
		background: var(--ink);
		border: none;
		border-radius: var(--radius);
		padding: var(--space-2) var(--space-4);
		cursor: pointer;
		transition: background 160ms ease;
	}
	.intro-begin:hover {
		background: color-mix(in srgb, var(--ink) 85%, var(--edge-cash));
	}

	@keyframes scrim-in {
		from { opacity: 0; }
		to { opacity: 1; }
	}
	@keyframes card-in {
		from { opacity: 0; transform: translateY(14px); }
		to { opacity: 1; transform: none; }
	}
	@media (prefers-reduced-motion: reduce) {
		.intro-scrim,
		.intro-card {
			animation: none;
		}
	}
</style>
