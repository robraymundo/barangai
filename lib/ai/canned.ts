/**
 * Demo fallbacks + deterministic keyword parser.
 *
 * Two jobs, both fully offline (no Gemini needed):
 *  1. `keywordParse` — a rule-based NL → ScenarioParams parser used when Gemini is
 *     unavailable or returns something invalid. Keeps the simulator working with no key.
 *  2. `CANNED_RESPONSES` / `matchCanned` — pre-written params + qualitative narrative for
 *     the rehearsed PRD demo questions, guaranteeing a smooth, fast presentation. The
 *     numeric impacts always come from the deterministic engine; canned prose is
 *     intentionally qualitative so it can never contradict the computed numbers.
 */

import type { CannedResponse, InterventionType, ScenarioParams } from "@/types";

export interface ZoneRef {
  zoneId: string;
  name: string;
}

export const ALL_INTERVENTIONS: InterventionType[] = [
  "build_evacuation_center",
  "build_park",
  "plant_trees",
  "road_oneway",
  "divert_traffic",
  "build_hospital",
  "build_road",
  "custom",
];

/** Lowercase, strip punctuation, collapse whitespace — stable key for canned lookups. */
export function normalizeQuestion(q: string): string {
  return q
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Detect the intervention type from keywords (most specific first). */
export function detectIntervention(question: string): InterventionType {
  const q = normalizeQuestion(question);
  if (/\bevacuation\b|\bevac\b/.test(q)) return "build_evacuation_center";
  if (/\bhospital\b|\bhealth (center|centre|station)\b|\bclinic\b/.test(q)) return "build_hospital";
  if (/\bpark\b/.test(q)) return "build_park";
  if (/\btree(s)?\b|\bplant\b|\bgreen\b/.test(q)) return "plant_trees";
  if (/\bone[\s-]?way\b/.test(q)) return "road_oneway";
  if (/\bdivert(ed|s)?\b|\breroute(d)?\b|\bredirect\b/.test(q)) return "divert_traffic";
  if (/\broad\b|\bpave\b|\bwiden\b|\bhighway\b|\bstreet\b/.test(q)) return "build_road";
  return "custom";
}

/** Extract the first integer mentioned (e.g. "plant 500 trees" → 500). */
export function extractMagnitude(question: string): number | undefined {
  const m = normalizeQuestion(question).match(/\b(\d{1,7})\b/);
  return m ? Number(m[1]) : undefined;
}

/** Words too generic to identify a zone by name. */
const STOPWORDS = new Set(["purok", "sitio", "barangay", "the", "of", "and", "zone"]);

/** Map a question to a zoneId by matching distinctive words of each zone's name. */
export function findZone(question: string, zones: ZoneRef[]): string | undefined {
  const q = normalizeQuestion(question);
  // Direct zoneId mention (e.g. "z01").
  for (const z of zones) {
    if (new RegExp(`\\b${z.zoneId.toLowerCase()}\\b`).test(q)) return z.zoneId;
  }
  // Distinctive name-word match (e.g. "riverside", "centro").
  for (const z of zones) {
    const words = normalizeQuestion(z.name)
      .split(" ")
      .filter((w) => w.length > 2 && !STOPWORDS.has(w) && !/^\d+$/.test(w));
    if (words.some((w) => new RegExp(`\\b${w}\\b`).test(q))) return z.zoneId;
  }
  return undefined;
}

/** Rule-based NL → ScenarioParams. Always returns a usable result (never throws). */
export function keywordParse(question: string, zones: ZoneRef[] = []): ScenarioParams {
  const intervention = detectIntervention(question);
  const params: ScenarioParams = { intervention, rawText: question };
  const zoneId = findZone(question, zones);
  if (zoneId) params.targetZoneId = zoneId;
  const magnitude = extractMagnitude(question);
  if (magnitude !== undefined) params.magnitude = magnitude;
  return params;
}

/**
 * Pre-written responses for the rehearsed PRD demo questions. Keyed by normalizeQuestion().
 * targetZoneId points at Alibagu zones that make the effect vivid (e.g. Riverside for an
 * evacuation center). Explanations are qualitative; the route fills in the real numbers.
 */
export const CANNED_RESPONSES: Record<string, CannedResponse> = {
  [normalizeQuestion("What if we build a new evacuation center here?")]: {
    params: {
      intervention: "build_evacuation_center",
      targetZoneId: "Z01",
      rawText: "What if we build a new evacuation center here?",
    },
    explanation:
      "Adding an evacuation center in Purok 1 - Riverside, the barangay's most flood-exposed and least-served zone, shortens evacuation distance dramatically. That lifts the disaster-preparedness and emergency-response components, raising the overall resilience score. Because Riverside has the largest share of vulnerable residents, the per-peso benefit here is among the highest of any siting choice.",
  },
  [normalizeQuestion("What if this road becomes one-way?")]: {
    params: {
      intervention: "road_oneway",
      targetZoneId: "Z03",
      rawText: "What if this road becomes one-way?",
    },
    explanation:
      "Converting the Purok 3 - Highway segment to one-way is a low-cost policy change that eases local congestion, with a small co-benefit from reduced idling emissions. It does not require capital works, only signage and enforcement, so it is a fast intervention to pilot.",
  },
  [normalizeQuestion("What if we plant 500 trees?")]: {
    params: {
      intervention: "plant_trees",
      targetZoneId: "Z01",
      magnitude: 500,
      rawText: "What if we plant 500 trees?",
    },
    explanation:
      "Planting 500 trees in low-canopy Riverside increases green cover, which sequesters carbon each year, modestly cools the local microclimate, and improves stormwater absorption that lowers flood exposure. It is the cheapest intervention, though benefits accrue gradually as the trees mature.",
  },
  [normalizeQuestion("What if this vacant lot becomes a public park?")]: {
    params: {
      intervention: "build_park",
      targetZoneId: "Z03",
      rawText: "What if this vacant lot becomes a public park?",
    },
    explanation:
      "Turning a vacant lot in Purok 3 - Highway into a public park adds a block of green cover plus new trees, delivering combined cooling, carbon, and flood-absorption benefits, along with a community gathering and emergency-staging space. It is a mid-cost intervention with broad quality-of-life value.",
  },
  [normalizeQuestion("What if motorcycles are diverted from this road?")]: {
    params: {
      intervention: "divert_traffic",
      targetZoneId: "Z03",
      rawText: "What if motorcycles are diverted from this road?",
    },
    explanation:
      "Diverting motorcycles from the Purok 3 - Highway segment meaningfully reduces local traffic load on that corridor, improving safety and flow, with a small emissions co-benefit. As a policy measure it carries no capital cost — only signage and enforcement.",
  },
};

/** Return a canned response if the question matches a rehearsed demo prompt. */
export function matchCanned(question: string): CannedResponse | undefined {
  return CANNED_RESPONSES[normalizeQuestion(question)];
}
