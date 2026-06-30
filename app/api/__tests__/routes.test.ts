import { describe, it, expect, beforeAll } from "vitest";
import { GET as twinGET } from "../twin/route";
import { GET as resilienceGET } from "../resilience/route";
import { POST as vulnPOST } from "../vulnerability/route";
import { POST as budgetPOST } from "../budget/route";
import { POST as simulatePOST } from "../simulate/route";

// Routes run offline (deterministic fallbacks) so tests never hit the network.
beforeAll(() => {
  delete process.env.GEMINI_API_KEY;
});

function post(url: string, body: unknown): Request {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/twin", () => {
  it("returns the profile and geojson", async () => {
    const res = twinGET();
    const json = await res.json();
    expect(json.profile.id).toBe("brgy-alibagu");
    expect(json.geojson.type).toBe("FeatureCollection");
    expect(json.geojson.features.length).toBe(json.profile.zones.length);
  });
});

describe("GET /api/resilience", () => {
  it("returns a breakdown and six components", async () => {
    const res = resilienceGET();
    const json = await res.json();
    expect(json.breakdown.score).toBeGreaterThanOrEqual(0);
    expect(json.breakdown.score).toBeLessThanOrEqual(100);
    expect(Object.keys(json.components)).toHaveLength(6);
  });
});

describe("POST /api/vulnerability", () => {
  it("returns ranked zones with summary and recommendations", async () => {
    const res = await vulnPOST();
    const json = await res.json();
    expect(json.ranked[0].zoneId).toBeTruthy();
    expect(json.recommendations.length).toBeGreaterThan(0);
    // Most-vulnerable first.
    expect(json.ranked[0].breakdown.score).toBeGreaterThanOrEqual(
      json.ranked[json.ranked.length - 1].breakdown.score,
    );
  });
});

describe("POST /api/budget", () => {
  const projects = [
    { id: "A", name: "Evac center", cost: 8_000_000, communityImpact: 85, urgency: 80, beneficiaries: 3200, maintenanceCostPerYear: 250_000, climateResilience: 70 },
    { id: "B", name: "Trees", cost: 150_000, communityImpact: 40, urgency: 30, beneficiaries: 1000, maintenanceCostPerYear: 50_000, climateResilience: 80 },
  ];

  it("optimizes within budget and explains each project", async () => {
    const res = await budgetPOST(post("http://localhost/api/budget", { budget: 9_000_000, projects }));
    const json = await res.json();
    expect(json.result.totalCost).toBeLessThanOrEqual(9_000_000);
    expect(json.summary).toBeTruthy();
    for (const p of projects) expect(json.perProject[p.id]).toBeTruthy();
  });

  it("rejects an invalid body with 400", async () => {
    const res = await budgetPOST(post("http://localhost/api/budget", { budget: -5, projects: [] }));
    expect(res.status).toBe(400);
  });
});

describe("POST /api/simulate", () => {
  it("uses canned params + narrative for a rehearsed demo question", async () => {
    const res = await simulatePOST(post("http://localhost/api/simulate", { question: "What if we plant 500 trees?" }));
    const json = await res.json();
    expect(json.params.intervention).toBe("plant_trees");
    expect(json.params.magnitude).toBe(500);
    expect(json.result.deltas.carbonAbsorptionKgPerYear).toBeGreaterThan(0);
    expect(typeof json.explanation).toBe("string");
  });

  it("parses an ad-hoc question via the keyword fallback", async () => {
    const res = await simulatePOST(
      post("http://localhost/api/simulate", { question: "What if we build an evacuation center in riverside?" }),
    );
    const json = await res.json();
    expect(json.params.intervention).toBe("build_evacuation_center");
    expect(json.params.targetZoneId).toBe("Z01");
    expect(json.result.after.resilience).toBeGreaterThan(json.result.before.resilience);
  });

  it("rejects an empty question with 400", async () => {
    const res = await simulatePOST(post("http://localhost/api/simulate", { question: "  " }));
    expect(res.status).toBe(400);
  });
});
