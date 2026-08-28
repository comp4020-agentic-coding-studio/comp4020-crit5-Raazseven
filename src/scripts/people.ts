// Personnel chrome for the scene: a uniform per role, used to build
// camouflage clusters (the anomaly should look like its neighbors, not stand
// out from them). Colors/hats here are keyed by role, never by severity —
// severity is only revealed after a shot.

export interface RoleType {
  label: string;
  shirt: string;
  hat: boolean;
  hatColor?: string;
  skin: string;
}

export const ROLE_TYPES: Record<string, RoleType> = {
  backend: { label: "Backend Engineer", shirt: "#4d9de0", hat: false, skin: "#e8b48c" },
  frontend: { label: "Frontend Dev", shirt: "#9d6ee0", hat: false, skin: "#c98a5b" },
  docs: { label: "Docs Writer", shirt: "#6c8ebf", hat: true, hatColor: "#3f5f8f", skin: "#f0c9a0" },
  ops: { label: "DevOps", shirt: "#4de0b3", hat: true, hatColor: "#2c9e78", skin: "#8d5a3c" },
  qa: { label: "QA Tester", shirt: "#4dc9c9", hat: false, skin: "#e8b48c" },
  data: { label: "DB Admin", shirt: "#7a6ee0", hat: false, skin: "#c98a5b" },
  security: { label: "Security", shirt: "#b08968", hat: true, hatColor: "#6b4a2f", skin: "#f0c9a0" },
  monitoring: { label: "Log Analyst", shirt: "#9aa0a6", hat: false, skin: "#8d5a3c" },
  build: { label: "Build Worker", shirt: "#e0b34d", hat: true, hatColor: "#a97a1f", skin: "#e8b48c" },
  release: { label: "Release Mgr", shirt: "#e08a4d", hat: false, skin: "#c98a5b" },
  design: { label: "Designer", shirt: "#e04d9d", hat: false, skin: "#f0c9a0" },
  scripts: { label: "Automation", shirt: "#a3e04d", hat: false, skin: "#8d5a3c" },
  support: { label: "Support", shirt: "#7a9a7a", hat: false, skin: "#e8b48c" },
  legal: { label: "Compliance", shirt: "#d4af37", hat: true, hatColor: "#8a6d00", skin: "#c98a5b" },
};

// Decoy codenames grouped by role, so a round can cluster several of the
// anomaly's own role around it — the crowd it hides in.
export const CODENAME_POOL: Record<string, string[]> = {
  backend: ["NODE-7", "ROUTER-2", "MIDWARE-4", "SEED-9"],
  frontend: ["LAYOUT-3", "HEADER-8", "CARD-5", "APPSHELL-1"],
  docs: ["README-1", "CHANGELOG-6", "SETUP-2", "CONTRIB-4"],
  ops: ["DEPLOY-3", "CI-7", "COMPOSE-2", "CONFIG-9"],
  qa: ["CLI-5", "WORKER-8", "TRAIN-1", "CACHE-6"],
  data: ["SCHEMA-2", "MIGRATE-4", "INDEX-9", "SEED-SQL-3"],
  security: ["VAULT-1", "SECRET-7", "STAGING-4", "LOCALENV-2"],
  monitoring: ["ACCESS-3", "ERROR-8", "BUILDLOG-5", "DEPLOYLOG-1"],
  build: ["WEBPACK-6", "BUNDLE-2", "PKG-9", "MANIFEST-4"],
  release: ["TAG-3", "SHIP-7", "NOTES-2", "ROLLOUT-5"],
  design: ["THEME-4", "GRID-8", "RESET-1", "STYLE-6"],
  scripts: ["EXPORT-2", "METRICS-9", "USERS-3", "CSVGEN-7"],
  support: ["TODO-5", "ROADMAP-1", "CREDITS-8", "NOTES-3"],
  legal: ["LICENSE-1", "NOTICE-4", "COPYING-2", "TERMS-6"],
};

export const ROLE_KEYS = Object.keys(ROLE_TYPES);

export interface PersonOpts {
  hatOverride?: boolean;
  shirtQuirk?: boolean;
  outlineSeverity?: "low" | "moderate" | "high";
  pose?: number;
}

// Outline color scales with severity, brightest/reddest at the top —
// yellow (low) -> orange (moderate) -> red (high).
export const OUTLINE_COLOR: Record<"low" | "moderate" | "high", string> = {
  low: "#ffe135",
  moderate: "#ff8c1a",
  high: "#ff0000",
};

// A flat-vector figure: head, torso/shirt, arms, legs, optional hat, a
// grounding shadow. `hatOverride` flips whether a hat is drawn versus the
// role's default; `shirtQuirk` applies a barely-there hue/saturation shift;
// `outlineSeverity` traces the torso in a color scaled to severity (yellow/
// orange/red) — always present on the anomaly, spottable at a glance.
export function personSvg(role: string, opts: PersonOpts = {}): string {
  const type = ROLE_TYPES[role] ?? ROLE_TYPES.support;
  const hasHat = opts.hatOverride ?? type.hat;
  const armLean = (opts.pose ?? 0) % 2 === 0 ? 0 : 1.5;
  const shirtFilter = opts.shirtQuirk
    ? ` style="filter: hue-rotate(22deg) saturate(1.25)"`
    : "";
  const torsoOutline = opts.outlineSeverity
    ? ` stroke="${OUTLINE_COLOR[opts.outlineSeverity]}" stroke-width="2"`
    : "";
  // A dark halo sits behind the colored outline so it reads clearly even
  // against a shirt whose color is itself close to yellow/orange/red (e.g.
  // build's gold or release's orange) — contrast is never left to chance.
  const torsoHalo = opts.outlineSeverity
    ? `<rect x="9" y="21" width="22" height="24" rx="7" fill="none" stroke="#000" stroke-width="5" opacity="0.6" />`
    : "";
  return `
    <svg class="person-figure" viewBox="0 0 40 64" aria-hidden="true">
      <ellipse class="person-shadow" cx="20" cy="61" rx="13" ry="2.5" fill="#000" opacity="0.35" />
      <rect class="person-leg" x="12" y="42" width="7" height="17" rx="2.5" fill="#2b2f38" />
      <rect class="person-leg" x="21" y="42" width="7" height="17" rx="2.5" fill="#2b2f38" />
      <g${shirtFilter}>
        <rect class="person-arm" x="${5 - armLean}" y="24" width="6" height="17" rx="3" fill="${type.shirt}" />
        <rect class="person-arm" x="${29 + armLean}" y="24" width="6" height="17" rx="3" fill="${type.shirt}" />
        ${torsoHalo}
        <rect class="person-torso" x="9" y="21" width="22" height="24" rx="7" fill="${type.shirt}"${torsoOutline} />
      </g>
      <circle class="person-head" cx="20" cy="13" r="8.5" fill="${type.skin}" />
      ${
        hasHat
          ? `<path class="person-hat" d="M10.5 9.5 Q20 -2 29.5 9.5 L27.5 11.5 H12.5 Z" fill="${type.hatColor ?? "#333"}" />`
          : ""
      }
    </svg>
  `;
}
