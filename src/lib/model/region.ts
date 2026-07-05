/*
 * Derivation of constraint coefficients (appears per plan requirement):
 *
 * Let x = land price, y = improvement budget, s = siteWorkFrac (default 0.25),
 * ov = 1 + stress.siteWorkOverrunFrac, kL/kH = paymentFactor(rate+Δ, term),
 * taxM = taxAnnualPct/100/12.
 *
 * The improvement budget y splits as:
 *   site work (cash) = s * y * ov
 *   home cost = (1 - s) * y  (financed)
 *
 * Cash constraint:
 *   x*(land.downFrac + closingFrac) + y*(s*ov + (1-s)*home.downFrac) ≤ cashOnHand + savingsMonthly*t
 *   → a1*x + b1*y ≤ c1
 *
 * Monthly constraint:
 *   x*((1-land.downFrac)*kL + taxM) + y*(1-s)*((1-home.downFrac)*kH + taxM) ≤ capacity - insuranceMonthly
 *   → a2*x + b2*y ≤ c2
 *
 * Both are half-planes a*x + b*y ≤ c with a,b > 0. Region = first quadrant ∩ both.
 *
 * Implemented via Sutherland–Hodgman clipping starting from a huge bounding quad.
 */

import { capacity } from './evaluate';
import { paymentFactor } from './payment';
import type { FinanceProfile, Polygon, Presets, Stress } from './types';

const M = 1e8; // large bound for the initial bounding quadrilateral

export interface Constraint {
	a: number;
	b: number;
	c: number; // a*x + b*y <= c
}

/**
 * Clip the first quadrant against a set of linear constraints using Sutherland–Hodgman.
 *
 * Starts from a huge quad [[0,0],[M,0],[M,M],[0,M]] and clips against each
 * half-plane a*x + b*y ≤ c in sequence. Returns [] when any c < 0 (no feasible
 * region at the origin).
 */
export function clipQuadrant(constraints: Constraint[]): Polygon {
	// Early exit: if any c < 0, the origin is infeasible
	if (constraints.some(({ c }) => c < 0)) return [];

	let poly: Polygon = [[0, 0], [M, 0], [M, M], [0, M]];

	for (const { a, b, c } of constraints) {
		if (poly.length === 0) break;
		poly = clipByHalfPlane(poly, a, b, c);
	}

	return poly;
}

/**
 * Sutherland–Hodgman clip of a convex polygon by the half-plane a*x + b*y ≤ c.
 * Returns the clipped polygon vertices in CCW order.
 */
function clipByHalfPlane(poly: Polygon, a: number, b: number, c: number): Polygon {
	const result: Polygon = [];
	const n = poly.length;

	for (let i = 0; i < n; i++) {
		const curr = poly[i];
		const next = poly[(i + 1) % n];
		const currIn = a * curr[0] + b * curr[1] <= c + 1e-12;
		const nextIn = a * next[0] + b * next[1] <= c + 1e-12;

		if (currIn) result.push(curr);

		if (currIn !== nextIn) {
			// Compute intersection of edge (curr→next) with line a*x + b*y = c
			const [x1, y1] = curr;
			const [x2, y2] = next;
			const dx = x2 - x1;
			const dy = y2 - y1;
			const denom = a * dx + b * dy;
			// denom ≠ 0 since currIn !== nextIn
			const t = (c - a * x1 - b * y1) / denom;
			result.push([x1 + t * dx, y1 + t * dy]);
		}
	}

	return result;
}

/**
 * Ensure the polygon is CCW and starts at the vertex nearest [0,0].
 */
function normalizePolygon(poly: Polygon): Polygon {
	if (poly.length < 3) return poly;

	// Compute signed area; if negative, polygon is CW → reverse
	let area = 0;
	for (let i = 0; i < poly.length; i++) {
		const [x1, y1] = poly[i];
		const [x2, y2] = poly[(i + 1) % poly.length];
		area += x1 * y2 - x2 * y1;
	}
	if (area < 0) poly = poly.slice().reverse() as Polygon;

	// Rotate so that [0,0] (or nearest vertex) is first
	let nearest = 0;
	let nearestDist = Infinity;
	for (let i = 0; i < poly.length; i++) {
		const [x, y] = poly[i];
		const d = x * x + y * y;
		if (d < nearestDist) { nearestDist = d; nearest = i; }
	}
	return [...poly.slice(nearest), ...poly.slice(0, nearest)] as Polygon;
}

/**
 * The two binding half-planes that (together with the first quadrant) define
 * the affordability envelope. Exposed so the map can identify which polygon
 * edge lies on the cash vs. the monthly constraint without recomputing money
 * math in a component (CLAUDE.md hard rule 2).
 */
export interface RegionConstraints {
	cash: Constraint;
	monthly: Constraint;
}

/**
 * Compute the cash and monthly constraint coefficients (a*x + b*y ≤ c) for the
 * envelope. Single source of truth consumed by both `region` and the map.
 */
export function regionConstraints(
	finances: FinanceProfile,
	presets: Presets,
	stress: Stress,
	tMonths: number,
	siteWorkFrac = 0.25
): RegionConstraints {
	const { land, home, closingFrac, taxAnnualPct, insuranceMonthly } = presets;
	const s = siteWorkFrac;
	const ov = 1 + stress.siteWorkOverrunFrac;

	const landRate = land.annualRatePct + stress.rateDeltaPct;
	const homeRate = home.annualRatePct + stress.rateDeltaPct;
	const kL = paymentFactor(landRate, land.termMonths);
	const kH = paymentFactor(homeRate, home.termMonths);
	const taxM = taxAnnualPct / 100 / 12;

	// Cash constraint: a1*x + b1*y <= c1
	const cashAvailable = finances.cashOnHand + finances.savingsMonthly * tMonths;
	const a1 = land.downFrac + closingFrac;
	const b1 = s * ov + (1 - s) * home.downFrac;
	const c1 = cashAvailable;

	// Monthly constraint: a2*x + b2*y <= c2
	// capacity may be ≤ insuranceMonthly, producing c2 ≤ 0 → empty region
	const cap = capacity(finances, stress);
	const c2 = cap - insuranceMonthly;
	const a2 = (1 - land.downFrac) * kL + taxM;
	const b2 = (1 - s) * ((1 - home.downFrac) * kH + taxM);

	return {
		cash: { a: a1, b: b1, c: c1 },
		monthly: { a: a2, b: b2, c: c2 },
	};
}

/**
 * Compute the affordability envelope polygon.
 *
 * @param finances     - User finance profile
 * @param presets      - Financing presets
 * @param stress       - Stress parameters (applied to both constraints)
 * @param tMonths      - Time horizon in months (grows cash constraint)
 * @param siteWorkFrac - Share of improvement budget y that is site work (default 0.25)
 * @returns            - CCW polygon in [landPrice, improvementBudget] space; [] if empty
 */
export function region(
	finances: FinanceProfile,
	presets: Presets,
	stress: Stress,
	tMonths: number,
	siteWorkFrac = 0.25
): Polygon {
	const { cash, monthly } = regionConstraints(finances, presets, stress, tMonths, siteWorkFrac);
	const poly = clipQuadrant([cash, monthly]);
	return normalizePolygon(poly);
}
