import { describe, expect, it } from 'vitest';
import { comboKey, defaultState, isHttpUrl, validateState } from './schema';

describe('validateState', () => {
	it('accepts defaultState()', () => {
		expect(validateState(defaultState())).toBe(true);
	});

	it('rejects v:2', () => {
		expect(validateState({ ...defaultState(), v: 2 })).toBe(false);
	});

	it('rejects NaN incomeMonthly', () => {
		const s = defaultState();
		s.finances.incomeMonthly = NaN;
		expect(validateState(s)).toBe(false);
	});

	it('rejects parcel missing landPrice', () => {
		const s = defaultState();
		s.parcels = [{ id: 'p1', name: 'Test', /* missing landPrice */ } as never];
		expect(validateState(s)).toBe(false);
	});

	it('rejects extra top-level key', () => {
		expect(validateState({ ...defaultState(), extraKey: 'oops' })).toBe(false);
	});

	it('rejects null and primitives', () => {
		expect(validateState(null)).toBe(false);
		expect(validateState(42)).toBe(false);
		expect(validateState('string')).toBe(false);
	});

	it('rejects comfortFrac > 1', () => {
		const s = defaultState();
		s.finances.comfortFrac = 1.5;
		expect(validateState(s)).toBe(false);
	});

	it('rejects comfortFrac < 0', () => {
		const s = defaultState();
		s.finances.comfortFrac = -0.1;
		expect(validateState(s)).toBe(false);
	});

	it('rejects negative numeric fields', () => {
		const s = defaultState();
		s.finances.incomeMonthly = -100;
		expect(validateState(s)).toBe(false);
	});

	it('rejects home missing homeCost', () => {
		const s = defaultState();
		s.homes = [{ id: 'h1', name: 'Test', siteWork: 0 } as never];
		expect(validateState(s)).toBe(false);
	});

	// Upper/edge bounds — a crafted hash must not inject out-of-range values
	// into the money math (e.g. comfortFrac 0 → ÷0 in evaluate).
	it('rejects comfortFrac === 0 (would divide by zero downstream)', () => {
		const s = defaultState();
		s.finances.comfortFrac = 0;
		expect(validateState(s)).toBe(false);
	});

	it('accepts comfortFrac === 1', () => {
		const s = defaultState();
		s.finances.comfortFrac = 1;
		expect(validateState(s)).toBe(true);
	});

	it('rejects backEndFrac > 1', () => {
		const s = defaultState();
		s.finances.backEndFrac = 1.5;
		expect(validateState(s)).toBe(false);
	});

	it('rejects backEndFrac === 0 (would divide by zero downstream)', () => {
		const s = defaultState();
		s.finances.backEndFrac = 0;
		expect(validateState(s)).toBe(false);
	});

	it('rejects finances missing backEndFrac', () => {
		const s = defaultState();
		delete (s.finances as Partial<typeof s.finances>).backEndFrac;
		expect(validateState(s)).toBe(false);
	});

	it('accepts backEndFrac === 1', () => {
		const s = defaultState();
		s.finances.backEndFrac = 1;
		expect(validateState(s)).toBe(true);
	});

	it('rejects negative rentalMonthly', () => {
		const s = defaultState();
		s.finances.rentalMonthly = -1;
		expect(validateState(s)).toBe(false);
	});

	it('rejects finances missing rentalMonthly', () => {
		const s = defaultState();
		delete (s.finances as Partial<typeof s.finances>).rentalMonthly;
		expect(validateState(s)).toBe(false);
	});

	it('accepts rentalMonthly === 0 and positive', () => {
		const s = defaultState();
		s.finances.rentalMonthly = 0;
		expect(validateState(s)).toBe(true);
		s.finances.rentalMonthly = 2000;
		expect(validateState(s)).toBe(true);
	});

	it('rejects downFrac > 1', () => {
		const s = defaultState();
		s.presets.land.downFrac = 1.5;
		expect(validateState(s)).toBe(false);
	});

	it('accepts downFrac === 1 (cash purchase)', () => {
		const s = defaultState();
		s.presets.land.downFrac = 1;
		s.presets.home.downFrac = 1;
		expect(validateState(s)).toBe(true);
	});

	it('rejects timeMonths > 24', () => {
		const s = defaultState();
		s.timeMonths = 25;
		expect(validateState(s)).toBe(false);
	});

	it('accepts timeMonths === 24', () => {
		const s = defaultState();
		s.timeMonths = 24;
		expect(validateState(s)).toBe(true);
	});

	it('rejects stress.rateDeltaPct > 10', () => {
		const s = defaultState();
		s.stress.rateDeltaPct = 11;
		expect(validateState(s)).toBe(false);
	});

	it('rejects stress.siteWorkOverrunFrac > 1', () => {
		const s = defaultState();
		s.stress.siteWorkOverrunFrac = 1.5;
		expect(validateState(s)).toBe(false);
	});

	it('rejects closingFrac > 1', () => {
		const s = defaultState();
		s.presets.closingFrac = 1.5;
		expect(validateState(s)).toBe(false);
	});

	it('rejects taxAnnualPct > 100', () => {
		const s = defaultState();
		s.presets.taxAnnualPct = 150;
		expect(validateState(s)).toBe(false);
	});

	it('accepts the stressed fixture bounds (rateDeltaPct 2, siteWorkOverrunFrac 0.5)', () => {
		const s = defaultState();
		s.stress.rateDeltaPct = 2;
		s.stress.siteWorkOverrunFrac = 0.5;
		s.timeMonths = 12;
		expect(validateState(s)).toBe(true);
	});
});

describe('comboKey', () => {
	it('joins parcel and home ids with colon', () => {
		expect(comboKey('parcel-1', 'home-2')).toBe('parcel-1:home-2');
	});
});

describe('defaultState', () => {
	it('has the expected finances defaults', () => {
		const s = defaultState();
		expect(s.finances.incomeMonthly).toBe(6000);
		expect(s.finances.expensesMonthly).toBe(3000);
		expect(s.finances.debtMonthly).toBe(0);
		expect(s.finances.cashOnHand).toBe(40_000);
		expect(s.finances.savingsMonthly).toBe(1000);
		expect(s.finances.comfortFrac).toBe(0.30);
	});

	it('has v:1', () => {
		expect(defaultState().v).toBe(1);
	});

	it('has empty parcels/homes/muted', () => {
		const s = defaultState();
		expect(s.parcels).toEqual([]);
		expect(s.homes).toEqual([]);
		expect(s.muted).toEqual([]);
	});

	it('has zero stress', () => {
		const s = defaultState();
		expect(s.stress.rateDeltaPct).toBe(0);
		expect(s.stress.siteWorkOverrunFrac).toBe(0);
		expect(s.stress.incomeDropMonthly).toBe(0);
	});

	it('has timeMonths 0', () => {
		expect(defaultState().timeMonths).toBe(0);
	});
});

describe('isHttpUrl', () => {
	it('accepts http and https', () => {
		expect(isHttpUrl('http://example.com')).toBe(true);
		expect(isHttpUrl('https://landwatch.com/listing/123')).toBe(true);
	});
	it('rejects other schemes, malformed input, and non-strings', () => {
		expect(isHttpUrl('javascript:alert(1)')).toBe(false);
		expect(isHttpUrl('data:text/html,x')).toBe(false);
		expect(isHttpUrl('ftp://example.com')).toBe(false);
		expect(isHttpUrl('not a url')).toBe(false);
		expect(isHttpUrl('')).toBe(false);
		expect(isHttpUrl(42)).toBe(false);
		expect(isHttpUrl(undefined)).toBe(false);
	});
});

describe('url validation in state', () => {
	it('accepts a parcel with a valid https url', () => {
		const s = defaultState();
		s.parcels = [{ id: 'p1', name: 'Ridge', landPrice: 80_000, url: 'https://landwatch.com/x' }];
		expect(validateState(s)).toBe(true);
	});
	it('rejects a parcel with a javascript: url', () => {
		const s = defaultState();
		s.parcels = [{ id: 'p1', name: 'Ridge', landPrice: 80_000, url: 'javascript:alert(1)' }];
		expect(validateState(s)).toBe(false);
	});
	it('accepts a home with a valid url, rejects a data: url', () => {
		const s = defaultState();
		s.homes = [{ id: 'h1', name: 'Escape', homeCost: 100_000, siteWork: 40_000, url: 'https://x.com' }];
		expect(validateState(s)).toBe(true);
		s.homes = [{ id: 'h1', name: 'Escape', homeCost: 100_000, siteWork: 40_000, url: 'data:x' }];
		expect(validateState(s)).toBe(false);
	});
});
