import { describe, expect, it } from "vitest";
import {
  MISTAKE_LIMIT,
  WIN_TARGET,
  createInitialState,
  registerHit,
  registerMistake,
  type Severity,
} from "../src/scripts/game.ts";

// The core rule: how forgiving a miss is depends on the anomaly's severity.
// Mistakes accumulate per severity across the run; hitting a tier's limit
// ends the game immediately with that tier's ending. This is what makes the
// game losable and gives play an ending beyond a simple win/lose.
describe("mistake budgets end the game with the matching ending", () => {
  const severities: Severity[] = ["low", "moderate", "high"];

  for (const severity of severities) {
    it(`stays playable below the ${severity} limit (${MISTAKE_LIMIT[severity]})`, () => {
      let state = createInitialState();
      for (let i = 0; i < MISTAKE_LIMIT[severity] - 1; i++) {
        state = registerMistake(state, severity);
      }
      expect(state.status).toBe("playing");
      expect(state.ending).toBeNull();
      expect(state.mistakes[severity]).toBe(MISTAKE_LIMIT[severity] - 1);
    });

    it(`ends with the ${severity} ending on the ${MISTAKE_LIMIT[severity]}th ${severity} mistake`, () => {
      let state = createInitialState();
      for (let i = 0; i < MISTAKE_LIMIT[severity]; i++) {
        state = registerMistake(state, severity);
      }
      expect(state.status).toBe("ended");
      expect(state.ending).toBe(severity);
    });
  }

  it("high severity tolerates zero mistakes", () => {
    const state = registerMistake(createInitialState(), "high");
    expect(state.status).toBe("ended");
    expect(state.ending).toBe("high");
  });

  it("mistakes on one severity don't spend another's budget", () => {
    let state = createInitialState();
    state = registerMistake(state, "low");
    state = registerMistake(state, "moderate");
    expect(state.status).toBe("playing");
    expect(state.mistakes).toEqual({ low: 1, moderate: 1, high: 0 });
  });
});

describe("a clean run to the win target ends before any tier is exhausted", () => {
  it("ends with the clean ending once sniped reaches the win target", () => {
    let state = createInitialState();
    for (let i = 0; i < WIN_TARGET; i++) {
      state = registerHit(state);
    }
    expect(state.status).toBe("ended");
    expect(state.ending).toBe("clean");
    expect(state.sniped).toBe(WIN_TARGET);
  });

  it("keeps playing and levels up on hits before the target", () => {
    const state = registerHit(createInitialState());
    expect(state.status).toBe("playing");
    expect(state.level).toBe(2);
  });
});
