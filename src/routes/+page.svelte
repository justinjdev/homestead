<script lang="ts">
	// Design-system specimen: exercises all three self-hosted font faces so the
	// aesthetic checkpoint screenshot proves display, body, and figure fonts render.
</script>

<main class="sheet">
	<p class="overline">Survey No. 001 &middot; Parcel Affordability Study</p>
	<h1>Homestead</h1>
	<p class="subtitle">an affordability survey</p>

	<div class="survey-rule" aria-hidden="true"></div>

	<p class="lede">
		Plotting a household&rsquo;s finances as an affordability envelope on a plane
		of land price against improvement budget. Parcels and tiny-home options are
		staked as combo flags; the survey line traces what stays inside reach as the
		months carry on.
	</p>

	<div class="plat">
		<div class="readout">
			<span class="k">Land price</span>
			<span class="v figures">$80,000</span>
			<span class="k">Improvement budget</span>
			<span class="v figures">$140,000</span>
			<span class="k">All-in monthly</span>
			<span class="v figures">$1,710.97</span>
			<span class="k">Verdict</span>
			<span class="v verdict-in">In reach &mdash; ready in 0 mo</span>
		</div>

		<dl class="specimen">
			<dt style="color: var(--edge-cash)">Display</dt>
			<dd class="face-display">Bricolage Grotesque</dd>
			<dt style="color: var(--edge-monthly)">Body</dt>
			<dd class="face-body">Besley &mdash; <em>surveyed in the field</em></dd>
			<dt style="color: var(--line-survey)">Figures</dt>
			<dd class="face-figures figures">0123456789 &middot; $1,234.56</dd>
		</dl>
	</div>
</main>

<style>
	.sheet {
		max-width: 880px;
		margin: 0 auto;
		padding: var(--space-5) var(--space-4);
	}

	.overline {
		margin: 0 0 var(--space-3);
		font-family: var(--font-figures);
		font-size: 0.75rem;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--ink-faint);
	}

	h1 {
		margin: 0;
	}

	.subtitle {
		margin: var(--space-1) 0 0;
		font-family: var(--font-body);
		font-style: italic;
		font-weight: 600;
		font-size: 1.4rem;
		color: var(--ink-faint);
	}

	.survey-rule {
		height: 0;
		margin: var(--space-4) 0;
		border-top: 1px solid var(--line-survey);
		border-bottom: 1px solid var(--line-survey);
		padding-top: 3px;
	}

	.lede {
		max-width: 62ch;
		font-size: 1.1rem;
		color: var(--ink);
	}

	.plat {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-4);
		margin-top: var(--space-5);
	}

	@media (max-width: 720px) {
		.plat {
			grid-template-columns: 1fr;
		}
	}

	.readout {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: var(--space-1) var(--space-3);
		align-items: baseline;
		padding: var(--space-4);
		background: var(--paper-raised);
		border: var(--hairline);
		border-left: 3px solid var(--edge-cash);
		border-radius: var(--radius);
	}

	.readout .k {
		font-family: var(--font-body);
		font-size: 0.8rem;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--ink-faint);
	}

	.readout .v {
		justify-self: end;
		font-size: 1rem;
	}

	.figures {
		font-family: var(--font-figures);
		font-variant-numeric: tabular-nums;
	}

	.verdict-in {
		font-family: var(--font-display);
		font-size: 0.95rem;
		letter-spacing: 0.03em;
		color: var(--flag-in);
	}

	.specimen {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: var(--space-2) var(--space-3);
		align-items: baseline;
		margin: 0;
		padding: var(--space-4);
		background: var(--paper-raised);
		border: var(--hairline);
		border-radius: var(--radius);
	}

	.specimen dt {
		font-family: var(--font-figures);
		font-size: 0.7rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
	}

	.specimen dd {
		margin: 0;
		font-size: 1.15rem;
	}

	.face-display {
		font-family: var(--font-display);
		font-weight: 700;
		letter-spacing: 0.02em;
	}

	.face-body {
		font-family: var(--font-body);
	}

	.face-body em {
		font-weight: 600;
	}

	.face-figures {
		font-family: var(--font-figures);
		letter-spacing: 0.02em;
	}
</style>
