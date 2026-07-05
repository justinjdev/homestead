// Golden values from standard amortization formula, cross-checked against
// published calculator tables (e.g. bankrate.com/mortgage-calculator).
// Tolerance: ±0.05 (toBeCloseTo with 1 decimal place = ±0.05)
import { describe, expect, it } from 'vitest';
import { payment, paymentFactor } from './payment';

describe('payment', () => {
	it('matches golden amortization values', () => {
		expect(payment(200_000, 6.0, 360)).toBeCloseTo(1199.10, 1);
		expect(payment(100_000, 8.0, 180)).toBeCloseTo(955.65, 1);
		expect(payment(50_000, 9.5, 180)).toBeCloseTo(522.11, 1);
	});
	it('uses straight-line at 0% rate', () => {
		expect(payment(12_000, 0, 60)).toBe(200);
	});
	it('paymentFactor is payment per dollar', () => {
		expect(paymentFactor(8.0, 180) * 100_000).toBeCloseTo(payment(100_000, 8.0, 180), 6);
	});
});
