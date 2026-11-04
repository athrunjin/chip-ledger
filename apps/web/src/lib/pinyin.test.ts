import { describe, expect, it } from "vitest";

import { toInitials } from "./pinyin";

describe("toInitials", () => {
  it("takes pinyin initials of Chinese names", () => {
    expect(toInitials("张三")).toBe("zs");
  });

  it("reads surnames with several readings as surnames", () => {
    expect(toInitials("单小明")).toBe("sxm");
    expect(toInitials("曾小贤")).toBe("zxx");
  });

  it("lowercases English and removes spaces", () => {
    expect(toInitials("Alice")).toBe("alice");
    expect(toInitials("王 Bob")).toBe("wbob");
  });
});
