import { pinyin } from "pinyin-pro";

/** Generates the pinyin initials of a name, reading surnames as surnames, e.g. 单小明 => sxm. Non-Chinese text is kept as is. */
export function toInitials(name: string): string {
  return pinyin(name, {
    pattern: "first",
    toneType: "none",
    type: "array",
    surname: "head",
    nonZh: "consecutive",
  })
    .join("")
    .replace(/\s/g, "")
    .toLowerCase();
}
