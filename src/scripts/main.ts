import {
  createInitialState,
  ENDING_MESSAGE,
  RESTART_LABEL,
  registerHit,
  registerMistake,
  windowDurationForLevel,
  pauseDurationForLevel,
  type Ending,
  type GameState,
  type Severity,
} from "./game.ts";
import { personSvg, CODENAME_POOL, ROLE_TYPES, ROLE_KEYS } from "./people.ts";

const GRID_SIZE = 16;
const GRID_COLS = 4;
const GRID_ROWS = 4;
const RING_RADIUS = 16;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export type Tell = "hat" | "shirt" | "outline";

export interface AnomalySpec {
  severity: Severity;
  role: string;
  tell: Tell;
  label: string;
}

// Each anomaly shares a role/uniform with a cluster of decoys — the
// camouflage. Every anomaly gets a torso outline colored by severity
// (yellow/orange/red) so it's always spottable at a glance; `tell` is an
// additional physical difference layered on top — a shirt a shade off, or a
// hat that's missing/present when it shouldn't be.
export const ANOMALIES: AnomalySpec[] = [
  { severity: "low", role: "docs", tell: "hat", label: "REDAME-1" },
  { severity: "low", role: "backend", tell: "shirt", label: "R0UTER-2" },
  { severity: "low", role: "support", tell: "outline", label: "N0TES-3" },
  { severity: "moderate", role: "frontend", tell: "shirt", label: "HEDAER-8" },
  { severity: "moderate", role: "backend", tell: "hat", label: "MIDWARE-4" },
  { severity: "moderate", role: "qa", tell: "outline", label: "CAHCE-6" },
  { severity: "high", role: "security", tell: "hat", label: "VAULT-0" },
  { severity: "high", role: "data", tell: "shirt", label: "DR0P-SQL" },
  { severity: "high", role: "monitoring", tell: "outline", label: "BUILDLOG-X" },
];

export interface TileSpec {
  role: string;
  label: string;
  isAnomaly: boolean;
  severity?: Severity;
  tell?: Tell;
  pose: number;
}

// The anomaly always gets a colored outline — never gated on `tell`, so
// every anomaly definition (whatever its tell) is spottable at a glance.
export function outlineSeverityFor(spec: Pick<TileSpec, "isAnomaly" | "severity">): Severity | undefined {
  return spec.isAnomaly ? spec.severity : undefined;
}

interface Placement {
  xPct: number;
  yPct: number;
  scale: number;
  z: number;
}

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Builds the round's crowd: a cluster of decoys sharing the anomaly's role
// (so it has lookalikes to hide among) is reserved a contiguous full-width
// band of cells — a group standing together — and the anomaly is shuffled
// into that band specifically, never into the wider scene. The rest of the
// scene fills with a random mix of the other roles.
function buildRound(anomaly: AnomalySpec): { tiles: TileSpec[]; index: number } {
  const clusterPool = CODENAME_POOL[anomaly.role] ?? CODENAME_POOL.support;
  const clusterCount = Math.min(6, GRID_SIZE - 1);
  const cluster: TileSpec[] = [];
  for (let i = 0; i < clusterCount; i++) {
    cluster.push({ role: anomaly.role, label: pick(clusterPool), isAnomaly: false, pose: i });
  }
  const anomalyTile: TileSpec = {
    role: anomaly.role,
    label: anomaly.label,
    isAnomaly: true,
    severity: anomaly.severity,
    tell: anomaly.tell,
    pose: clusterCount,
  };
  const clusterBlock = shuffle([...cluster, anomalyTile]);

  const fillerNeeded = GRID_SIZE - clusterBlock.length;
  const filler: TileSpec[] = [];
  while (filler.length < fillerNeeded) {
    const role = pick(ROLE_KEYS);
    filler.push({
      role,
      label: pick(CODENAME_POOL[role] ?? CODENAME_POOL.support),
      isAnomaly: false,
      pose: filler.length,
    });
  }
  const shuffledFiller = shuffle(filler);

  const bandRows = Math.min(2, GRID_ROWS);
  const bandCellCount = bandRows * GRID_COLS;
  const startRow = Math.floor(Math.random() * (GRID_ROWS - bandRows + 1));
  const bandIndices = shuffle(
    Array.from(
      { length: bandCellCount },
      (_, k) => (startRow + Math.floor(k / GRID_COLS)) * GRID_COLS + (k % GRID_COLS),
    ),
  );

  const tiles: TileSpec[] = new Array(GRID_SIZE);
  let fillerCursor = 0;
  bandIndices.forEach((idx, k) => {
    tiles[idx] = k < clusterBlock.length ? clusterBlock[k] : shuffledFiller[fillerCursor++];
  });
  for (let idx = 0; idx < GRID_SIZE; idx++) {
    if (!tiles[idx]) tiles[idx] = shuffledFiller[fillerCursor++];
  }

  const index = tiles.findIndex((t) => t.isAnomaly);
  return { tiles, index };
}

// A loose, jittered grid: base cells across the scene, each offset by a
// random jitter and given a depth scale (further-back rows read smaller/
// higher, nearer ones larger/lower) so the crowd reads as scattered rather
// than a rigid lineup, while staying collision-free.
function computeLayout(count: number): Placement[] {
  const placements: Placement[] = [];
  for (let i = 0; i < count; i++) {
    const col = i % GRID_COLS;
    const row = Math.floor(i / GRID_COLS);
    const cellW = 100 / GRID_COLS;
    const cellH = 62 / GRID_ROWS;
    const baseX = cellW * (col + 0.5);
    const baseY = 22 + cellH * (row + 0.5);
    const jitterX = (Math.random() - 0.5) * cellW * 0.55;
    const jitterY = (Math.random() - 0.5) * cellH * 0.5;
    const depth = row / Math.max(1, GRID_ROWS - 1); // 0 = back, 1 = front
    const scale = 0.72 + depth * 0.5 + (Math.random() - 0.5) * 0.08;
    placements.push({
      xPct: Math.min(96, Math.max(4, baseX + jitterX)),
      yPct: Math.min(92, Math.max(20, baseY + jitterY)),
      scale,
      z: Math.round(scale * 100),
    });
  }
  return placements;
}

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("#app root missing");

let state: GameState = createInitialState();
let roundTimer: ReturnType<typeof setTimeout> | undefined;
let activeAnomaly: AnomalySpec | null = null;
let activeTileIndex = -1;
let tileEls: HTMLButtonElement[] = [];
let audioCtx: AudioContext | null = null;

function reducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function ensureAudio(): AudioContext | null {
  if (typeof AudioContext === "undefined") return null;
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function playGunshot(): void {
  const ctx = ensureAudio();
  if (!ctx) return;
  const duration = 0.15;
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 900;
  filter.Q.value = 0.7;
  const gain = ctx.createGain();
  gain.gain.value = 0.5;
  noise.connect(filter).connect(gain).connect(ctx.destination);
  noise.start();
}

function playThud(): void {
  const ctx = ensureAudio();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(110, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.2);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.22);
}

function onPointerMove(e: PointerEvent): void {
  const reticle = document.querySelector<HTMLDivElement>("#reticle");
  if (!reticle) return;
  reticle.style.left = `${e.clientX}px`;
  reticle.style.top = `${e.clientY}px`;
}
window.addEventListener("pointermove", onPointerMove);

function startTimerRing(durationMs: number): void {
  const ring = document.querySelector<SVGCircleElement>("#timer-ring-fg");
  if (!ring || reducedMotion()) return;
  ring.style.transition = "none";
  ring.style.strokeDashoffset = "0";
  ring.getBoundingClientRect();
  requestAnimationFrame(() => {
    ring.style.transition = `stroke-dashoffset ${durationMs}ms linear`;
    ring.style.strokeDashoffset = String(RING_CIRCUMFERENCE);
  });
}

function stopTimerRing(): void {
  const ring = document.querySelector<SVGCircleElement>("#timer-ring-fg");
  if (!ring) return;
  ring.style.transition = "none";
}

function fireShot(x: number, y: number, tileEl: HTMLButtonElement | null, hit: boolean): void {
  playGunshot();
  if (!reducedMotion()) {
    const playArea = document.querySelector<HTMLDivElement>("#play-area");
    playArea?.classList.add("recoil");
    setTimeout(() => playArea?.classList.remove("recoil"), 150);

    const reticleInner = document.querySelector<HTMLDivElement>(".reticle-inner");
    reticleInner?.classList.add("kick");
    setTimeout(() => reticleInner?.classList.remove("kick"), 150);

    const muzzle = document.createElement("div");
    muzzle.className = "muzzle-flash";
    muzzle.style.left = `${x}px`;
    muzzle.style.top = `${y}px`;
    document.body.appendChild(muzzle);
    setTimeout(() => muzzle.remove(), 240);

    if (tileEl) {
      const decal = document.createElement("span");
      decal.className = "bullet-decal";
      tileEl.appendChild(decal);
    }
  }
  tileEl?.classList.add(hit ? "tile-hit" : "tile-miss");
}

function expireShot(tileEl: HTMLButtonElement | null): void {
  playThud();
  tileEl?.classList.add("tile-expired");
}

function renderStart(): void {
  clearTimeout(roundTimer);
  document.body.classList.remove("in-game");
  app!.innerHTML = `
    <div class="screen screen-start">
      <button type="button" class="run-button" id="run">&gt; run_program</button>
    </div>
  `;
  document.querySelector<HTMLButtonElement>("#run")?.addEventListener("click", startGame);
}

function showEndingPanel(ending: Ending, extraClass = ""): void {
  app!.innerHTML = `
    <div class="screen screen-ended ending-${ending} ${extraClass}" role="status">
      <p class="ending-message">${ENDING_MESSAGE[ending]}</p>
      <p class="ending-score">${state.sniped} sniped</p>
      <button type="button" class="restart-button" id="restart">${RESTART_LABEL[ending]}</button>
    </div>
  `;
  if (ending === "high" && !reducedMotion()) {
    app!.classList.add("crash-shake");
    setTimeout(() => app!.classList.remove("crash-shake"), 600);
  }
  document.querySelector<HTMLButtonElement>("#restart")?.addEventListener("click", () => {
    state = createInitialState();
    startGame();
  });
}

function runNukeSequence(): void {
  const scene = document.querySelector<HTMLDivElement>("#scene");
  const tiles = scene ? (Array.from(scene.querySelectorAll(".tile")) as HTMLElement[]) : [];
  tiles.forEach((tile, i) => {
    tile.style.setProperty("--char-delay", `${i * 35}ms`);
    tile.classList.add("char-fall");
  });

  const overlay = document.createElement("div");
  overlay.className = "nuke-overlay";
  overlay.innerHTML = `
    <div class="nuke-flash"></div>
    <div class="nuke-cloud nuke-cloud-1"></div>
    <div class="nuke-cloud nuke-cloud-2"></div>
    <div class="nuke-cloud nuke-cloud-3"></div>
    <div class="nuke-vignette"></div>
  `;
  document.body.appendChild(overlay);
  document.body.classList.add("crash-shake-hard");

  setTimeout(() => {
    document.body.classList.remove("crash-shake-hard");
    overlay.remove();
    showEndingPanel(state.ending!, "nuke-aftermath");
  }, 2000);
}

function renderEnded(): void {
  clearTimeout(roundTimer);
  stopTimerRing();
  const ending = state.ending!;

  if (ending === "high") {
    if (reducedMotion()) {
      showEndingPanel(ending, "nuke-static");
    } else {
      runNukeSequence();
    }
    return;
  }

  showEndingPanel(ending);
}

function startGame(): void {
  state = createInitialState();
  document.body.classList.add("in-game");
  app!.innerHTML = `
    <div class="screen screen-playing" id="play-area">
      <div class="hud">
        <span class="hud-sniped">${state.sniped}</span>
        <span class="hud-level">L${state.level}</span>
      </div>
      <div class="scene" id="scene">
        <div class="scene-sky"></div>
        <div class="scene-skyline scene-skyline-far"></div>
        <div class="scene-skyline scene-skyline-near"></div>
        <div class="scene-rooftop"></div>
        <div class="scene-people" id="scene-people"></div>
        <div class="scope-vignette" aria-hidden="true"></div>
      </div>
    </div>
    <div class="reticle" id="reticle">
      <div class="reticle-inner">
        <svg viewBox="0 0 40 40" class="reticle-svg" aria-hidden="true">
          <circle class="timer-ring-bg" cx="20" cy="20" r="${RING_RADIUS}" />
          <circle id="timer-ring-fg" class="timer-ring-fg" cx="20" cy="20" r="${RING_RADIUS}"
                  stroke-dasharray="${RING_CIRCUMFERENCE}" stroke-dashoffset="0" />
          <line x1="20" y1="2" x2="20" y2="13" />
          <line x1="20" y1="27" x2="20" y2="38" />
          <line x1="2" y1="20" x2="13" y2="20" />
          <line x1="27" y1="20" x2="38" y2="20" />
          <circle class="reticle-dot" cx="20" cy="20" r="1.6" />
        </svg>
      </div>
    </div>
  `;
  nextRound();
}

function renderGrid(tiles: TileSpec[]): void {
  const layer = document.querySelector<HTMLDivElement>("#scene-people");
  if (!layer) return;
  layer.innerHTML = "";
  tileEls = [];
  const layout = computeLayout(tiles.length);
  tiles.forEach((spec, i) => {
    const type = ROLE_TYPES[spec.role] ?? ROLE_TYPES.support;
    const place = layout[i];
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "tile";
    tile.style.left = `${place.xPct}%`;
    tile.style.top = `${place.yPct}%`;
    tile.style.setProperty("--depth-scale", String(place.scale));
    tile.style.zIndex = String(place.z);
    const hatOverride = spec.isAnomaly && spec.tell === "hat" ? !type.hat : undefined;
    const shirtQuirk = spec.isAnomaly && spec.tell === "shirt";
    const outlineSeverity = outlineSeverityFor(spec);
    tile.innerHTML = `
      <span class="tile-visual">
        ${personSvg(spec.role, { hatOverride, shirtQuirk, outlineSeverity, pose: spec.pose })}
        <span class="tile-name">${spec.label}</span>
      </span>
    `;
    tile.setAttribute("aria-label", `${spec.label}, ${type.label}`);
    if (spec.isAnomaly) {
      tile.classList.add("tile-anomaly");
      if (spec.severity) tile.dataset.severity = spec.severity;
    }
    tile.addEventListener("click", (e) => handleTileClick(i, e as MouseEvent, tile));
    layer.appendChild(tile);
    tileEls.push(tile);
  });
}

function updateHud(): void {
  const sniped = document.querySelector(".hud-sniped");
  const level = document.querySelector(".hud-level");
  if (sniped) sniped.textContent = String(state.sniped);
  if (level) level.textContent = `L${state.level}`;
}

function flash(kind: "hit" | "miss", severity: Severity): void {
  if (reducedMotion()) return;
  const scene = document.querySelector<HTMLDivElement>("#scene");
  if (!scene) return;
  scene.classList.add(`flash-${kind}`, `severity-${severity}`);
  setTimeout(() => scene.classList.remove(`flash-${kind}`, `severity-${severity}`), 260);
}

function nextRound(): void {
  activeAnomaly = pick(ANOMALIES);
  const round = buildRound(activeAnomaly);
  activeTileIndex = round.index;
  renderGrid(round.tiles);
  clearTimeout(roundTimer);
  const duration = windowDurationForLevel(state.level);
  startTimerRing(duration);
  roundTimer = setTimeout(() => {
    expireShot(tileEls[activeTileIndex] ?? null);
    resolveRound(false);
  }, duration);
}

function resolveRound(hit: boolean): void {
  clearTimeout(roundTimer);
  stopTimerRing();
  const severity = activeAnomaly!.severity;

  // The resolved tile keeps its hit/miss/expired visual through the pause
  // (that's the feedback), but it must stop claiming to be live the instant
  // it resolves — otherwise a click on it during the pause looks like it
  // should do something when there is nothing left to hit.
  const resolvedTile = tileEls[activeTileIndex];
  resolvedTile?.classList.remove("tile-anomaly");
  if (resolvedTile) delete resolvedTile.dataset.severity;

  activeAnomaly = null;
  activeTileIndex = -1;

  state = hit ? registerHit(state) : registerMistake(state, severity);
  flash(hit ? "hit" : "miss", severity);

  if (state.status === "ended") {
    renderEnded();
    return;
  }

  updateHud();
  roundTimer = setTimeout(nextRound, pauseDurationForLevel(state.level));
}

function handleTileClick(index: number, event: MouseEvent, tileEl: HTMLButtonElement): void {
  if (state.status !== "playing" || !activeAnomaly) return;
  const hit = index === activeTileIndex;
  fireShot(event.clientX, event.clientY, tileEl, hit);
  resolveRound(hit);
}

renderStart();
