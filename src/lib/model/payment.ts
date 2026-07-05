/**
 * Monthly payment for a fully-amortizing loan.
 *
 * @param principal   - Loan principal ($)
 * @param annualRatePct - Annual interest rate as a percent (e.g. 8.0 for 8%)
 * @param termMonths  - Loan term in months
 * @returns Monthly payment ($)
 *
 * Formula: P * r / (1 - (1+r)^-n)  where r = annualRatePct/100/12
 * At 0% rate: straight-line (principal / termMonths)
 */
export function payment(principal: number, annualRatePct: number, termMonths: number): number {
	const r = annualRatePct / 100 / 12;
	return r === 0
		? principal / termMonths
		: (principal * r) / (1 - Math.pow(1 + r, -termMonths));
}

/**
 * Payment factor: monthly payment per dollar of principal.
 * Useful for computing payments on scaled principals without repeating the formula.
 */
export function paymentFactor(annualRatePct: number, termMonths: number): number {
	return payment(1, annualRatePct, termMonths);
}
