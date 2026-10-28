import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** 合并 Tailwind 类名，后面的覆盖前面冲突的类。 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
