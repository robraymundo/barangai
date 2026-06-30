import { describe, it, expect } from "vitest";
import { scoreResilience, DEFAULT_RESILIENCE_WEIGHTS } from "../resilience";
import { HIGH_VULN_ZONE, LOW_VULN_ZONE, TEST_PROFILE } from "./fixtures";
import type { BarangayProfile } from "@/types";

const onlyHigh: BarangayProfile = { ...TEST_PROFILE, zones: [HIGH_VULN_ZONE] };
const onlyLow: BarangayProfile = { ...TEST_PROFILE, zones: [LOW_VULN_ZONE] };

describe("scoreResilience", () => {
  it("returns a composite within 0..100", () => {
    const { score } = scoreResilience(TEST_PROFILE);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("exposes all six components, each within 0..100", () => {
    const { components } = scoreResilience(TEST_PROFILE);
    const keys = Object.keys(DEFAULT_RESILIENCE_WEIGHTS);
    for (const k of keys) {
      const v = (components as unknown as Record<string, number>)[k];
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });

  it("factor contributions sum to the score", () => {
    const { score, factors } = scoreResilience(TEST_PROFILE);
    const sum = factors.reduce((a, f) => a + f.contribution, 0);
    expect(sum).toBeCloseTo(score, 1);
  });

  it("default weights sum to 1", () => {
    const sum = Object.values(DEFAULT_RESILIENCE_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 6);
  });

  it("rates a safe, well-served community as more resilient than a fragile one", () => {
    expect(scoreResilience(onlyLow).score).toBeGreaterThan(scoreResilience(onlyHigh).score);
  });

  it("is deterministic", () => {
    expect(scoreResilience(TEST_PROFILE)).toEqual(scoreResilience(TEST_PROFILE));
  });
});
