/**
 * parseScenario — natural-language "what-if" question → structured ScenarioParams.
 *
 * Gemini does STRUCTURE ONLY (intervention type, target zone, magnitude). It is explicitly
 * forbidden from producing impact numbers; those come from the deterministic engine. If
 * Gemini is unavailable or returns anything invalid, we fall back to the offline keyword
 * parser, so the simulator always works.
 */

import { Type, type Schema } from "@google/genai";
import type { InterventionType, ScenarioParams } from "@/types";
import { generateJson, isAiEnabled } from "./client";
import { ALL_INTERVENTIONS, keywordParse, type ZoneRef } from "./canned";

/** Raw, untrusted shape Gemini returns; validated before use. */
interface RawParse {
  intervention?: string;
  targetZoneId?: string;
  magnitude?: number;
}

const SCENARIO_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    intervention: {
      type: Type.STRING,
      enum: ALL_INTERVENTIONS,
      description: "The single best-matching intervention type for the question.",
    },
    targetZoneId: {
      type: Type.STRING,
      description: "zoneId of the affected zone, chosen from the provided list. Omit if unclear.",
    },
    magnitude: {
      type: Type.NUMBER,
      description: "Numeric quantity if stated (e.g. number of trees). Omit if none.",
    },
  },
  required: ["intervention"],
};

function systemInstruction(zones: ZoneRef[]): string {
  const zoneList = zones.map((z) => `${z.zoneId} = ${z.name}`).join("; ");
  return [
    "You convert a local-government official's natural-language 'what-if' question into a",
    "structured intervention for a barangay planning simulator.",
    "Rules:",
    "- Pick exactly one intervention type from the allowed enum.",
    "- If the question names or describes a specific area, set targetZoneId to the matching",
    `  zone from this list: ${zoneList || "(none provided)"}. Otherwise omit it.`,
    "- Set magnitude only if the question states a number (e.g. '500 trees' -> 500).",
    "- Do NOT estimate or invent any impact numbers (flood, carbon, cost, beneficiaries).",
    "  Output structure only. If the intent is unclear, use intervention 'custom'.",
  ].join(" ");
}

function isValidIntervention(value: unknown): value is InterventionType {
  return typeof value === "string" && (ALL_INTERVENTIONS as string[]).includes(value);
}

/** Validate/normalize Gemini's raw output into ScenarioParams, grounding the zone. */
function coerce(raw: RawParse, question: string, zones: ZoneRef[]): ScenarioParams | null {
  if (!isValidIntervention(raw.intervention)) return null;
  const params: ScenarioParams = { intervention: raw.intervention, rawText: question };

  if (raw.targetZoneId && zones.some((z) => z.zoneId === raw.targetZoneId)) {
    params.targetZoneId = raw.targetZoneId;
  }
  if (typeof raw.magnitude === "number" && Number.isFinite(raw.magnitude) && raw.magnitude > 0) {
    params.magnitude = raw.magnitude;
  }
  return params;
}

/**
 * Parse a what-if question. Uses Gemini structured output when available, otherwise the
 * deterministic keyword parser. `zones` (zoneId + name) ground zone references; pass the
 * barangay's zones so "the riverside purok" maps to the right zoneId.
 */
export async function parseScenario(
  question: string,
  zones: ZoneRef[] = [],
): Promise<ScenarioParams> {
  if (isAiEnabled()) {
    const raw = await generateJson<RawParse>(question, SCENARIO_SCHEMA, systemInstruction(zones));
    if (raw) {
      const coerced = coerce(raw, question, zones);
      if (coerced) return coerced;
    }
  }
  // No key, AI error, or invalid output -> offline keyword parser.
  return keywordParse(question, zones);
}
