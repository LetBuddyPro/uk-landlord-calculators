# uk-landlord-calculators

Small, dependency-free TypeScript functions for three sums UK landlords get wrong:

- **`arrears`**: a running rent-arrears ledger and whether it has reached the **Ground 8** line (three months' rent for a monthly tenancy since 1 May 2026), with CSV export.
- **`stampDuty`**: SDLT on an additional residential property in England and Northern Ireland, band by band, with the 5% higher-rates surcharge and the 2% non-resident surcharge.
- **`rentalYield`**: gross yield, net yield, cash-on-cash and break-even rent, pre-tax.

They are the same functions behind the free calculators at [letbuddy.co.uk/calculators](https://letbuddy.co.uk/calculators).

```ts
import { arrears, stampDuty, rentalYield } from "uk-landlord-calculators";

stampDuty.calculateStampDuty({ price: 250_000, nonResident: false }).total; // 15000
```

## Read this before relying on it

- Rates and thresholds are a snapshot (SDLT read from GOV.UK on 2026-10-07; Ground 8 from the government's Renters' Rights Act overview for landlords). Law changes: check the source before you act.
- Not covered on purpose: Scotland (LBTT) and Wales (LTT), companies, purchases of six or more properties, linked transactions, weekly or fortnightly arrears ledgers, and any tax in the yield figures.
- General information, not legal or tax advice.

The source is TypeScript. Node 24 runs it directly (`npm test`); on older Node or in a browser, use a bundler or `tsc`.

## Licence

MIT. Contributions that update a rate with a source link are welcome.
