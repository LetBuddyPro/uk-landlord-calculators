// Rental yield, the way a landlord comparing two properties needs it:
// gross (the number in the listing), net (what is left after the costs
// that come with letting), and cash-on-cash (what the money actually put
// in is earning once the mortgage is paid). Pre-tax throughout: this does not model Section 24 or any other tax.
//
// Everything is annual and pure.

export type YieldInputs = {
  /** What was, or will be, paid for the property. */
  purchasePrice: number;
  /** Stamp duty, legal, survey, mortgage fees — the money spent to buy that is not the price. */
  purchaseCosts: number;
  /** Work done before letting. Counts as cash in, not as a running cost. */
  refurbishment: number;
  monthlyRent: number;
  /** Weeks a year the property is expected to sit empty, as a percentage of rent. */
  voidPercent: number;
  /** Letting agent's cut of collected rent, 0 if self-managed. */
  agentPercent: number;
  /** Insurance, maintenance, safety certificates, service charge, ground rent — per year. */
  annualCosts: number;
  /** Interest-only mortgage. 0 loan means a cash purchase. */
  loanAmount: number;
  interestRate: number;
};

export type YieldResult = {
  grossAnnualRent: number;
  voidLoss: number;
  agentFees: number;
  annualCosts: number;
  /** Rent after voids, fees and costs, before the mortgage. */
  netOperatingIncome: number;
  annualInterest: number;
  /** After the mortgage interest. */
  annualCashflow: number;
  monthlyCashflow: number;
  /** Price plus costs plus refurbishment, less the loan. */
  cashInvested: number;
  grossYield: number;
  netYield: number;
  /** Annual cashflow as a percentage of cash invested. Null for zero cash in. */
  cashOnCash: number | null;
  /** The monthly rent at which cashflow is zero. */
  breakevenMonthlyRent: number;
  /** Cost of letting as a share of gross rent: what the gross figure hides. */
  costRatio: number;
};

export function calculateYield(i: YieldInputs): YieldResult {
  const grossAnnualRent = Math.max(0, i.monthlyRent) * 12;
  const voidLoss = grossAnnualRent * clampPct(i.voidPercent);
  const collected = grossAnnualRent - voidLoss;
  const agentFees = collected * clampPct(i.agentPercent);
  const annualCosts = Math.max(0, i.annualCosts);
  const netOperatingIncome = collected - agentFees - annualCosts;
  const annualInterest = Math.max(0, i.loanAmount) * clampPct(i.interestRate);
  const annualCashflow = netOperatingIncome - annualInterest;
  const price = Math.max(0, i.purchasePrice);
  const cashInvested = price + Math.max(0, i.purchaseCosts) + Math.max(0, i.refurbishment) - Math.max(0, i.loanAmount);

  // Break-even: the rent at which collected − fees − costs − interest = 0.
  // collected = rent·12·(1−v); fees = collected·a; so rent = (costs + interest) / (12·(1−v)·(1−a)).
  const keep = (1 - clampPct(i.voidPercent)) * (1 - clampPct(i.agentPercent));
  const breakevenMonthlyRent = keep > 0 ? (annualCosts + annualInterest) / (12 * keep) : 0;

  return {
    grossAnnualRent,
    voidLoss,
    agentFees,
    annualCosts,
    netOperatingIncome,
    annualInterest,
    annualCashflow,
    monthlyCashflow: annualCashflow / 12,
    cashInvested,
    grossYield: price > 0 ? (grossAnnualRent / price) * 100 : 0,
    netYield: price > 0 ? (netOperatingIncome / price) * 100 : 0,
    cashOnCash: cashInvested > 0 ? (annualCashflow / cashInvested) * 100 : null,
    breakevenMonthlyRent,
    costRatio: grossAnnualRent > 0 ? ((voidLoss + agentFees + annualCosts) / grossAnnualRent) * 100 : 0,
  };
}

/** Net yield across a grid of rent and price changes — the two figures a buyer is least sure of. */
export function sensitivityGrid(i: YieldInputs, steps = [-10, 0, 10]): { rentDelta: number; priceDelta: number; netYield: number; cashOnCash: number | null }[] {
  const out: { rentDelta: number; priceDelta: number; netYield: number; cashOnCash: number | null }[] = [];
  for (const rentDelta of steps) {
    for (const priceDelta of steps) {
      const r = calculateYield({
        ...i,
        monthlyRent: i.monthlyRent * (1 + rentDelta / 100),
        purchasePrice: i.purchasePrice * (1 + priceDelta / 100),
      });
      out.push({ rentDelta, priceDelta, netYield: r.netYield, cashOnCash: r.cashOnCash });
    }
  }
  return out;
}

function clampPct(p: number): number {
  if (!Number.isFinite(p)) return 0;
  return Math.min(100, Math.max(0, p)) / 100;
}

// The inputs travel in the URL so a result can be sent to a partner or
// a broker. Short keys, numbers only, nothing personal — an address is
// deliberately not an input.
const URL_KEYS: Record<keyof YieldInputs, string> = {
  purchasePrice: "p",
  purchaseCosts: "c",
  refurbishment: "w",
  monthlyRent: "r",
  voidPercent: "v",
  agentPercent: "a",
  annualCosts: "k",
  loanAmount: "l",
  interestRate: "i",
};

export const YIELD_DEFAULTS: YieldInputs = {
  purchasePrice: 200000,
  purchaseCosts: 9500,
  refurbishment: 0,
  monthlyRent: 1150,
  voidPercent: 4,
  agentPercent: 10,
  annualCosts: 1500,
  loanAmount: 150000,
  interestRate: 5.25,
};

export function inputsToParams(i: YieldInputs): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of Object.keys(URL_KEYS) as Array<keyof YieldInputs>) {
    if (i[key] !== YIELD_DEFAULTS[key]) params.set(URL_KEYS[key], String(i[key]));
  }
  return params;
}

export function inputsFromParams(params: URLSearchParams): YieldInputs {
  const out = { ...YIELD_DEFAULTS };
  for (const key of Object.keys(URL_KEYS) as Array<keyof YieldInputs>) {
    const raw = params.get(URL_KEYS[key]);
    if (raw === null) continue;
    const n = Number.parseFloat(raw);
    if (Number.isFinite(n) && n >= 0 && n < 1e9) out[key] = n;
  }
  return out;
}
