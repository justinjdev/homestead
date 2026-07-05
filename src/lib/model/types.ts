// src/lib/model/types.ts
export interface FinanceProfile {
	incomeMonthly: number;    // take-home $/mo
	expensesMonthly: number;  // excluding current housing
	debtMonthly: number;      // existing obligations $/mo
	cashOnHand: number;
	savingsMonthly: number;
	comfortFrac: number;      // max share of income for all-in housing, default 0.30
}

export interface LoanTerms {
	downFrac: number;         // 1 = cash purchase (no loan)
	annualRatePct: number;
	termMonths: number;
}

export interface Presets {
	land: LoanTerms;          // default { downFrac: 0.25, annualRatePct: 8.0, termMonths: 180 }
	home: LoanTerms;          // default { downFrac: 0.15, annualRatePct: 9.5, termMonths: 180 }
	closingFrac: number;      // of land price, default 0.03
	taxAnnualPct: number;     // of (land price + home cost), default 1.0
	insuranceMonthly: number; // default 100
}

export interface Parcel {
	id: string;               // crypto.randomUUID()
	name: string;
	landPrice: number;
	taxAnnualPct?: number;    // per-parcel override
	closingFrac?: number;     // per-parcel override
}

export interface HomeOption {
	id: string;
	name: string;
	homeCost: number;
	siteWork: number;
}

export interface Stress {
	rateDeltaPct: number;         // added to BOTH loans' annualRatePct, 0–10
	siteWorkOverrunFrac: number;  // site work multiplied by (1 + this), 0–1
	incomeDropMonthly: number;    // subtracted from incomeMonthly, ≥ 0
}

export interface Evaluation {
	cashNeeded: number;
	cashAvailable: number;        // cashOnHand + savingsMonthly * tMonths
	monthlyCost: number;          // loans + tax + insurance (excludes existing debt)
	monthlyCapacity: number;      // see formula in Quest 1 Task 3
	pctOfIncome: number;          // (monthlyCost + debtMonthly) / stressed income
	cashOk: boolean;
	monthlyOk: boolean;
	verdict: 'in' | 'out';
	readyInMonths: number | null; // null when monthlyOk is false or savings can't close the gap
	notReachableReason: 'monthly' | 'no-savings' | null;
	margins: {
		siteWorkOverrunFrac: number | null; // max extra overrun beyond current stress; null if no site work
		rateRisePct: number | null;         // max additional rate rise; null if both loans are cash
		incomeDropMonthly: number;          // max additional income drop
	};
}

export type Polygon = Array<[number, number]>; // [landPrice, improvementBudget], CCW, [] if empty
