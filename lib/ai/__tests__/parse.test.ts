import { describe, it, expect, beforeAll } from "vitest";
import {
  detectIntervention,
  extractMagnitude,
  findZone,
  keywordParse,
  matchCanned,
  normalizeQuestion,
} from "../canned";
import { parseScenario } from "../parse";
import { getProfile } from "@/lib/twin";

// Ensure the offline (no-key) path so tests never hit the network.
beforeAll(() => {
  delete process.env.GEMINI_API_KEY;
});

const zones = getProfile().zones.map((z) => ({ zoneId: z.zoneId, name: z.name }));

describe("detectIntervention", () => {
  it.each([
    ["What if we build a new evacuation center here?", "build_evacuation_center"],
    ["What if this road becomes one-way?", "road_oneway"],
    ["What if we plant 500 trees?", "plant_trees"],
    ["What if this vacant lot becomes a public park?", "build_park"],
    ["What if motorcycles are diverted from this road?", "divert_traffic"],
    ["What if we build a new health center?", "build_hospital"],
  ])("maps %j -> %s", (q, expected) => {
    expect(detectIntervention(q)).toBe(expected);
  });

  it("falls back to custom for unrelated input", () => {
    expect(detectIntervention("What is the weather today?")).toBe("custom");
  });
});

describe("extractMagnitude", () => {
  it("pulls the first integer", () => {
    expect(extractMagnitude("What if we plant 500 trees?")).toBe(500);
  });
  it("returns undefined when none present", () => {
    expect(extractMagnitude("What if we build a park?")).toBeUndefined();
  });
});

describe("findZone", () => {
  it("matches a distinctive zone name word", () => {
    expect(findZone("build an evacuation center in the riverside purok", zones)).toBe("Z01");
  });
  it("matches an explicit zoneId", () => {
    expect(findZone("improve roads in Z03", zones)).toBe("Z03");
  });
  it("returns undefined when no zone is referenced", () => {
    expect(findZone("build a park somewhere", zones)).toBeUndefined();
  });
});

describe("keywordParse", () => {
  it("combines intervention, magnitude, and zone", () => {
    const p = keywordParse("What if we plant 500 trees in the riverside purok?", zones);
    expect(p.intervention).toBe("plant_trees");
    expect(p.magnitude).toBe(500);
    expect(p.targetZoneId).toBe("Z01");
    expect(p.rawText).toContain("plant 500 trees");
  });
});

describe("parseScenario (offline fallback)", () => {
  it("returns the keyword-parsed result when no API key is set", async () => {
    const p = await parseScenario("What if we build an evacuation center in centro?", zones);
    expect(p.intervention).toBe("build_evacuation_center");
    expect(p.targetZoneId).toBe("Z02");
  });
});

describe("matchCanned", () => {
  it("matches a rehearsed demo question regardless of punctuation/case", () => {
    const hit = matchCanned("WHAT IF WE PLANT 500 TREES???");
    expect(hit?.params.intervention).toBe("plant_trees");
    expect(hit?.params.magnitude).toBe(500);
  });
  it("returns undefined for non-demo questions", () => {
    expect(matchCanned("What if we widen the bridge?")).toBeUndefined();
  });
});

describe("normalizeQuestion", () => {
  it("lowercases, strips punctuation, collapses whitespace", () => {
    expect(normalizeQuestion("  What  IF, this road?? ")).toBe("what if this road");
  });
});
