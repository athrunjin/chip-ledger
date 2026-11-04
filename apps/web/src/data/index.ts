import { createDexieRepository, createGuestDatabase } from "./dexie-repository";

/** 游客模式没有账号，本机数据统一归到这个组织者下，登录后可导入账户。 */
export const GUEST_ORGANIZER_ID = "guest";

export const repository = createDexieRepository(createGuestDatabase(), GUEST_ORGANIZER_ID);
