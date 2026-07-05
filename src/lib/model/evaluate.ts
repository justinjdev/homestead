import { comboCosts } from './costs';
import type { Evaluation, FinanceProfile, HomeOption, Parcel, Presets, Stress } from './types';

/**
 * Monthly capacity: how much can be spent on housing loans, tax, and insurance.
 *
 * Formula:
 *   stressed income I = incomeMonthly - incomeDropMonthly
 *   capacity = min(comfortFrac * I, I - expensesMonthly) - debtMonthly
 *
 * May be ≤ 0 when expenses exceed income or debt is too high.
 */
export function capacity(finances: FinanceProfile, stress: Stress): number {
	const I = finances.incomeMonthly - stress.incomeDropMonthly;
	return Math.min(finances.comfortFrac * I, I - finances.expensesMonthly) - finances.debtMonthly;
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

	// incomeDropMonthly: max additional drop d such that capacity(I - d) >= monthlyCost
	// capacity is min(comfortFrac*(I-d), (I-d)-expenses) - debt >= monthlyCost
	// Solve both branches and take the minimum positive result:
	//   branch 1: comfortFrac*(I-d) - debt >= monthlyCost  → d <= (comfortFrac*I - debt - monthlyCost)/comfortFrac
	//   branch 2: (I-d) - expenses - debt >= monthlyCost   → d <= I - expenses - debt - monthlyCost
	const I = stressedIncome;
	const d1 = (finances.comfortFrac * I - finances.debtMonthly - costs.monthlyCost) / finances.comfortFrac;
	const d2 = I - finances.expensesMonthly - finances.debtMonthly - costs.monthlyCost;
	const incomeDropMonthly = Math.max(0, Math.min(d1, d2));

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
