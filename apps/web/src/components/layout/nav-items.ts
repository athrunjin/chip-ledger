import { Calculator, CircleUser, Coins, Users } from "lucide-react";

/** 主导航。手机端显示在底部，平板及以上显示在左侧。 */
export const NAV_ITEMS = [
  { to: "/", label: "牌局", icon: Coins },
  { to: "/players", label: "玩家", icon: Users },
  { to: "/tools", label: "工具", icon: Calculator },
  { to: "/me", label: "我的", icon: CircleUser },
] as const;
