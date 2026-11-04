import { pinyin } from "pinyin-pro";

/** 生成名字的拼音首字母，姓氏按姓氏读音，例如「单小明」=> sxm。非中文原样保留。 */
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
