// Stamp Duty Land Tax on an additional residential property in England
// and Northern Ireland. Bands and surcharges read from GOV.UK
// ("Residential property rates" and "Higher rates of SDLT") on
// 2026-10-07: standard bands from 1 April 2025, the 5% higher-rates
// surcharge on every band, and the 2% non-UK-resident surcharge.
//
// Out of scope on purpose: Scotland (LBTT) and Wales (LTT) have their own
// taxes, companies and 6+ property purchases have special rates, and
// linked transactions need a person. This module does not pretend to
// cover them.

export const SDLT_BANDS = [
  { upTo: 125_000, rate: 0 },
  { upTo: 250_000, rate: 0.02 },
  { upTo: 925_000, rate: 0.05 },
  { upTo: 1_500_000, rate: 0.1 },
  { upTo: Infinity, rate: 0.12 },
] as const;

export const HIGHER_RATE_SURCHARGE = 0.05;
export const NON_RESIDENT_SURCHARGE = 0.02;
/** The higher rates do not apply to a purchase under this. */
export const HIGHER_RATE_MIN_PRICE = 40_000;

export type StampDutyInputs = { price: number; nonResident: boolean };
export const STAMP_DUTY_DEFAULTS: StampDutyInputs = { price: 250_000, nonResident: false };

export type StampDutyBand = { from: number; to: number; amount: number; standard: number; surcharge: number };

export type StampDutyResult = {
  bands: StampDutyBand[];
  standard: number;
  higherRates: number;
  nonResident: number;
  total: number;
  /** Total as a percentage of the price; null at a zero price. */
  effectiveRate: number | null;
  /** What the same purchase costs with no higher-rates surcharge, for the comparison line. */
  singlePropertyTotal: number;
};

export function calculateStampDuty({ price, nonResident }: StampDutyInputs): StampDutyResult {
  const p = Math.max(0, price);
  const surcharged = p >= HIGHER_RATE_MIN_PRICE;
  const bands: StampDutyBand[] = [];
  let from = 0;
  for (const band of SDLT_BANDS) {
    if (p <= from) break;
    const to = Math.min(p, band.upTo);
    const amount = to - from;
    bands.push({
      from,
      to,
      amount,
      standard: amount * band.rate,
      surcharge: surcharged ? amount * HIGHER_RATE_SURCHARGE : 0,
    });
    from = band.upTo;
  }
  const standard = bands.reduce((s, b) => s + b.standard, 0);
  const higherRates = bands.reduce((s, b) => s + b.surcharge, 0);
  const nonResidentTax = nonResident ? p * NON_RESIDENT_SURCHARGE : 0;
  const total = standard + higherRates + nonResidentTax;
  return {
    bands,
    standard,
    higherRates,
    nonResident: nonResidentTax,
    total,
    effectiveRate: p > 0 ? (total / p) * 100 : null,
    singlePropertyTotal: standard + nonResidentTax,
  };
}

export function inputsToParams(i: StampDutyInputs): URLSearchParams {
  const params = new URLSearchParams();
  if (i.price !== STAMP_DUTY_DEFAULTS.price) params.set("p", String(i.price));
  if (i.nonResident) params.set("n", "1");
  return params;
}

export function inputsFromParams(params: URLSearchParams): StampDutyInputs {
  const raw = params.get("p");
  const parsed = raw === null ? NaN : Number(raw);
  const price = Number.isFinite(parsed) && parsed >= 0 && parsed <= 1e9 ? parsed : STAMP_DUTY_DEFAULTS.price;
  return { price, nonResident: params.get("n") === "1" };
}
