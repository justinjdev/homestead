<script lang="ts">
	// Cartographic KEY for the affordability map. Rendered as an opaque plat-map
	// key box pinned in the plot's upper-right corner (the envelope sits lower-left).
</script>

<figure class="legend" aria-label="Map key">
	<figcaption class="legend-title">Key</figcaption>
	<ul class="legend-items">
		<li>
			<span class="swatch region" aria-hidden="true"></span>
			<span class="legend-label">In reach</span>
		</li>
		<li>
			<span class="swatch line cash" aria-hidden="true"></span>
			<span class="legend-label">Cash limit — down + site work + closing</span>
		</li>
		<li>
			<span class="swatch line monthly" aria-hidden="true"></span>
			<span class="legend-label">Monthly limit — payments + tax + insurance</span>
		</li>
		<li>
			<span class="swatch line survey" aria-hidden="true"></span>
			<span class="legend-label">As you save · now → 24 mo</span>
		</li>
		<li>
			<svg class="swatch flag" viewBox="0 0 16 16" aria-hidden="true">
				<line class="pole in" x1="4" y1="15" x2="4" y2="2" />
				<path class="tri in" d="M4 2 L13 4.5 L4 7 Z" />
				<circle class="base in" cx="4" cy="15" r="2.4" />
			</svg>
			<span class="legend-label">Combo in reach</span>
		</li>
		<li>
			<svg class="swatch flag" viewBox="0 0 16 16" aria-hidden="true">
				<line class="pole out" x1="4" y1="15" x2="4" y2="2" />
				<path class="tri out" d="M4 2 L13 4.5 L4 7 Z" />
				<circle class="base out" cx="4" cy="15" r="2.4" />
			</svg>
			<span class="legend-label">Out of reach</span>
		</li>
	</ul>
</figure>

<style>
	.legend {
		position: absolute;
		top: var(--space-2);
		right: var(--space-2);
		margin: 0;
		max-width: 224px;
		padding: var(--space-2) var(--space-3);
		background: var(--paper-raised);
		border: var(--hairline);
		border-radius: var(--radius);
		box-shadow: 0 2px 10px color-mix(in srgb, var(--ink) 12%, transparent);
	}
	.legend-title {
		margin: 0 0 var(--space-2);
		padding-bottom: var(--space-1);
		font-family: var(--font-body);
		font-size: 0.62rem;
		font-weight: 600;
		letter-spacing: 0.24em;
		text-transform: uppercase;
		color: var(--ink-faint);
		border-bottom: var(--hairline);
	}
	.legend-items {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}
	.legend-items li {
		display: grid;
		grid-template-columns: 18px 1fr;
		align-items: center;
		gap: var(--space-2);
	}
	.legend-label {
		font-family: var(--font-body);
		font-size: 0.66rem;
		line-height: 1.25;
		color: var(--ink);
	}
	.swatch {
		width: 18px;
		height: 12px;
	}
	.swatch.region {
		background: var(--region-fill);
		border: 1px solid color-mix(in srgb, var(--line-survey) 55%, transparent);
		border-radius: 1px;
	}
	.swatch.line {
		height: 0;
		align-self: center;
		border-top-width: 2.5px;
		border-top-style: solid;
	}
	.swatch.line.cash {
		border-top-color: var(--edge-cash);
	}
	.swatch.line.monthly {
		border-top-color: var(--edge-monthly);
	}
	.swatch.line.survey {
		border-top-width: 1.5px;
		border-top-style: dashed;
		border-top-color: var(--line-survey);
	}
	.swatch.flag {
		width: 16px;
		height: 16px;
		overflow: visible;
	}
	.pole {
		stroke-width: 1.5;
	}
	.tri {
		stroke-width: 0.5;
	}
	.base {
		stroke-width: 0.5;
	}
	.pole.in,
	.tri.in,
	.base.in {
		stroke: var(--flag-in);
	}
	.tri.in,
	.base.in {
		fill: var(--flag-in);
	}
	.pole.out,
	.tri.out,
	.base.out {
		stroke: var(--flag);
	}
	.tri.out,
	.base.out {
		fill: var(--flag);
	}
</style>
