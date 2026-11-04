import { createDexieRepository, createGuestDatabase } from "./dexie-repository";

/** Guest mode has no account, so local data sits under this organizer and can be imported after sign-in. */
export const GUEST_ORGANIZER_ID = "guest";

export const repository = createDexieRepository(createGuestDatabase(), GUEST_ORGANIZER_ID);
