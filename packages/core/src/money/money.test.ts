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

/** 生成合理范围内的金额（±1 亿分 = ±100 万元） */
const arbCents = fc.integer({ min: -100_000_000, max: 100_000_000 }).map(cents);

describe("cents", () => {
  it("接受整数", () => {
    expect(cents(1250)).toBe(1250);
  });

  it("拒绝小数和非有限数", () => {
    expect(() => cents(12.5)).toThrow(InvalidMoneyError);
    expect(() => cents(Number.NaN)).toThrow(InvalidMoneyError);
    expect(() => cents(Number.POSITIVE_INFINITY)).toThrow(InvalidMoneyError);
  });

  it("把 -0 规范为 0", () => {
    expect(Object.is(cents(-0), 0)).toBe(true);
    expect(Object.is(negate(ZERO), 0)).toBe(true);
  });
});

describe("加减与求和", () => {
  it("基本运算", () => {
    expect(add(cents(100), cents(250))).toBe(350);
    expect(subtract(cents(100), cents(250))).toBe(-150);
    expect(sum([cents(1), cents(2), cents(3)])).toBe(6);
    expect(sum([])).toBe(0);
  });

  it("性质：a + b - b === a", () => {
    fc.assert(fc.property(arbCents, arbCents, (a, b) => subtract(add(a, b), b) === a));
  });

  it("性质：a + (-a) === 0", () => {
    fc.assert(fc.property(arbCents, (a) => add(a, negate(a)) === 0));
  });
});

describe("multiply", () => {
  it("消除浮点误差：1000 × 0.3 = 300，而不是向上取整成 301", () => {
    expect(multiply(cents(1000), 0.3, "ceil")).toBe(300);
    expect(multiply(cents(1000), 0.1 * 3, "ceil")).toBe(300);
  });

  it("支持三种取整方式", () => {
    // 1005 × 5% = 50.25
    expect(multiply(cents(1005), 0.05, "floor")).toBe(50);
    expect(multiply(cents(1005), 0.05, "ceil")).toBe(51);
    expect(multiply(cents(1005), 0.05, "half-up")).toBe(50);
    // 1010 × 5% = 50.5
    expect(multiply(cents(1010), 0.05, "half-up")).toBe(51);
    // 负数四舍五入远离 0
    expect(multiply(cents(-1010), 0.05, "half-up")).toBe(-51);
  });

  it("保险赔率示例：保额 $100 × 3.5 倍 = $350", () => {
    expect(multiply(cents(10_000), 3.5)).toBe(35_000);
  });

  it("拒绝非有限系数", () => {
    expect(() => multiply(cents(100), Number.NaN)).toThrow(InvalidMoneyError);
  });
});

describe("allocate", () => {
  it("平分 $1 给 3 人：34 / 33 / 33", () => {
    expect(allocate(cents(100), [1, 1, 1])).toEqual([34, 33, 33]);
  });

  it("按比例拆分", () => {
    expect(allocate(cents(1000), [3, 1])).toEqual([750, 250]);
    expect(allocate(cents(5), [0, 1])).toEqual([0, 5]);
  });

  it("负数金额同样适用", () => {
    expect(allocate(cents(-100), [1, 1, 1])).toEqual([-34, -33, -33]);
  });

  it("拒绝非法比例", () => {
    expect(() => allocate(cents(100), [])).toThrow(InvalidMoneyError);
    expect(() => allocate(cents(100), [0, 0])).toThrow(InvalidMoneyError);
    expect(() => allocate(cents(100), [-1, 2])).toThrow(InvalidMoneyError);
  });

  it("性质：各份之和严格等于原金额，且每份与精确值相差不到 1 分", () => {
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

describe("解析与格式化", () => {
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

  it("parseMoney 无法解析时抛错", () => {
    expect(() => parseMoney("abc")).toThrow(InvalidMoneyError);
  });

  it("toDecimalString", () => {
    expect(toDecimalString(cents(1250))).toBe("12.50");
    expect(toDecimalString(cents(-5))).toBe("-0.05");
    expect(toDecimalString(ZERO)).toBe("0.00");
  });

  it("性质：parse(toDecimalString(x)) === x", () => {
    fc.assert(fc.property(arbCents, (x) => parseMoney(toDecimalString(x)) === x));
  });

  it("formatMoney 默认澳元", () => {
    expect(formatMoney(cents(1250))).toBe("$12.50");
    expect(formatMoney(cents(-1250))).toBe("-$12.50");
  });

  it("formatMoney 显示水上/水下符号、省略整数的 .00", () => {
    const opts = { signDisplay: "exceptZero", trimZeroCents: true } as const;
    expect(formatMoney(cents(5000), opts)).toBe("+$50");
    expect(formatMoney(cents(-5050), opts)).toBe("-$50.50");
    expect(formatMoney(ZERO, opts)).toBe("$0");
  });

  it("formatMoney 支持人民币", () => {
    expect(formatMoney(cents(8800), { currency: "CNY", locale: "zh-CN" })).toBe("¥88.00");
  });
});
