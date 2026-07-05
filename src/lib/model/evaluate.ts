import { comboCosts } from './costs';
import type { Evaluation, FinanceProfile, HomeOption, Parcel, Presets, Stress } from './types';

export type BindingConstraint = 'front-end' | 'back-end' | 'solvency';

export interface CapacityBreakdown {
	frontEnd: number; // comfortFrac × I           (housing payment alone)
	backEnd: number;  // backEndFrac × I − debt     (housing payment + existing debt)
	solvency: number; // I − expenses − debt        (never cash-flow negative)
	capacity: number; // min(frontEnd, backEnd, solvency)
	binding: BindingConstraint; // which term equals capacity (front-end wins ties)
}

/**
 * Two-tier DTI breakdown of monthly housing capacity.
 *
 *   I = incomeMonthly − incomeDropMonthly              (stressed take-home)
 *   frontEnd = comfortFrac × I                         (front-end DTI: housing only)
 *   backEnd  = backEndFrac × I − debtMonthly           (back-end DTI: housing + debt)
 *   solvency = I − expensesMonthly − debtMonthly       (cash-flow floor)
 *   capacity = min(frontEnd, backEnd, solvency)
 */
export function capacityBreakdown(finances: FinanceProfile, stress: Stress): CapacityBreakdown {
	const I = finances.incomeMonthly - stress.incomeDropMonthly;
	const frontEnd = finances.comfortFrac * I;
	const backEnd = finances.backEndFrac * I - finances.debtMonthly;
	const solvency = I - finances.expensesMonthly - finances.debtMonthly;
	const capacity = Math.min(frontEnd, backEnd, solvency);
	const binding: BindingConstraint =
		capacity === frontEnd ? 'front-end' : capacity === backEnd ? 'back-end' : 'solvency';
	return { frontEnd, backEnd, solvency, capacity, binding };
}

/**
 * Monthly capacity: how much can be spent on housing loans, tax, and insurance.
 * See capacityBreakdown for the formula. May be ≤ 0 when debt or expenses are too high.
 */
export function capacity(finances: FinanceProfile, stress: Stress): number {
	return capacityBreakdown(finances, stress).capacity;
}

/** Fraction of projected rental income counted toward affordability (lender 25% vacancy factor). */
export const RENT_COUNTED_FRAC = 0.75;

/** Counted monthly rental income: RENT_COUNTED_FRAC × gross rentalMonthly. */
export function countedRentMonthly(finances: FinanceProfile): number {
	return RENT_COUNTED_FRAC * finances.rentalMonthly;
}

/**
 * Full evaluation for a parcel + home combination at a given time horizon.
 *
 * Rate margin uses bisection (not closed-form) because the payment factor is
 * nonlinear in rate — noted in the implementation plan (Quest 1 Task 1.3).
 */
export function evaluate(
	finances: FinanceProfile,
	parcel: Parcel,
	home: HomeOption,
	presets: Presets,
	stress: Stress,
	tMonths: number
): Evaluation {
	const costs = comboCosts(parcel, home, presets, stress);
	const cap = capacity(finances, stress);

	const cashAvailable = finances.cashOnHand + finances.savingsMonthly * tMonths;
	const cashOk = costs.cashNeeded <= cashAvailable;
	const monthlyOk = costs.monthlyCost <= cap;
	const verdict: 'in' | 'out' = cashOk && monthlyOk ? 'in' : 'out';

	// pctOfIncome: (monthlyCost + debtMonthly) / stressed income
	const stressedIncome = finances.incomeMonthly - stress.incomeDropMonthly;
	const pctOfIncome = stressedIncome > 0
		? (costs.monthlyCost + finances.debtMonthly) / stressedIncome
		: Infinity;

	// readyInMonths
	let readyInMonths: number | null = null;
	let notReachableReason: 'monthly' | 'no-savings' | null = null;

	if (!monthlyOk) {
		notReachableReason = 'monthly';
	} else if (!cashOk) {
		if (finances.savingsMonthly <= 0) {
			notReachableReason = 'no-savings';
		} else {
			readyInMonths = Math.ceil((costs.cashNeeded - finances.cashOnHand) / finances.savingsMonthly);
		}
	} else {
		readyInMonths = 0;
	}

	// Margins (beyond current stress)

	// siteWorkOverrunFrac: how much more site-work overrun can be absorbed with remaining cash
	const cashSlack = cashAvailable - costs.cashNeeded;
	const siteWorkOverrunFrac = home.siteWork > 0 ? cashSlack / home.siteWork : null;

	// incomeDropMonthly: max additional drop d such that capacity(I - d) >= monthlyCost.
	// capacity = min(comfortFrac*(I-d), backEndFrac*(I-d) - debt, (I-d) - expenses - debt).
	// Each term ≥ monthlyCost (mc) gives an upper bound on d; take the min:
	//   front-end:  comfortFrac*(I-d) >= mc         → d <= I - mc/comfortFrac
	//   back-end:   backEndFrac*(I-d) - debt >= mc  → d <= I - (mc + debt)/backEndFrac
	//   solvency:   (I-d) - expenses - debt >= mc   → d <= I - expenses - debt - mc
	const I = stressedIncome;
	const mc = costs.monthlyCost;
	const dFront = I - mc / finances.comfortFrac;
	const dBack = I - (mc + finances.debtMonthly) / finances.backEndFrac;
	const dSolvency = I - finances.expensesMonthly - finances.debtMonthly - mc;
	const incomeDropMonthly = Math.max(0, Math.min(dFront, dBack, dSolvency));

	// rateRisePct: max additional rate rise Δ where monthlyCost(rate + Δ) <= capacity
	// null if both loans are cash purchases (downFrac === 1)
	const bothCash = presets.land.downFrac === 1 && presets.home.downFrac === 1;
	let rateRisePct: number | null = null;

	if (!bothCash) {
		// Bisect on Δ ∈ [0, 30], 40 iterations
		// We want the largest Δ such that monthlyCost(stress + Δ) <= cap
		// Start: check if any margin exists (at Δ=0 must be feasible)
		if (monthlyOk) {
			let lo = 0;
			let hi = 30;
			for (let i = 0; i < 40; i++) {
				const mid = (lo + hi) / 2;
				const stressed = comboCosts(parcel, home, presets, { ...stress, rateDeltaPct: stress.rateDeltaPct + mid });
				if (stressed.monthlyCost <= cap) {
					lo = mid;
				} else {
					hi = mid;
				}
			}
			rateRisePct = lo;
		}
	}

	return {
		cashNeeded: costs.cashNeeded,
		cashAvailable,
		monthlyCost: costs.monthlyCost,
		monthlyCapacity: cap,
		pctOfIncome,
		cashOk,
		monthlyOk,
		verdict,
		readyInMonths,
		notReachableReason,
		margins: {
			siteWorkOverrunFrac,
			rateRisePct,
			incomeDropMonthly,
		},
	};
}
