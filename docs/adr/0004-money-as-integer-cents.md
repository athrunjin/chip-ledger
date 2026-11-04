# 0004. All money is integer cents

- Status: Accepted
- Date: 2026-10-28

## Context

Settlement has to be exact. JavaScript numbers are floating point, so `0.1 + 0.2 === 0.30000000000000004`,
and doing money math with decimals produces books that don't balance.

## Decision

- All money inside the system is **integer cents**, using the `Cents` type from `@holdem/core` (a branded type, so it can't be mixed up with plain numbers).
- Convert to and from decimals only for display (`formatMoney`) and when parsing user input (`tryParseMoney`).
- Multiplying by a rate (rake, odds) must name a rounding mode explicitly (`half-up` / `floor` / `ceil`).
- Splitting money (dividing a pot, sharing a fee) uses `allocate`, which guarantees the parts add up to exactly the total.
- Money columns in the database use `bigint` (cents).

## Consequences

- Logic that conserves money gets fast-check property tests (large amounts of random data verifying that totals don't change).
- The chip-to-cash ratio is saved as a game setting, and chip counts are integers too.
