/**
 * 金额工具。
 *
 * 规则：系统内所有金额一律用「整数分」表示（例如 $12.50 存为 1250），
 * 避免浮点误差（0.1 + 0.2 !== 0.3）。只有在显示或解析用户输入时才和小数互相转换。
 *
 * 详见 docs/adr/0004-money-as-integer-cents.md
 */

declare const CentsBrand: unique symbol;

/** 以「分」为单位的整数金额。用品牌类型防止把普通数字误当金额使用。 */
export type Cents = number & { readonly [CentsBrand]: true };

export class InvalidMoneyError extends Error {
  override readonly name = "InvalidMoneyError";
}

/** 把一个整数（分）标记为金额。不是安全整数时抛错。 */
export function cents(value: number): Cents {
  if (!Number.isSafeInteger(value)) {
    throw new InvalidMoneyError(`金额必须是整数分，收到：${value}`);
  }
  // -0 统一为 0，避免显示 "-$0.00"
  return (value === 0 ? 0 : value) as Cents;
}

export const ZERO: Cents = cents(0);

export function add(a: Cents, b: Cents): Cents {
  return cents(a + b);
}

export function subtract(a: Cents, b: Cents): Cents {
  return cents(a - b);
}

export function negate(a: Cents): Cents {
  return cents(-a);
}

export function sum(values: readonly Cents[]): Cents {
  let total = 0;
  for (const v of values) total += v;
  return cents(total);
}

export function isZero(a: Cents): boolean {
  return a === 0;
}

export function compare(a: Cents, b: Cents): -1 | 0 | 1 {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * 取整方式：
 * - `half-up`：四舍五入（.5 远离 0）
 * - `floor`：向下取整（例如抽水通常向下取整，对玩家有利）
 * - `ceil`：向上取整
 */
export type RoundingMode = "half-up" | "floor" | "ceil";

/** 浮点运算的容差，用来消除 0.1 * 3 = 0.30000000000000004 这类误差。 */
const EPSILON = 1e-9;

function roundNumber(raw: number, mode: RoundingMode): number {
  const nearest = Math.round(raw);
  if (Math.abs(raw - nearest) < EPSILON * Math.max(1, Math.abs(raw))) {
    return nearest;
  }
  switch (mode) {
    case "floor":
      return Math.floor(raw);
    case "ceil":
      return Math.ceil(raw);
    case "half-up":
      return Math.sign(raw) * Math.round(Math.abs(raw));
  }
}

/**
 * 金额乘以系数（如抽水比例 0.05、保险赔率 3.5），按指定方式取整到分。
 */
export function multiply(a: Cents, factor: number, mode: RoundingMode = "half-up"): Cents {
  if (!Number.isFinite(factor)) {
    throw new InvalidMoneyError(`系数必须是有限数字，收到：${factor}`);
  }
  return cents(roundNumber(a * factor, mode));
}

/**
 * 按比例拆分金额，保证各份之和严格等于原金额（最大余数法）。
 * 用途：平分底池、分摊荷官费等。
 *
 * @example allocate(cents(100), [1, 1, 1]) // => [34, 33, 33]
 */
export function allocate(total: Cents, ratios: readonly number[]): Cents[] {
  if (ratios.length === 0) {
    throw new InvalidMoneyError("拆分比例不能为空");
  }
  if (ratios.some((r) => !Number.isFinite(r) || r < 0)) {
    throw new InvalidMoneyError("拆分比例必须是非负有限数字");
  }
  const ratioSum = ratios.reduce((acc, r) => acc + r, 0);
  if (ratioSum === 0) {
    throw new InvalidMoneyError("拆分比例之和不能为 0");
  }

  const sign = total < 0 ? -1 : 1;
  const abs = Math.abs(total);
  const exact = ratios.map((r) => (abs * r) / ratioSum);
  const shares = exact.map((x) => Math.floor(x));
  let remainder = abs - shares.reduce((acc, s) => acc + s, 0);

  // 余下的分按小数部分从大到小分配；小数部分相同时，排在前面的优先
  const order = exact
    .map((x, i) => ({ i, frac: x - Math.floor(x) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const { i } of order) {
    if (remainder <= 0) break;
    shares[i] = (shares[i] ?? 0) + 1;
    remainder -= 1;
  }

  return shares.map((s) => cents(sign * s));
}

const MONEY_PATTERN = /^([+-])?(\d+)(?:\.(\d{1,2}))?$/;

/**
 * 解析用户输入的金额字符串（元），返回分。无法解析时返回 null。
 * 支持："12"、"12.5"、"12.50"、"-3.2"、"1,234.56"、" $20 "。
 * 不接受超过两位小数。
 */
export function tryParseMoney(input: string): Cents | null {
  const normalized = input
    .trim()
    .replace(/[,\s]/g, "")
    .replace(/^([+-]?)[$¥￥]/, "$1");
  const match = MONEY_PATTERN.exec(normalized);
  if (!match) return null;
  const [, sign, whole = "0", fraction = ""] = match;
  const value = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(value)) return null;
  return cents(sign === "-" ? -value : value);
}

/** 同 tryParseMoney，但无法解析时抛错。 */
export function parseMoney(input: string): Cents {
  const result = tryParseMoney(input);
  if (result === null) {
    throw new InvalidMoneyError(`无法解析金额："${input}"`);
  }
  return result;
}

/** 转成不带货币符号的小数字符串，例如 -1250 => "-12.50"。 */
export function toDecimalString(value: Cents): string {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  const whole = Math.floor(abs / 100);
  const fraction = String(abs % 100).padStart(2, "0");
  return `${sign}${whole}.${fraction}`;
}

export interface FormatMoneyOptions {
  /** ISO 4217 货币代码，默认 AUD */
  currency?: string;
  /** 区域设置，默认 en-AU */
  locale?: string;
  /** 正数是否显示 "+"（用于展示水上/水下） */
  signDisplay?: "auto" | "always" | "exceptZero";
  /** 金额是整数时是否省略 ".00" */
  trimZeroCents?: boolean;
}

/** 按货币格式化显示，例如 1250 => "$12.50"。 */
export function formatMoney(value: Cents, options: FormatMoneyOptions = {}): string {
  const {
    currency = "AUD",
    locale = "en-AU",
    signDisplay = "auto",
    trimZeroCents = false,
  } = options;
  const fractionDigits = trimZeroCents && value % 100 === 0 ? 0 : 2;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    signDisplay,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value / 100);
}
