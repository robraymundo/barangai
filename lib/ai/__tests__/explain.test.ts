import { describe, it, expect, beforeAll } from "vitest";
import { explainSimulation, explainVulnerability, explainBudget } from "../explain";
import { getProfile } from "@/lib/twin";
import { simulateScenario } from "@/lib/scoring/scenario";
import { rankVulnerableZones } from "@/lib/scoring/vulnerability";
import { optimizeBudget } from "@/lib/scoring/budget";
import type { ProjectCandidate } from "@/types";

// Force the deterministic fallback path (no network).
beforeAll(() => {
  delete process.env.GEMINI_API_KEY;
});

const profile = getProfile();

describe("explainSimulation (fallback)", () => {
  it("produces prose that cites the before/after resilience numbers", async () => {
    const result = simulateScenario(profile, {
      intervention: "build_evacuation_center",
      targetZoneId: "Z01",
      rawText: "What if we build an evacuation center in riverside?",
    });
    const text = await explainSimulation(result, profile);
    expect(text).toContain(String(result.before.resilience));
    expect(text).toContain(String(result.after.resilience));
    expect(text.toLowerCase()).toContain("decision-support");
  });

  it("mentions the target zone name", async () => {
    const result = simulateScenario(profile, {
      intervention: "plant_trees",
      targetZoneId: "Z01",
      magnitude: 500,
      rawText: "plant 500 trees",
    });
    const text = await explainSimulation(result, profile);
    expect(text).toContain("Riverside");
  });
});

describe("explainVulnerability (fallback)", () => {
  it("summarizes the most vulnerable zone and returns recommendations", async () => {
    const ranked = rankVulnerableZones(profile);
    const out = await explainVulnerability(ranked);
    expect(out.summary).toContain(ranked[0].name);
    expect(out.recommendations.length).toBeGreaterThanOrEqual(3);
  });
});

describe("explainBudget (fallback)", () => {
  it("returns a summary and a rationale for every project", async () => {
    const projects: ProjectCandidate[] = [
      { id: "A", name: "Evac center", cost: 8_000_000, communityImpact: 85, urgency: 80, beneficiaries: 3200, maintenanceCostPerYear: 250_000, climateResilience: 70 },
      { id: "B", name: "Tree planting", cost: 150_000, communityImpact: 40, urgency: 30, beneficiaries: 1000, maintenanceCostPerYear: 50_000, climateResilience: 80 },
      { id: "C", name: "New hospital", cost: 25_000_000, communityImpact: 90, urgency: 70, beneficiaries: 5000, maintenanceCostPerYear: 1_200_000, climateResilience: 60 },
    ];
    const result = optimizeBudget(projects, 10_000_000);
    const out = await explainBudget(result);
    expect(out.summary.length).toBeGreaterThan(0);
    for (const p of projects) {
      expect(out.perProject[p.id]).toBeTruthy();
    }
  });
});
