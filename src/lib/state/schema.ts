// src/lib/state/schema.ts
// Pure TypeScript — no svelte, @sveltejs/*, or $app/* imports allowed.
import type { FinanceProfile, HomeOption, Parcel, Presets, Stress } from '$lib/model/types';

export interface AppState {
	v: 1;
	finances: FinanceProfile;
	presets: Presets;
	parcels: Parcel[];
	homes: HomeOption[];
	muted: string[];          // combo keys `${parcelId}:${homeId}`
	selected: string | null;  // combo key
	stress: Stress;
	timeMonths: number;       // 0–24
}

export function defaultState(): AppState {
	return {
		v: 1,
		finances: {
			incomeMonthly: 6000,
			expensesMonthly: 3000,
			debtMonthly: 0,
			cashOnHand: 40_000,
			savingsMonthly: 1000,
			comfortFrac: 0.30
		},
		presets: {
			land: { downFrac: 0.25, annualRatePct: 8.0, termMonths: 180 },
			home: { downFrac: 0.15, annualRatePct: 9.5, termMonths: 180 },
			closingFrac: 0.03,
			taxAnnualPct: 1.0,
			insuranceMonthly: 100
		},
		parcels: [],
		homes: [],
		muted: [],
		selected: null,
		stress: { rateDeltaPct: 0, siteWorkOverrunFrac: 0, incomeDropMonthly: 0 },
		timeMonths: 0
	};
}

export function comboKey(parcelId: string, homeId: string): string {
	return `${parcelId}:${homeId}`;
}

// Exact set of top-level keys allowed in AppState.
const TOP_LEVEL_KEYS: ReadonlySet<string> = new Set([
	'v', 'finances', 'presets', 'parcels', 'homes', 'muted', 'selected', 'stress', 'timeMonths'
]);

function isFiniteNonNeg(n: unknown): n is number {
	return typeof n === 'number' && Number.isFinite(n) && n >= 0;
}

// Finite number within [min, max] inclusive. Used to keep a crafted URL hash
// from injecting out-of-range values into the money math (see model docs).
function inRange(n: unknown, min: number, max: number): n is number {
	return typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max;
}

function isFinancesValid(f: unknown): f is FinanceProfile {
	if (typeof f !== 'object' || f === null) return false;
	const o = f as Record<string, unknown>;
	return (
		isFiniteNonNeg(o.incomeMonthly) &&
		isFiniteNonNeg(o.expensesMonthly) &&
		isFiniteNonNeg(o.debtMonthly) &&
		isFiniteNonNeg(o.cashOnHand) &&
		isFiniteNonNeg(o.savingsMonthly) &&
		// Strictly > 0: comfortFrac is a divisor in evaluate().
		typeof o.comfortFrac === 'number' &&
		Number.isFinite(o.comfortFrac) &&
		o.comfortFrac > 0 &&
		o.comfortFrac <= 1
	);
}

function isLoanTermsValid(lt: unknown): boolean {
	if (typeof lt !== 'object' || lt === null) return false;
	const o = lt as Record<string, unknown>;
	return (
		inRange(o.downFrac, 0, 1) &&
		isFiniteNonNeg(o.annualRatePct) &&
		isFiniteNonNeg(o.termMonths)
	);
}

function isPresetsValid(p: unknown): p is Presets {
	if (typeof p !== 'object' || p === null) return false;
	const o = p as Record<string, unknown>;
	return (
		isLoanTermsValid(o.land) &&
		isLoanTermsValid(o.home) &&
		inRange(o.closingFrac, 0, 1) &&
		inRange(o.taxAnnualPct, 0, 100) &&
		isFiniteNonNeg(o.insuranceMonthly)
	);
}

function isParcelValid(p: unknown): p is Parcel {
	if (typeof p !== 'object' || p === null) return false;
	const o = p as Record<string, unknown>;
	if (typeof o.id !== 'string' || typeof o.name !== 'string') return false;
	if (!isFiniteNonNeg(o.landPrice)) return false;
	// Optional overrides
	if (o.taxAnnualPct !== undefined && !isFiniteNonNeg(o.taxAnnualPct)) return false;
	if (o.closingFrac !== undefined && !isFiniteNonNeg(o.closingFrac)) return false;
	return true;
}

function isHomeOptionValid(h: unknown): h is HomeOption {
	if (typeof h !== 'object' || h === null) return false;
	const o = h as Record<string, unknown>;
	return (
		typeof o.id === 'string' &&
		typeof o.name === 'string' &&
		isFiniteNonNeg(o.homeCost) &&
		isFiniteNonNeg(o.siteWork)
	);
}

function isStressValid(s: unknown): s is Stress {
	if (typeof s !== 'object' || s === null) return false;
	const o = s as Record<string, unknown>;
	return (
		inRange(o.rateDeltaPct, 0, 10) &&
		inRange(o.siteWorkOverrunFrac, 0, 1) &&
		isFiniteNonNeg(o.incomeDropMonthly)
	);
}

export function validateState(x: unknown): x is AppState {
	if (typeof x !== 'object' || x === null) return false;
	const o = x as Record<string, unknown>;

	// Reject unknown extra top-level keys
	for (const key of Object.keys(o)) {
		if (!TOP_LEVEL_KEYS.has(key)) return false;
	}

	if (o.v !== 1) return false;
	if (!isFinancesValid(o.finances)) return false;
	if (!isPresetsValid(o.presets)) return false;

	if (!Array.isArray(o.parcels) || !o.parcels.every(isParcelValid)) return false;
	if (!Array.isArray(o.homes) || !o.homes.every(isHomeOptionValid)) return false;
	if (!Array.isArray(o.muted) || !o.muted.every((m) => typeof m === 'string')) return false;

	if (o.selected !== null && typeof o.selected !== 'string') return false;
	if (!isStressValid(o.stress)) return false;
	if (!inRange(o.timeMonths, 0, 24)) return false;

	return true;
}
