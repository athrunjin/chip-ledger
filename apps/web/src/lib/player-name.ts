import {
  INSURANCE_PLAYER_NAME,
  MAX_PLAYER_NAME_LENGTH,
  type PlayerNameIssue,
} from "@holdem-knight/core";

export const PLAYER_NAME_ISSUE_TEXT: Record<PlayerNameIssue, string> = {
  empty: "请输入名字",
  "too-long": `名字不能超过 ${MAX_PLAYER_NAME_LENGTH} 个字`,
  duplicate: "已有同名玩家，可以写成「小王2」来区分",
  reserved: `「${INSURANCE_PLAYER_NAME}」是保留名称，请换一个名字`,
};
