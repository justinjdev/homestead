import { describe, expect, it } from 'vitest';
import { decodeState, encodeState } from './codec';
import { defaultState } from './schema';

describe('encodeState', () => {
	it('produces a base64url string with no padding', () => {
		const encoded = encodeState(defaultState());
		expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
		expect(encoded).not.toContain('=');
		expect(encoded).not.toContain('+');
		expect(encoded).not.toContain('/');
	});

	it('Node/Buffer path equals Buffer.from(json).toString("base64url") exactly', () => {
		const state = defaultState();
		const json = JSON.stringify(state);
		const expected = Buffer.from(json, 'utf8').toString('base64url');
		expect(encodeState(state)).toBe(expected);
	});
});

describe('decodeState', () => {
	it('round-trips defaultState()', () => {
		const original = defaultState();
		const encoded = encodeState(original);
		const decoded = decodeState(encoded);
		expect(decoded).toEqual(original);
	});

	it('round-trips a state with a unicode parcel name', () => {
		const state = defaultState();
		state.parcels = [
			{
				id: 'p-unicode',
				name: "5 acres — 'Bächli' 🏕",
				landPrice: 75_000
			}
		];
		const decoded = decodeState(encodeState(state));
		expect(decoded).not.toBeNull();
		expect(decoded!.parcels[0].name).toBe("5 acres — 'Bächli' 🏕");
	});

	it('returns null for garbage input', () => {
		expect(decodeState('!!!')).toBeNull();
	});

	it('returns null when decoded state has v:2', () => {
		const bad = { ...defaultState(), v: 2 };
		const json = JSON.stringify(bad);
		const encoded = Buffer.from(json, 'utf8').toString('base64url');
		expect(decodeState(encoded)).toBeNull();
	});

	it('returns null for empty string', () => {
		expect(decodeState('')).toBeNull();
	});
});
