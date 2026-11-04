/**
 * @holdem/core —— 业务核心。
 *
 * 只放纯函数和类型：同样的输入永远得到同样的输出，不访问网络、数据库或界面。
 * 这样 Web、以后的原生 App、服务端、玩家端都能复用同一套算法，并且容易测试。
 */
export * from "./domain";
export * from "./money";
