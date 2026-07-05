import { describe, expect, it } from 'vitest';
import { clipQuadrant, region, regionConstraints } from './region';
import type { FinanceProfile, Presets, Stress } from './types';

const defaultPresets: Presets = {
	land: { downFrac: 0.25, annualRatePct: 8.0, termMonths: 180 },
	home: { downFrac: 0.15, annualRatePct: 9.5, termMonths: 180 },
	closingFrac: 0.03,
	taxAnnualPct: 1.0,
	insuranceMonthly: 100,
};

const zeroStress: Stress = { rateDeltaPct: 0, siteWorkOverrunFrac: 0, incomeDropMonthly: 0 };

// finances from Quest 1 Task 1.3(a)
const finances: FinanceProfile = {
	incomeMonthly: 6000,
	expensesMonthly: 3000,
	debtMonthly: 0,
	cashOnHand: 90_000,
	savingsMonthly: 1000,
	comfortFrac: 0.30,
	backEndFrac: 0.43,
};

describe('clipQuadrant', () => {
	it('(a) single constraint x + y ≤ 100 → triangle [[0,0],[100,0],[0,100]]', () => {
		const poly = clipQuadrant([{ a: 1, b: 1, c: 100 }]);
		expect(poly).toHaveLength(3);
		// Should contain [0,0], [100,0], [0,100] — check each is present within tolerance
		const hasApprox = (px: number, py: number) =>
			poly.some(([x, y]) => Math.abs(x - px) < 1e-6 && Math.abs(y - py) < 1e-6);
		expect(hasApprox(0, 0)).toBe(true);
		expect(hasApprox(100, 0)).toBe(true);
		expect(hasApprox(0, 100)).toBe(true);
	});

	it('(b) two constraints x+y≤100 and x+3y≤150 → polygon with intersection [75,25]', () => {
		// Intersection: x+y=100 and x+3y=150 → 2y=50 → y=25, x=75
		const poly = clipQuadrant([
			{ a: 1, b: 1, c: 100 },
			{ a: 1, b: 3, c: 150 },
		]);
		expect(poly.length).toBeGreaterThanOrEqual(3);
		const hasApprox = (px: number, py: number) =>
			poly.some(([x, y]) => Math.abs(x - px) < 1e-6 && Math.abs(y - py) < 1e-6);
		expect(hasApprox(75, 25)).toBe(true);
	});

	it('returns [] when constraint c < 0', () => {
		const poly = clipQuadrant([{ a: 1, b: 1, c: -1 }]);
		expect(poly).toEqual([]);
	});
});

describe('region', () => {
	it('(c) capacity ≤ insurance → empty polygon', () => {
		const brokeFin: FinanceProfile = { ...finances, expensesMonthly: 7000 };
		const poly = region(brokeFin, defaultPresets, zeroStress, 0);
		expect(poly).toEqual([]);
	});

	it('(d) default finances: region non-empty, all vertices satisfy both constraints', () => {
		const poly = region(finances, defaultPresets, zeroStress, 0);
		expect(poly.length).toBeGreaterThan(0);

		// Build the constraint coefficients to verify
		const s = 0.25; // siteWorkFrac default
		const ov = 1 + zeroStress.siteWorkOverrunFrac;
		const { land, home, closingFrac, taxAnnualPct, insuranceMonthly } = defaultPresets;
		const kL = land.annualRatePct / 100 / 12; // paymentFactor via manual formula for test
		const landFactor = kL === 0 ? 1 / land.termMonths : kL / (1 - Math.pow(1 + kL, -land.termMonths));
		const kH = home.annualRatePct / 100 / 12;
		const homeFactor = kH === 0 ? 1 / home.termMonths : kH / (1 - Math.pow(1 + kH, -home.termMonths));
		const taxM = taxAnnualPct / 100 / 12;

		// Cash constraint: a1*x + b1*y <= c1
		const cashAvailable = finances.cashOnHand + finances.savingsMonthly * 0;
		const a1 = land.downFrac + closingFrac;
		const b1 = s * ov + (1 - s) * home.downFrac;
		const c1 = cashAvailable;

		// Monthly constraint: a2*x + b2*y <= c2
		const cap = Math.min(
			finances.comfortFrac * finances.incomeMonthly,
			finances.backEndFrac * finances.incomeMonthly - finances.debtMonthly,
			finances.incomeMonthly - finances.expensesMonthly - finances.debtMonthly
		);
		const a2 = (1 - land.downFrac) * landFactor + taxM;
		const b2 = (1 - s) * ((1 - home.downFrac) * homeFactor + taxM);
		const c2 = cap - insuranceMonthly;

		for (const [x, y] of poly) {
			expect(a1 * x + b1 * y).toBeLessThanOrEqual(c1 + 1e-6);
			expect(a2 * x + b2 * y).toBeLessThanOrEqual(c2 + 1e-6);
			expect(x).toBeGreaterThanOrEqual(-1e-9);
			expect(y).toBeGreaterThanOrEqual(-1e-9);
		}
	});

	it('(d) region at t=12 strictly contains the t=0 x-intercept (cash-limited finances)', () => {
		// Use cash-limited finances so the cash constraint is the binding one at the x-axis.
		// With cashOnHand=40_000: cash x-intercept = 40000/0.28 ≈ 142857 < monthly x-intercept.
		// With savingsMonthly=5000 at t=12: cash = 40000+60000=100000, x-int = 357143 > monthly.
		// So the x-intercept grows from ~142857 (t=0, cash-bound) to ~212840 (t=12, monthly-bound).
		const cashLimitedFinances: FinanceProfile = {
			...finances,
			cashOnHand: 40_000,
			savingsMonthly: 5_000,
		};
		const poly0 = region(cashLimitedFinances, defaultPresets, zeroStress, 0);
		const poly12 = region(cashLimitedFinances, defaultPresets, zeroStress, 12);

		expect(poly0.length).toBeGreaterThan(0);
		expect(poly12.length).toBeGreaterThan(0);

		// t=0 x-intercept: largest x with y≈0 in poly0
		const xInts0 = poly0.filter(([, y]) => Math.abs(y) < 1e-6).map(([x]) => x);
		const xInt0 = Math.max(...xInts0);

		// t=12 x-intercept must be strictly larger (cash constraint relaxes)
		const xInts12 = poly12.filter(([, y]) => Math.abs(y) < 1e-6).map(([x]) => x);
		const xInt12 = Math.max(...xInts12);
		expect(xInt12).toBeGreaterThan(xInt0);
	});

	it('regionConstraints matches the constraints the polygon lies on', () => {
		const { cash, monthly } = regionConstraints(finances, defaultPresets, zeroStress, 0);
		expect(cash.a).toBeGreaterThan(0);
		expect(cash.b).toBeGreaterThan(0);
		expect(monthly.a).toBeGreaterThan(0);
		expect(monthly.b).toBeGreaterThan(0);

		const poly = region(finances, defaultPresets, zeroStress, 0);
		// Every vertex satisfies both half-planes.
		for (const [x, y] of poly) {
			expect(cash.a * x + cash.b * y).toBeLessThanOrEqual(cash.c + 1e-6);
			expect(monthly.a * x + monthly.b * y).toBeLessThanOrEqual(monthly.c + 1e-6);
		}
		// At least one non-axis edge lies on one of the two exposed constraints,
		// proving these are the half-planes that actually bound the polygon.
		const onLine = (con: { a: number; b: number; c: number }) =>
			poly.some((_, i) => {
				const [x1, y1] = poly[i];
				const [x2, y2] = poly[(i + 1) % poly.length];
				const mx = (x1 + x2) / 2;
				const my = (y1 + y2) / 2;
				return Math.abs(con.a * mx + con.b * my - con.c) < con.c * 1e-6;
			});
		expect(onLine(cash) || onLine(monthly)).toBe(true);
	});

	it('polygon order is CCW, starting near [0,0]', () => {
		const poly = region(finances, defaultPresets, zeroStress, 0);
		expect(poly.length).toBeGreaterThan(0);

		// First vertex should be at or near [0,0]
		const [x0, y0] = poly[0];
		expect(x0).toBeCloseTo(0, 0);
		expect(y0).toBeCloseTo(0, 0);

		// CCW: signed area > 0
		let area = 0;
		for (let i = 0; i < poly.length; i++) {
			const [x1, y1] = poly[i];
			const [x2, y2] = poly[(i + 1) % poly.length];
			area += x1 * y2 - x2 * y1;
		}
		expect(area).toBeGreaterThan(0);
	});

	it('(e) high income + high debt now yields a non-empty region', () => {
		const f: FinanceProfile = {
			incomeMonthly: 12_916, expensesMonthly: 1_378, debtMonthly: 4_266,
			cashOnHand: 90_000, savingsMonthly: 1_200, comfortFrac: 0.30, backEndFrac: 0.43,
		};
		// capacity ≈ 1287.88 > insurance 100 → the monthly constraint admits area
		const poly = region(f, defaultPresets, zeroStress, 0);
		expect(poly.length).toBeGreaterThan(0);
	});
});
