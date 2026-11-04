import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  add,
  allocate,
  cents,
  formatMoney,
  InvalidMoneyError,
  multiply,
  negate,
  parseMoney,
  subtract,
  sum,
  toDecimalString,
  tryParseMoney,
  ZERO,
} from "./money";

/** Generates amounts in a sensible range (±100 million cents = ±1 million) */
const arbCents = fc.integer({ min: -100_000_000, max: 100_000_000 }).map(cents);

describe("cents", () => {
  it("accepts integers", () => {
    expect(cents(1250)).toBe(1250);
  });

  it("rejects decimals and non-finite numbers", () => {
    expect(() => cents(12.5)).toThrow(InvalidMoneyError);
    expect(() => cents(Number.NaN)).toThrow(InvalidMoneyError);
    expect(() => cents(Number.POSITIVE_INFINITY)).toThrow(InvalidMoneyError);
  });

  it("normalizes -0 to 0", () => {
    expect(Object.is(cents(-0), 0)).toBe(true);
    expect(Object.is(negate(ZERO), 0)).toBe(true);
  });
});

describe("addition, subtraction and sums", () => {
  it("basic operations", () => {
    expect(add(cents(100), cents(250))).toBe(350);
    expect(subtract(cents(100), cents(250))).toBe(-150);
    expect(sum([cents(1), cents(2), cents(3)])).toBe(6);
    expect(sum([])).toBe(0);
  });

  it("property: a + b - b === a", () => {
    fc.assert(fc.property(arbCents, arbCents, (a, b) => subtract(add(a, b), b) === a));
  });

  it("property: a + (-a) === 0", () => {
    fc.assert(fc.property(arbCents, (a) => add(a, negate(a)) === 0));
  });
});

describe("multiply", () => {
  it("removes floating-point error: 1000 × 0.3 = 300, not rounded up to 301", () => {
    expect(multiply(cents(1000), 0.3, "ceil")).toBe(300);
    expect(multiply(cents(1000), 0.1 * 3, "ceil")).toBe(300);
  });

  it("supports three rounding modes", () => {
    // 1005 × 5% = 50.25
    expect(multiply(cents(1005), 0.05, "floor")).toBe(50);
    expect(multiply(cents(1005), 0.05, "ceil")).toBe(51);
    expect(multiply(cents(1005), 0.05, "half-up")).toBe(50);
    // 1010 × 5% = 50.5
    expect(multiply(cents(1010), 0.05, "half-up")).toBe(51);
    // Negative numbers round away from 0
    expect(multiply(cents(-1010), 0.05, "half-up")).toBe(-51);
  });

  it("insurance odds example: $100 cover × 3.5 = $350", () => {
    expect(multiply(cents(10_000), 3.5)).toBe(35_000);
  });

  it("rejects non-finite factors", () => {
    expect(() => multiply(cents(100), Number.NaN)).toThrow(InvalidMoneyError);
  });
});

describe("allocate", () => {
  it("splits $1 between 3 people: 34 / 33 / 33", () => {
    expect(allocate(cents(100), [1, 1, 1])).toEqual([34, 33, 33]);
  });

  it("splits by ratio", () => {
    expect(allocate(cents(1000), [3, 1])).toEqual([750, 250]);
    expect(allocate(cents(5), [0, 1])).toEqual([0, 5]);
  });

  it("works for negative amounts too", () => {
    expect(allocate(cents(-100), [1, 1, 1])).toEqual([-34, -33, -33]);
  });

  it("rejects invalid ratios", () => {
    expect(() => allocate(cents(100), [])).toThrow(InvalidMoneyError);
    expect(() => allocate(cents(100), [0, 0])).toThrow(InvalidMoneyError);
    expect(() => allocate(cents(100), [-1, 2])).toThrow(InvalidMoneyError);
  });

  it("property: parts add up to exactly the total, each within 1 cent of exact", () => {
    fc.assert(
      fc.property(
        arbCents,
        fc.array(fc.integer({ min: 0, max: 1000 }), { minLength: 1, maxLength: 12 }),
        (total, ratios) => {
          fc.pre(ratios.some((r) => r > 0));
          const shares = allocate(total, ratios);
          const ratioSum = ratios.reduce((a, r) => a + r, 0);
          const sumOk = sum(shares) === total;
          const fairOk = shares.every(
            (s, i) => Math.abs(s - (total * (ratios[i] ?? 0)) / ratioSum) < 1,
          );
          return sumOk && fairOk;
        },
      ),
    );
  });
});

describe("parsing and formatting", () => {
  it.each([
    ["12", 1200],
    ["12.5", 1250],
    ["12.50", 1250],
    ["0.05", 5],
    ["-3.2", -320],
    ["+7", 700],
    ["1,234.56", 123_456],
    [" $20 ", 2000],
    ["-$20", -2000],
    ["¥88", 8800],
  ])("tryParseMoney(%j) === %d", (input, expected) => {
    expect(tryParseMoney(input)).toBe(expected);
  });

  it.each(["", "abc", "1.234", "1..2", "12.", ".5", "--1"])(
    "tryParseMoney(%j) === null",
    (input) => {
      expect(tryParseMoney(input)).toBeNull();
    },
  );

  it("parseMoney throws on unparseable input", () => {
    expect(() => parseMoney("abc")).toThrow(InvalidMoneyError);
  });

  it("toDecimalString", () => {
    expect(toDecimalString(cents(1250))).toBe("12.50");
    expect(toDecimalString(cents(-5))).toBe("-0.05");
    expect(toDecimalString(ZERO)).toBe("0.00");
  });

  it("property: parse(toDecimalString(x)) === x", () => {
    fc.assert(fc.property(arbCents, (x) => parseMoney(toDecimalString(x)) === x));
  });

  it("formatMoney defaults to AUD", () => {
    expect(formatMoney(cents(1250))).toBe("$12.50");
    expect(formatMoney(cents(-1250))).toBe("-$12.50");
  });

  it("formatMoney shows win/loss signs and drops .00 on whole amounts", () => {
    const opts = { signDisplay: "exceptZero", trimZeroCents: true } as const;
    expect(formatMoney(cents(5000), opts)).toBe("+$50");
    expect(formatMoney(cents(-5050), opts)).toBe("-$50.50");
    expect(formatMoney(ZERO, opts)).toBe("$0");
  });

  it("formatMoney supports CNY", () => {
    expect(formatMoney(cents(8800), { currency: "CNY", locale: "zh-CN" })).toBe("¥88.00");
  });
});
