import { describe, expect, it } from "vitest";

import { toInitials } from "./pinyin";

describe("toInitials", () => {
  it("中文名取拼音首字母", () => {
    expect(toInitials("张三")).toBe("zs");
  });

  it("多音字姓氏按姓氏读音", () => {
    expect(toInitials("单小明")).toBe("sxm");
    expect(toInitials("曾小贤")).toBe("zxx");
  });

  it("英文转小写，空格去掉", () => {
    expect(toInitials("Alice")).toBe("alice");
    expect(toInitials("王 Bob")).toBe("wbob");
  });
});
