import { describe, it, expect } from "vitest";
import { optimizeBudget, projectBenefit, DEFAULT_BUDGET_WEIGHTS } from "../budget";
import { TEST_PROJECTS } from "./fixtures";
import type { ProjectCandidate } from "@/types";

const [strong, weak] = TEST_PROJECTS;

describe("projectBenefit", () => {
  it("returns a value within 0..100", () => {
    const b = projectBenefit(strong);
    expect(b).toBeGreaterThanOrEqual(0);
    expect(b).toBeLessThanOrEqual(100);
  });

  it("rates a strictly-better project higher", () => {
    expect(projectBenefit(strong)).toBeGreaterThan(projectBenefit(weak));
  });

  it("default weights sum to 1", () => {
    const sum = Object.values(DEFAULT_BUDGET_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 6);
  });
});

describe("optimizeBudget", () => {
  it("never exceeds the budget", () => {
    const r = optimizeBudget(TEST_PROJECTS, 6_000_000);
    expect(r.totalCost).toBeLessThanOrEqual(r.budget);
  });

  it("picks the higher-benefit project when only one fits", () => {
    // Both fit individually (5M, 4M) but not together (9M) under a 5M budget.
    const r = optimizeBudget(TEST_PROJECTS, 5_000_000);
    expect(r.selected).toHaveLength(1);
    expect(r.selected[0].project.id).toBe("P1-strong");
    expect(r.rejected.map((x) => x.project.id)).toContain("P2-weak");
  });

  it("selects everything when the budget covers all projects", () => {
    const all = TEST_PROJECTS.reduce((s, p) => s + p.cost, 0);
    const r = optimizeBudget(TEST_PROJECTS, all);
    expect(r.selected).toHaveLength(TEST_PROJECTS.length);
    expect(r.rejected).toHaveLength(0);
  });

  it("rejects a project that alone exceeds the budget", () => {
    const r = optimizeBudget(TEST_PROJECTS, 1_000_000);
    expect(r.selected).toHaveLength(0);
    expect(r.rejected).toHaveLength(TEST_PROJECTS.length);
  });

  it("maximizes total benefit: B+C beats the single most expensive A", () => {
    const projects: ProjectCandidate[] = [
      { id: "A", name: "A", cost: 70_000, communityImpact: 80, urgency: 80, beneficiaries: 4000, maintenanceCostPerYear: 50_000, climateResilience: 80 },
      { id: "B", name: "B", cost: 60_000, communityImpact: 70, urgency: 70, beneficiaries: 3500, maintenanceCostPerYear: 50_000, climateResilience: 70 },
      { id: "C", name: "C", cost: 40_000, communityImpact: 65, urgency: 65, beneficiaries: 3000, maintenanceCostPerYear: 50_000, climateResilience: 65 },
    ];
    // Budget 100k: A alone, or B+C (=100k). The engine should choose whichever has higher total benefit.
    const r = optimizeBudget(projects, 100_000);
    const aOnly = projectBenefit(projects[0]);
    const bc = projectBenefit(projects[1]) + projectBenefit(projects[2]);
    const ids = r.selected.map((s) => s.project.id).sort();
    expect(r.totalBenefit).toBeCloseTo(Math.max(aOnly, bc), 1);
    expect(ids).toEqual(bc >= aOnly ? ["B", "C"] : ["A"]);
  });

  it("is deterministic", () => {
    expect(optimizeBudget(TEST_PROJECTS, 5_000_000)).toEqual(
      optimizeBudget(TEST_PROJECTS, 5_000_000),
    );
  });
});
