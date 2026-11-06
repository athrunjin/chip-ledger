import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { pauseTimer, timerElapsedMs, toggleTimer } from "./timer";

describe("toggleTimer", () => {
  it("starts from zero the first time", () => {
    expect(toggleTimer(undefined, 100)).toEqual({ elapsedMs: 0, runningSince: 100 });
  });

  it("pauses a running timer and keeps the time so far", () => {
    expect(toggleTimer({ elapsedMs: 50, runningSince: 100 }, 130)).toEqual({ elapsedMs: 80 });
  });

  it("resumes a paused timer without counting the pause", () => {
    const resumed = toggleTimer({ elapsedMs: 80 }, 1_000);
    expect(timerElapsedMs(resumed, 1_010)).toBe(90);
  });
});

describe("timerElapsedMs", () => {
  it("does not move while paused", () => {
    expect(timerElapsedMs({ elapsedMs: 80 }, 9_999)).toBe(80);
  });

  it("does not go back if the device clock does", () => {
    expect(timerElapsedMs({ elapsedMs: 80, runningSince: 100 }, 50)).toBe(80);
  });

  it("adds up every run, however the pauses fall", () => {
    const run = fc.record({ gap: fc.nat(1_000_000), length: fc.nat(1_000_000) });
    fc.assert(
      fc.property(fc.array(run), (runs) => {
        let now = 0;
        let timer = toggleTimer(undefined, now);
        timer = pauseTimer(timer, now);
        for (const { gap, length } of runs) {
          now += gap;
          timer = toggleTimer(timer, now);
          now += length;
          timer = toggleTimer(timer, now);
        }
        const total = runs.reduce((sum, { length }) => sum + length, 0);
        expect(timerElapsedMs(timer, now + 5)).toBe(total);
      }),
    );
  });
});
