import { payment } from './payment';
import type { HomeOption, Parcel, Presets, Stress } from './types';

export interface ComboCosts {
	landDown: number;
	homeDown: number;
	closing: number;
	siteWorkCash: number;
	cashNeeded: number;
	landPayment: number;
	homePayment: number;
	taxMonthly: number;
	monthlyCost: number;
}

/**
 * Compute the full cost breakdown for a parcel + home combination.
 *
 * Rules (from spec "Core concept" + "Simplifications"):
 * - Site work is paid cash, scaled by (1 + stress.siteWorkOverrunFrac)
 * - Closing = (parcel.closingFrac ?? presets.closingFrac) * landPrice
 * - Tax = (parcel.taxAnnualPct ?? presets.taxAnnualPct) / 100 * (landPrice + homeCost) / 12
 *   Site work is excluded from the tax basis.
 * - Loans use annualRatePct + stress.rateDeltaPct
 * - downFrac === 1 means cash purchase: no loan (payment 0, down = full price)
 * - monthlyCost = landPayment + homePayment + taxMonthly + insuranceMonthly
 */
export function comboCosts(parcel: Parcel, home: HomeOption, presets: Presets, stress: Stress): ComboCosts {
	const closingFrac = parcel.closingFrac ?? presets.closingFrac;
	const taxAnnualPct = parcel.taxAnnualPct ?? presets.taxAnnualPct;

	// Down payments
	const landDown = presets.land.downFrac * parcel.landPrice;
	const homeDown = presets.home.downFrac * home.homeCost;
	const closing = closingFrac * parcel.landPrice;
	const siteWorkCash = home.siteWork * (1 + stress.siteWorkOverrunFrac);
	const cashNeeded = landDown + homeDown + closing + siteWorkCash;

	// Monthly loan payments — rate includes stress delta; downFrac === 1 means no loan
	const landPrincipal = (1 - presets.land.downFrac) * parcel.landPrice;
	const landRate = presets.land.annualRatePct + stress.rateDeltaPct;
	const landPayment = presets.land.downFrac === 1
		? 0
		: payment(landPrincipal, landRate, presets.land.termMonths);

	const homePrincipal = (1 - presets.home.downFrac) * home.homeCost;
	const homeRate = presets.home.annualRatePct + stress.rateDeltaPct;
	const homePayment = presets.home.downFrac === 1
		? 0
		: payment(homePrincipal, homeRate, presets.home.termMonths);

	// Tax: site work excluded from basis
	const taxMonthly = (taxAnnualPct / 100) * (parcel.landPrice + home.homeCost) / 12;

	const monthlyCost = landPayment + homePayment + taxMonthly + presets.insuranceMonthly;

	return { landDown, homeDown, closing, siteWorkCash, cashNeeded, landPayment, homePayment, taxMonthly, monthlyCost };
}
