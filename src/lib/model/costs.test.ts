import { describe, expect, it } from 'vitest';
import { comboCosts } from './costs';
import { payment } from './payment';
import type { HomeOption, Parcel, Presets, Stress } from './types';

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

describe('comboCosts', () => {
	it('computes baseline costs correctly', () => {
		const c = comboCosts(parcel, home, defaultPresets, zeroStress);

		// landDown = 0.25 * 80_000 = 20_000
		expect(c.landDown).toBe(20_000);
		// closing = 0.03 * 80_000 = 2_400
		expect(c.closing).toBe(2_400);
		// homeDown = 0.15 * 100_000 = 15_000
		expect(c.homeDown).toBe(15_000);
		// siteWorkCash = 40_000 * (1 + 0) = 40_000
		expect(c.siteWorkCash).toBe(40_000);
		// cashNeeded = 20_000 + 2_400 + 15_000 + 40_000 = 77_400
		expect(c.cashNeeded).toBe(77_400);

		// landPayment = payment(60_000, 8.0, 180) ≈ 573.39
		const expectedLandPayment = payment(60_000, 8.0, 180);
		expect(c.landPayment).toBeCloseTo(expectedLandPayment, 4);
		expect(c.landPayment).toBeCloseTo(573.39, 1);

		// homePayment = payment(85_000, 9.5, 180) ≈ 887.58
		const expectedHomePayment = payment(85_000, 9.5, 180);
		expect(c.homePayment).toBeCloseTo(expectedHomePayment, 4);
		expect(c.homePayment).toBeCloseTo(887.58, 1);

		// taxMonthly = 1.0/100 * (80_000 + 100_000) / 12 = 150
		expect(c.taxMonthly).toBe(150);

		// monthlyCost = landPayment + homePayment + taxMonthly + 100 (insurance)
		expect(c.monthlyCost).toBeCloseTo(c.landPayment + c.homePayment + 150 + 100, 4);
		expect(c.monthlyCost).toBeCloseTo(1_710.97, 1);
	});

	it('applies stress: rate delta, site work overrun', () => {
		const stress: Stress = { rateDeltaPct: 2, siteWorkOverrunFrac: 0.5, incomeDropMonthly: 0 };
		const c = comboCosts(parcel, home, defaultPresets, stress);

		// siteWorkCash = 40_000 * (1 + 0.5) = 60_000
		expect(c.siteWorkCash).toBe(60_000);
		// cashNeeded = 20_000 + 2_400 + 15_000 + 60_000 = 97_400
		expect(c.cashNeeded).toBe(97_400);

		// landPayment = payment(60_000, 8.0+2, 180) = payment(60_000, 10.0, 180)
		expect(c.landPayment).toBeCloseTo(payment(60_000, 10.0, 180), 4);
		// homePayment = payment(85_000, 9.5+2, 180) = payment(85_000, 11.5, 180)
		expect(c.homePayment).toBeCloseTo(payment(85_000, 11.5, 180), 4);
	});

	it('cash purchase home: homePayment 0, homeDown = full home cost', () => {
		const cashPresets: Presets = {
			...defaultPresets,
			home: { downFrac: 1, annualRatePct: 0, termMonths: 180 },
		};
		const c = comboCosts(parcel, home, cashPresets, zeroStress);
		expect(c.homePayment).toBe(0);
		expect(c.homeDown).toBe(100_000);
		// cashNeeded = 20_000 + 2_400 + 100_000 + 40_000 = 162_400
		expect(c.cashNeeded).toBe(162_400);
	});

	it('uses per-parcel tax and closing overrides', () => {
		const p: Parcel = { id: 'p2', name: 'Override', landPrice: 80_000, taxAnnualPct: 2.0, closingFrac: 0.05 };
		const c = comboCosts(p, home, defaultPresets, zeroStress);
		// closing = 0.05 * 80_000 = 4_000
		expect(c.closing).toBe(4_000);
		// tax = 2.0/100 * (80_000 + 100_000) / 12 = 300
		expect(c.taxMonthly).toBe(300);
	});

	it('site work excluded from tax basis', () => {
		// taxMonthly must use landPrice + homeCost, not siteWork
		const c = comboCosts(parcel, home, defaultPresets, zeroStress);
		// basis = 80_000 + 100_000 (no siteWork)
		expect(c.taxMonthly).toBe(1.0 / 100 * 180_000 / 12);
	});
});
