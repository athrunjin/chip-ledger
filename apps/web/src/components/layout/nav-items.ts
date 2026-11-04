import { Calculator, CircleUser, Coins, Users } from "lucide-react";

/** Main navigation. Shown at the bottom on phones and at the side on tablets and up. */
export const NAV_ITEMS = [
  { to: "/", label: "牌局", icon: Coins },
  { to: "/players", label: "玩家", icon: Users },
  { to: "/tools", label: "工具", icon: Calculator },
  { to: "/me", label: "我的", icon: CircleUser },
] as const;
