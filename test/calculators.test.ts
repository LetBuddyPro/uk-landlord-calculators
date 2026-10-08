import { test } from "node:test";
import assert from "node:assert/strict";
import { arrears, stampDuty, rentalYield } from "../src/index.ts";

test("arrears: Ground 8 is reached at three months' rent", () => {
  const periods = [
    { label: "Jan", due: 900, paid: 900 },
    { label: "Feb", due: 900, paid: 400 },
    { label: "Mar", due: 900, paid: 0 },
    { label: "Apr", due: 900, paid: 0 },
  ];
  assert.equal(arrears.calculateArrears(periods).ground8Reached, false);
  const r = arrears.calculateArrears([...periods, { label: "May", due: 900, paid: 0 }]);
  assert.equal(r.balance, 3200);
  assert.equal(r.ground8Reached, true);
});

test("arrears: CSV banner is optional", () => {
  const rows = arrears.calculateArrears([{ label: "Jan", due: 900, paid: 0 }]).rows;
  assert.ok(arrears.arrearsToCsv(rows).startsWith("Period,"));
  assert.ok(arrears.arrearsToCsv(rows, "Made with X").startsWith("Made with X\r\nPeriod,"));
});

test("stamp duty: £250,000 additional property is £15,000", () => {
  const r = stampDuty.calculateStampDuty({ price: 250_000, nonResident: false });
  assert.equal(r.total, 15_000);
  assert.equal(r.singlePropertyTotal, 2_500);
});

test("stamp duty: no surcharge under £40,000", () => {
  assert.equal(stampDuty.calculateStampDuty({ price: 39_999, nonResident: false }).total, 0);
});

test("yield: gross yield is annual rent over price", () => {
  const r = rentalYield.calculateYield({ ...rentalYield.YIELD_DEFAULTS, monthlyRent: 1000, purchasePrice: 200_000 });
  assert.equal(r.grossYield, 6);
});
