// Pure-TS map scales: no Svelte, no $app imports.
import type { HomeOption, Parcel, Polygon } from '$lib/model/types';

/**
 * Smallest "nice" number (1, 2, or 5 × 10^k) greater than or equal to n.
 * niceCeil(0) is 1000 so a blank map still has a sensible axis.
 */
export function niceCeil(n: number): number {
	if (n <= 0) return 1000;
	const exp = Math.floor(Math.log10(n));
	const base = Math.pow(10, exp);
	for (const m of [1, 2, 5, 10]) {
		const candidate = m * base;
		if (candidate >= n - 1e-6) return candidate;
	}
	return 10 * base;
}

/**
 * Linear, 0-based scale from a value domain [0, domainMax] to pixels [0, rangePx].
 */
export function makeScale(domainMax: number, rangePx: number): (v: number) => number {
	return (v: number) => (v / domainMax) * rangePx;
}

const DOMAIN_FLOOR = 50_000;

/**
 * Compute nice axis maxima for the map.
 *
 * xMax spans land price (polygon x-vertices + parcel prices); yMax spans the
 * improvement budget (polygon y-vertices + home cost + site work). Each is
 * 1.25× the largest relevant value, floored at 50k, then rounded up to a nice
 * number so the envelope and all plotted entities sit comfortably inside.
 */
export function domains(
	polys: Polygon[],
	parcels: Parcel[],
	homes: HomeOption[]
): { xMax: number; yMax: number } {
	let xRaw = 0;
	let yRaw = 0;

	for (const poly of polys) {
		for (const [x, y] of poly) {
			if (x > xRaw) xRaw = x;
			if (y > yRaw) yRaw = y;
		}
	}
	for (const p of parcels) {
		if (p.landPrice > xRaw) xRaw = p.landPrice;
	}
	for (const h of homes) {
		const total = h.homeCost + h.siteWork;
		if (total > yRaw) yRaw = total;
	}

	return {
		xMax: niceCeil(Math.max(DOMAIN_FLOOR, xRaw * 1.25)),
		yMax: niceCeil(Math.max(DOMAIN_FLOOR, yRaw * 1.25))
	};
}

/**
 * Five evenly spaced tick values spanning [0, max] inclusive.
 */
export function ticks(max: number): number[] {
	return [0, 1, 2, 3, 4].map((i) => (max * i) / 4);
}
