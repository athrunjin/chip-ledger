import type { GameTimer, Timestamp } from "../domain";

/** Time on the clock. Computed from timestamps, so it survives a suspended page (ADR 0001). */
export function timerElapsedMs(timer: GameTimer, now: Timestamp): number {
  if (timer.runningSince === undefined) return timer.elapsedMs;
  return timer.elapsedMs + Math.max(0, now - timer.runningSince);
}

export function pauseTimer(timer: GameTimer, now: Timestamp): GameTimer {
  return { elapsedMs: timerElapsedMs(timer, now) };
}

/** Starts a timer that has never run, pauses a running one and resumes a paused one. */
export function toggleTimer(timer: GameTimer | undefined, now: Timestamp): GameTimer {
  if (timer === undefined) return { elapsedMs: 0, runningSince: now };
  if (timer.runningSince !== undefined) return pauseTimer(timer, now);
  return { ...timer, runningSince: now };
}
