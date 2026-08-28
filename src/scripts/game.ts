// Pure game logic for Snipe the Anomaly — no DOM, no timers, so this file
// can be unit-tested directly and the DOM layer (main.ts) stays a thin
// wrapper around it.

export type Severity = "low" | "moderate" | "high";

// How many mistakes against a severity are tolerated before that tier's
// ending fires. This is the whole game's stakes in one table: a typo-tier
// anomaly forgives a few misses, a critical one forgives none.
export const MISTAKE_LIMIT: Record<Severity, number> = {
  low: 3,
  moderate: 2,
  high: 1,
};

export const WIN_TARGET = 24;

export type Ending = "clean" | "low" | "moderate" | "high";

export const ENDING_MESSAGE: Record<Ending, string> = {
  clean: "Deployed successfully.",
  low: "Deployed — but partially documented.",
  moderate: "Deployed — but missing a feature.",
  high: "DEPLOYMENT FAILED.",
};

export const RESTART_LABEL: Record<Ending, string> = {
  clean: "Ship it again",
  low: "Redeploy (docs can wait)",
  moderate: "Patch it in post",
  high: "git reset --hard && pray",
};

export interface GameState {
  sniped: number;
  level: number;
  mistakes: Record<Severity, number>;
  status: "playing" | "ended";
  ending: Ending | null;
}

export function createInitialState(): GameState {
  return {
    sniped: 0,
    level: 1,
    mistakes: { low: 0, moderate: 0, high: 0 },
    status: "playing",
    ending: null,
  };
}

const START_WINDOW_MS = 3600;
const WINDOW_STEP_MS = 110;
const MIN_WINDOW_MS = 1400;

export function windowDurationForLevel(level: number): number {
  return Math.max(MIN_WINDOW_MS, START_WINDOW_MS - (level - 1) * WINDOW_STEP_MS);
}

const START_PAUSE_MS = 1000;
const PAUSE_STEP_MS = 30;
const MIN_PAUSE_MS = 400;

export function pauseDurationForLevel(level: number): number {
  return Math.max(MIN_PAUSE_MS, START_PAUSE_MS - (level - 1) * PAUSE_STEP_MS);
}

// Correctly sniping the active anomaly: level up, and win outright once the
// target is reached — a clean run beats every degraded ending.
export function registerHit(state: GameState): GameState {
  const sniped = state.sniped + 1;
  if (sniped >= WIN_TARGET) {
    return { ...state, sniped, status: "ended", ending: "clean" };
  }
  return { ...state, sniped, level: state.level + 1 };
}

// A mistake against the given severity: a decoy click while that anomaly
// was live, or its window expiring unclicked. Mistakes never reset, and
// hitting a tier's limit ends the run immediately with that tier's ending.
export function registerMistake(state: GameState, severity: Severity): GameState {
  const mistakes = { ...state.mistakes, [severity]: state.mistakes[severity] + 1 };
  if (mistakes[severity] >= MISTAKE_LIMIT[severity]) {
    return { ...state, mistakes, status: "ended", ending: severity };
  }
  return { ...state, mistakes, level: state.level + 1 };
}
