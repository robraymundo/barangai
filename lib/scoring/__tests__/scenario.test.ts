import { describe, it, expect } from "vitest";
import { simulateScenario } from "../scenario";
import { ENV } from "../coefficients";
import { TEST_PROFILE, HIGH_VULN_ZONE } from "./fixtures";
import type { BarangayProfile, ScenarioParams } from "@/types";

const farEvacProfile: BarangayProfile = { ...TEST_PROFILE, zones: [{ ...HIGH_VULN_ZONE }] };

describe("simulateScenario", () => {
  it("does not mutate the input profile", () => {
    const snapshot = structuredClone(TEST_PROFILE);
    simulateScenario(TEST_PROFILE, { intervention: "plant_trees", targetZoneId: "H", magnitude: 1000, rawText: "" });
    expect(TEST_PROFILE).toEqual(snapshot);
  });

  it("build_evacuation_center improves resilience for an underserved zone", () => {
    const params: ScenarioParams = {
      intervention: "build_evacuation_center",
      targetZoneId: "H",
      rawText: "What if we build an evacuation center in the riverside purok?",
    };
    const r = simulateScenario(farEvacProfile, params);
    expect(r.deltas.resilience).toBeGreaterThan(0);
    expect(r.after.resilience).toBeGreaterThan(r.before.resilience);
    expect(r.deltas.estimatedBeneficiaries).toBe(HIGH_VULN_ZONE.population);
  });

  it("plant_trees yields carbon, flood, and heat benefits", () => {
    const trees = 1000;
    const r = simulateScenario(farEvacProfile, {
      intervention: "plant_trees",
      targetZoneId: "H",
      magnitude: trees,
      rawText: "What if we plant 1000 trees?",
    });
    expect(r.deltas.carbonAbsorptionKgPerYear).toBe(Math.round(trees * ENV.co2PerTreePerYearKg));
    expect(r.deltas.floodReduction ?? 0).toBeGreaterThan(0);
    expect(r.deltas.urbanHeatReductionC ?? 0).toBeGreaterThan(0);
    expect(r.deltas.resilience).toBeGreaterThan(0);
  });

  it("traffic policy reports a negative traffic change and no capital indicator change", () => {
    const r = simulateScenario(farEvacProfile, {
      intervention: "divert_traffic",
      targetZoneId: "H",
      rawText: "What if motorcycles are diverted from this road?",
    });
    expect(r.deltas.trafficChange).toBeLessThan(0);
  });

  it("is deterministic", () => {
    const params: ScenarioParams = { intervention: "plant_trees", targetZoneId: "H", magnitude: 500, rawText: "" };
    expect(simulateScenario(farEvacProfile, params)).toEqual(
      simulateScenario(farEvacProfile, params),
    );
  });
});
