import { type Cents, type Currency, formatMoney } from "@holdem/core";

export const CURRENCY_INFO: Record<
  Currency,
  { readonly label: string; readonly symbol: string; readonly locale: string }
> = {
  AUD: { label: "澳元", symbol: "$", locale: "en-AU" },
  CNY: { label: "人民币", symbol: "¥", locale: "zh-CN" },
};

export function formatGameMoney(value: Cents, currency: Currency) {
  return formatMoney(value, {
    currency,
    locale: CURRENCY_INFO[currency].locale,
    trimZeroCents: true,
  });
}
