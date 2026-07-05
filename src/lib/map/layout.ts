// Fixed SVG geometry for the envelope map. Pure TS — no Svelte, no $app.
// Layout constants come straight from the Homestead v1 plan (Quest 5).

export const VIEW_W = 960;
export const VIEW_H = 640;

export const MARGIN = { top: 24, right: 24, bottom: 48, left: 76 } as const;

export const PLOT_W = VIEW_W - MARGIN.left - MARGIN.right; // 860
export const PLOT_H = VIEW_H - MARGIN.top - MARGIN.bottom; // 568

export const PLOT_LEFT = MARGIN.left; // 76
export const PLOT_TOP = MARGIN.top; // 24
export const PLOT_RIGHT = MARGIN.left + PLOT_W; // 936
export const PLOT_BOTTOM = MARGIN.top + PLOT_H; // 592

/** Time horizons drawn as nested contours (months). */
export const CONTOUR_TIMES = [0, 6, 12, 18, 24] as const;

/**
 * Compact dollar label for axis ticks and readouts: $0, $150k, $1.2M.
 */
export function compactDollar(n: number): string {
	if (n === 0) return '$0';
	const abs = Math.abs(n);
	if (abs >= 1_000_000) {
		const m = n / 1_000_000;
		return `$${trim(m)}M`;
	}
	if (abs >= 1_000) {
		const k = n / 1_000;
		return `$${trim(k)}k`;
	}
	return `$${Math.round(n)}`;
}

/** Full dollar label with thousands separators: $77,400. */
export function fullDollar(n: number): string {
	return `$${Math.round(n).toLocaleString('en-US')}`;
}

function trim(n: number): string {
	// One decimal place, but drop a trailing ".0".
	return n.toFixed(1).replace(/\.0$/, '');
}
