import { describe, expect, it } from 'vitest';
import { capacity, capacityBreakdown, evaluate } from './evaluate';
import { comboCosts } from './costs';
import type { FinanceProfile, HomeOption, Parcel, Presets, Stress } from './types';

const defaultPresets: Presets = {
	land: { downFrac: 0.25, annualRatePct: 8.0, termMonths: 180 },
	home: { downFrac: 0.15, annualRatePct: 9.5, termMonths: 180 },
	closingFrac: 0.03,
	taxAnnualPct: 1.0,
	insuranceMonthly: 100,
};

const zeroStress: Stress = { rateDeltaPct: 0, siteWorkOverrunFrac: 0, incomeDropMonthly: 0 };

const parcel: Parcel = { id: 'p1', name: 'Test Parcel', landPrice: 80_000 };
const home: HomeOption = { id: 'h1', name: 'Test Home', homeCost: 100_000, siteWork: 40_000 };

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

describe('capacity', () => {
	it('returns min(front-end, back-end, solvency)', () => {
		// min(0.30*6000, 0.43*6000 - 0, 6000 - 3000 - 0) = min(1800, 2580, 3000) = 1800
		expect(capacity(finances, zeroStress)).toBe(1800);
	});

	it('applies income drop stress', () => {
		const stress: Stress = { ...zeroStress, incomeDropMonthly: 500 };
		// I = 5500 → min(1650, 2365, 2500) = 1650
		expect(capacity(finances, stress)).toBe(1650);
	});

	it('returns negative when expenses exceed income (solvency binds)', () => {
		const broke: FinanceProfile = { ...finances, expensesMonthly: 7000 };
		// min(1800, 2580, 6000 - 7000 - 0) = min(1800, 2580, -1000) = -1000
		expect(capacity(broke, zeroStress)).toBe(-1000);
	});
});

describe('capacityBreakdown', () => {
	const reported: FinanceProfile = {
		incomeMonthly: 12_916, expensesMonthly: 1_378, debtMonthly: 4_266,
		cashOnHand: 90_000, savingsMonthly: 1_200, comfortFrac: 0.30, backEndFrac: 0.43,
	};

	it('reported profile: back-end binds at +$1,287.88 (was −$391)', () => {
		const b = capacityBreakdown(reported, zeroStress);
		expect(b.frontEnd).toBeCloseTo(3874.8, 2);   // 0.30 * 12916
		expect(b.backEnd).toBeCloseTo(1287.88, 2);   // 0.43 * 12916 - 4266
		expect(b.solvency).toBeCloseTo(7272, 2);     // 12916 - 1378 - 4266
		expect(b.capacity).toBeCloseTo(1287.88, 2);
		expect(b.binding).toBe('back-end');
	});

	it('capacity() returns the same min', () => {
		expect(capacity(reported, zeroStress)).toBeCloseTo(1287.88, 2);
	});

	it('front-end binds with low debt and low expenses', () => {
		const f: FinanceProfile = { ...finances, expensesMonthly: 1_000 };
		// front 1800, back 2580, solvency 5000
		const b = capacityBreakdown(f, zeroStress);
		expect(b.binding).toBe('front-end');
		expect(b.capacity).toBe(1800);
	});

	it('solvency binds when expenses are high', () => {
		const f: FinanceProfile = { ...finances, expensesMonthly: 5_200 };
		// front 1800, back 2580, solvency 800
		const b = capacityBreakdown(f, zeroStress);
		expect(b.binding).toBe('solvency');
		expect(b.capacity).toBe(800);
	});
});

describe('evaluate', () => {
	it('(a) baseline: cashOk, monthlyOk, verdict in', () => {
		const ev = evaluate(finances, parcel, home, defaultPresets, zeroStress, 0);

		// cashAvailable = 90_000 + 1000 * 0 = 90_000
		expect(ev.cashAvailable).toBe(90_000);
		// cashNeeded = 77_400
		expect(ev.cashNeeded).toBe(77_400);
		expect(ev.cashOk).toBe(true);

		// capacity = 1800, monthlyCost ≈ 1710.97
		expect(ev.monthlyCapacity).toBe(1800);
		expect(ev.monthlyCost).toBeCloseTo(1_710.97, 1);
		expect(ev.monthlyOk).toBe(true);

		expect(ev.verdict).toBe('in');
		expect(ev.readyInMonths).toBe(0);
		expect(ev.notReachableReason).toBe(null);

		// incomeDrop margin: max d where capacity(I-d) >= monthlyCost
		// d = min((comfortFrac*I - debt - monthlyCost)/comfortFrac, (I - expenses - debt - monthlyCost)/1)
		// d = min((1800 - 1710.97)/0.30, (6000 - 3000 - 0 - 1710.97)/1)
		// d = min(296.77, 1289.03) ≈ 296.77
		expect(ev.margins.incomeDropMonthly).toBeCloseTo(296.77, 0);
	});

	it('(b) cash short: cashOk false, readyInMonths = 28', () => {
		const f: FinanceProfile = { ...finances, cashOnHand: 50_000 };
		const ev = evaluate(f, parcel, home, defaultPresets, zeroStress, 0);

		expect(ev.cashOk).toBe(false);
		expect(ev.monthlyOk).toBe(true);
		expect(ev.verdict).toBe('out');
		// ceil((77_400 - 50_000) / 1000) = ceil(27.4) = 28
		expect(ev.readyInMonths).toBe(28);
		expect(ev.notReachableReason).toBe(null);
	});

	it('(c) cash short + no savings → reason no-savings', () => {
		const f: FinanceProfile = { ...finances, cashOnHand: 50_000, savingsMonthly: 0 };
		const ev = evaluate(f, parcel, home, defaultPresets, zeroStress, 0);

		expect(ev.cashOk).toBe(false);
		expect(ev.readyInMonths).toBe(null);
		expect(ev.notReachableReason).toBe('no-savings');
	});

	it('(d) expenses > income: capacity < 0, verdict out, reason monthly', () => {
		const f: FinanceProfile = { ...finances, expensesMonthly: 7000 };
		const ev = evaluate(f, parcel, home, defaultPresets, zeroStress, 0);

		expect(ev.monthlyOk).toBe(false);
		expect(ev.verdict).toBe('out');
		expect(ev.readyInMonths).toBe(null);
		expect(ev.notReachableReason).toBe('monthly');
	});

	it('(e) rate margin: monthlyCost at margin rise ≈ capacity', () => {
		const ev = evaluate(finances, parcel, home, defaultPresets, zeroStress, 0);
		const riseMargin = ev.margins.rateRisePct;

		expect(riseMargin).not.toBeNull();
		expect(riseMargin).toBeGreaterThan(0);

		// At rateDeltaPct = riseMargin, monthlyCost should be ≈ capacity
		if (riseMargin !== null) {
			const stressedCosts = comboCosts(parcel, home, defaultPresets, { ...zeroStress, rateDeltaPct: riseMargin });
			expect(stressedCosts.monthlyCost).toBeCloseTo(ev.monthlyCapacity, 0);
		}
	});

	it('rate margin is null when both loans are cash purchases', () => {
		const cashPresets: Presets = {
			...defaultPresets,
			land: { downFrac: 1, annualRatePct: 0, termMonths: 180 },
			home: { downFrac: 1, annualRatePct: 0, termMonths: 180 },
		};
		const ev = evaluate(finances, parcel, home, cashPresets, zeroStress, 0);
		expect(ev.margins.rateRisePct).toBeNull();
	});

	it('siteWorkOverrunFrac margin is null when no site work', () => {
		const noSiteWork: HomeOption = { ...home, siteWork: 0 };
		const ev = evaluate(finances, parcel, noSiteWork, defaultPresets, zeroStress, 0);
		expect(ev.margins.siteWorkOverrunFrac).toBeNull();
	});

	it('siteWorkOverrunFrac margin is cashSlack / siteWork', () => {
		const ev = evaluate(finances, parcel, home, defaultPresets, zeroStress, 0);
		// cashSlack = 90_000 - 77_400 = 12_600; siteWork = 40_000
		expect(ev.margins.siteWorkOverrunFrac).toBeCloseTo(12_600 / 40_000, 4);
	});

	it('cashAvailable grows with tMonths', () => {
		const ev = evaluate(finances, parcel, home, defaultPresets, zeroStress, 12);
		expect(ev.cashAvailable).toBe(90_000 + 1000 * 12);
	});

	it('readyInMonths is 0 when already affordable at t=0', () => {
		const ev = evaluate(finances, parcel, home, defaultPresets, zeroStress, 0);
		expect(ev.readyInMonths).toBe(0);
	});

	it('pctOfIncome = (monthlyCost + debtMonthly) / stressed income', () => {
		const ev = evaluate(finances, parcel, home, defaultPresets, zeroStress, 0);
		// stressed income = 6000 - 0 = 6000; debtMonthly = 0
		expect(ev.pctOfIncome).toBeCloseTo(ev.monthlyCost / 6000, 6);
	});

	it('(f) income-drop margin respects the back-end DTI branch', () => {
		// Debt profile where the back-end branch is the binding one on the margin,
		// AND the combo is affordable at t=0 so a positive margin exists.
		// (monthlyCost ≈ 1710.98; capacity(9000) = min(2700, 2370, 4500) = 2370 > cost.)
		const f: FinanceProfile = {
			incomeMonthly: 9_000, expensesMonthly: 3_000, debtMonthly: 1_500,
			cashOnHand: 200_000, savingsMonthly: 1_200, comfortFrac: 0.30, backEndFrac: 0.43,
		};
		const ev = evaluate(f, parcel, home, defaultPresets, zeroStress, 0);
		expect(ev.monthlyOk).toBe(true);
		expect(ev.margins.incomeDropMonthly).toBeGreaterThan(0);
		// At the margin d, capacity(I - d) meets monthlyCost exactly (the binding point),
		// and the back-end branch is the one that binds (d ≈ 1532.6).
		const stressedCap = capacity(f, { ...zeroStress, incomeDropMonthly: ev.margins.incomeDropMonthly });
		expect(stressedCap).toBeCloseTo(ev.monthlyCost, 2);
	});
});
