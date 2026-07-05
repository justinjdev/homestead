import { describe, expect, it } from 'vitest';
import { domains, makeScale, niceCeil, ticks } from './scale';
import type { HomeOption, Parcel, Polygon } from '$lib/model/types';

describe('niceCeil', () => {
	it('returns 1000 for 0', () => {
		expect(niceCeil(0)).toBe(1000);
	});
	it('rounds up to 1/2/5 × 10^k (golden values)', () => {
		expect(niceCeil(73_000)).toBe(100_000);
		expect(niceCeil(180_000)).toBe(200_000);
		expect(niceCeil(420_000)).toBe(500_000);
	});
	it('is exact when already nice', () => {
		expect(niceCeil(50_000)).toBe(50_000);
		expect(niceCeil(200_000)).toBe(200_000);
	});
});

describe('makeScale', () => {
	it('maps 0 to 0 and domainMax to rangePx', () => {
		const s = makeScale(100_000, 800);
		expect(s(0)).toBe(0);
		expect(s(100_000)).toBe(800);
		expect(s(50_000)).toBe(400);
	});
});

describe('domains', () => {
	const parcels: Parcel[] = [{ id: 'p1', name: 'A', landPrice: 80_000 }];
	const homes: HomeOption[] = [{ id: 'h1', name: 'H', homeCost: 100_000, siteWork: 40_000 }];

	it('uses 1.25× the max vertex/entity, floored at 50k, then niceCeil', () => {
		// x: max parcel price 80_000 × 1.25 = 100_000 → niceCeil 100_000
		// y: max home (100_000 + 40_000 = 140_000) × 1.25 = 175_000 → niceCeil 200_000
		const { xMax, yMax } = domains([], parcels, homes);
		expect(xMax).toBe(100_000);
		expect(yMax).toBe(200_000);
	});

	it('applies the 50k floor when everything is tiny', () => {
		const { xMax, yMax } = domains([], [], []);
		expect(xMax).toBe(50_000);
		expect(yMax).toBe(50_000);
	});

	it('accounts for polygon vertices', () => {
		const poly: Polygon = [[0, 0], [300_000, 0], [0, 260_000]];
		const { xMax, yMax } = domains([poly], [], []);
		// x: 300_000 × 1.25 = 375_000 → niceCeil 500_000
		// y: 260_000 × 1.25 = 325_000 → niceCeil 500_000
		expect(xMax).toBe(500_000);
		expect(yMax).toBe(500_000);
	});
});

describe('ticks', () => {
	it('returns 5 even ticks including 0 and max', () => {
		expect(ticks(200_000)).toEqual([0, 50_000, 100_000, 150_000, 200_000]);
	});
});
