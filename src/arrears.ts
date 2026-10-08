// Rent arrears ledger arithmetic for the free tracker. Monthly rent only:
// Ground 8's threshold is three months' rent for a monthly tenancy
// (thirteen weeks where rent is weekly or fortnightly) after the
// Renters' Rights Act, 1 May 2026 — the figure from the
// government's Renters' Rights Act overview for landlords. A weekly tenancy needs a
// different ledger and this module does not approximate it.

export const GROUND_8_MONTHS = 3;

export type ArrearsPeriod = {
  /** Label the landlord typed or the generated default, e.g. "Jan 2026". */
  label: string;
  due: number;
  paid: number;
};

export type ArrearsRow = ArrearsPeriod & {
  /** Balance owed after this period; negative is credit. */
  balance: number;
};

export type ArrearsResult = {
  rows: ArrearsRow[];
  totalDue: number;
  totalPaid: number;
  balance: number;
  /** Balance as a number of the latest rent charge, e.g. 2.5 months. Null when there is no rent charge. */
  monthsOwed: number | null;
  ground8Threshold: number;
  /** Ground 8 is made out on arrears alone at the threshold or above. */
  ground8Reached: boolean;
  /** How much more arrears until the threshold; 0 once reached. */
  toThreshold: number;
};

export function calculateArrears(periods: ArrearsPeriod[]): ArrearsResult {
  let running = 0;
  const rows = periods.map((p) => {
    running += p.due - p.paid;
    return { ...p, balance: running };
  });
  const totalDue = periods.reduce((s, p) => s + p.due, 0);
  const totalPaid = periods.reduce((s, p) => s + p.paid, 0);
  const balance = totalDue - totalPaid;
  const lastRent = [...periods].reverse().find((p) => p.due > 0)?.due ?? 0;
  const threshold = lastRent * GROUND_8_MONTHS;
  return {
    rows,
    totalDue,
    totalPaid,
    balance,
    monthsOwed: lastRent > 0 ? balance / lastRent : null,
    ground8Threshold: threshold,
    ground8Reached: lastRent > 0 && balance >= threshold,
    toThreshold: Math.max(0, threshold - balance),
  };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** `count` consecutive month labels ending at the month of `end`. */
export function monthLabels(count: number, end: Date): string[] {
  const out: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(end.getFullYear(), end.getMonth() - i, 1);
    out.push(`${MONTHS[d.getMonth()]} ${d.getFullYear()}`);
  }
  return out;
}

/** CSV of the ledger. Pass `banner` to put a line of text above the column headings. */
export function arrearsToCsv(rows: ArrearsRow[], banner?: string): string {
  const cell = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = banner ? [cell(banner)] : [];
  lines.push(["Period", "Rent due", "Paid", "Balance owed"].join(","));
  for (const r of rows) lines.push([cell(r.label), r.due.toFixed(2), r.paid.toFixed(2), r.balance.toFixed(2)].join(","));
  return lines.join("\r\n") + "\r\n";
}
