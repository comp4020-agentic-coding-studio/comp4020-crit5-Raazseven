// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from "vitest";
import { personSvg, OUTLINE_COLOR, ROLE_KEYS } from "../src/scripts/people.ts";

// Locks in two things a player should always be able to rely on: every
// anomaly gets an outline (never silently dropped for a given tell type),
// and the outline color tracks severity — yellow/orange/red for
// low/moderate/high — rather than a single fixed color.
//
// main.ts touches the DOM at module scope (it looks up #app on import), so
// it's loaded dynamically after stubbing the root element it expects.
let ANOMALIES: import("../src/scripts/main.ts").AnomalySpec[];
let outlineSeverityFor: typeof import("../src/scripts/main.ts").outlineSeverityFor;

beforeAll(async () => {
  document.body.innerHTML = '<div id="app"></div>';
  const mainModule = await import("../src/scripts/main.ts");
  ANOMALIES = mainModule.ANOMALIES;
  outlineSeverityFor = mainModule.outlineSeverityFor;
});

describe("anomaly outline: always present", () => {
  it("every anomaly definition has a severity, so the outline is never missing", () => {
    for (const anomaly of ANOMALIES) {
      expect(outlineSeverityFor({ isAnomaly: true, severity: anomaly.severity })).toBe(anomaly.severity);
    }
  });

  it("covers all three tell types (hat, shirt, outline), all still outlined", () => {
    const tells = new Set(ANOMALIES.map((a) => a.tell));
    expect(tells).toEqual(new Set(["hat", "shirt", "outline"]));
    for (const anomaly of ANOMALIES) {
      const svg = personSvg(anomaly.role, { outlineSeverity: anomaly.severity });
      expect(svg).toContain(`stroke="${OUTLINE_COLOR[anomaly.severity]}"`);
    }
  });

  it("a non-anomaly tile never gets an outline severity", () => {
    expect(outlineSeverityFor({ isAnomaly: false, severity: "high" })).toBeUndefined();
    expect(outlineSeverityFor({ isAnomaly: false })).toBeUndefined();
  });
});

describe("anomaly outline: colored by severity", () => {
  it("low severity outlines yellow", () => {
    const svg = personSvg("docs", { outlineSeverity: "low" });
    expect(svg).toContain(`stroke="${OUTLINE_COLOR.low}"`);
  });

  it("moderate severity outlines orange", () => {
    const svg = personSvg("backend", { outlineSeverity: "moderate" });
    expect(svg).toContain(`stroke="${OUTLINE_COLOR.moderate}"`);
  });

  it("high severity outlines red", () => {
    const svg = personSvg("security", { outlineSeverity: "high" });
    expect(svg).toContain(`stroke="${OUTLINE_COLOR.high}"`);
  });

  it("the three severity colors are distinct", () => {
    const colors = new Set(Object.values(OUTLINE_COLOR));
    expect(colors.size).toBe(3);
  });

  it("no outline is drawn when outlineSeverity is omitted", () => {
    const svg = personSvg("docs", {});
    expect(svg).not.toContain("stroke=");
  });
});

describe("anomaly outline: visible against every shirt color", () => {
  // Some roles' shirts are themselves gold/orange (build, legal, release) —
  // close enough to the low/moderate outline colors that a bare colored
  // stroke could blend into the fill. A dark halo behind the colored stroke
  // guarantees contrast no matter which role wears it.
  it("draws a dark halo behind the colored outline, for every role", () => {
    for (const role of ROLE_KEYS) {
      for (const severity of ["low", "moderate", "high"] as const) {
        const svg = personSvg(role, { outlineSeverity: severity });
        expect(svg).toContain('stroke="#000"');
        expect(svg).toContain(`stroke="${OUTLINE_COLOR[severity]}"`);
      }
    }
  });

  it("has no halo when there is no outline", () => {
    for (const role of ROLE_KEYS) {
      const svg = personSvg(role, {});
      expect(svg).not.toContain('stroke="#000"');
    }
  });
});
