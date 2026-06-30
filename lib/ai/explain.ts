/**
 * Explanation layer — turns ALREADY-COMPUTED numbers into plain-language narrative.
 *
 * Gemini is told to explain, never to alter, the numbers it is given. Every function has a
 * deterministic fallback that builds an accurate explanation directly from the engine
 * output, so the platform produces sensible prose even with no API key.
 */

import type {
  BarangayProfile,
  BudgetExplanation,
  BudgetResult,
  RankedZone,
  SimulationResult,
  VulnerabilityExplanation,
} from "@/types";
import { Type, type Schema } from "@google/genai";
import { generateJson, generateText, isAiEnabled } from "./client";

const DECISION_SUPPORT_NOTE =
  "Frame results as decision-support estimates from a simplified model, not guarantees.";

function zoneName(profile: BarangayProfile, zoneId?: string): string {
  return profile.zones.find((z) => z.zoneId === zoneId)?.name ?? "the selected area";
}

function php(n: number): string {
  return `PHP ${Math.round(n).toLocaleString("en-PH")}`;
}

// ---------------------------------------------------------------------------
// Feature 1 — scenario explanation (free text)
// ---------------------------------------------------------------------------

/** Compact, factual description of the computed deltas — the ground truth for the prose. */
function simulationFacts(result: SimulationResult, profile: BarangayProfile): string {
  const d = result.deltas;
  const lines = [
    `Intervention: ${result.appliedTo.intervention} in ${zoneName(profile, result.appliedTo.targetZoneId)}.`,
    `Resilience score: ${result.before.resilience} -> ${result.after.resilience} (change ${d.resilience >= 0 ? "+" : ""}${d.resilience}).`,
  ];
  if (d.floodReduction != null) lines.push(`Flood exposure reduced by ${d.floodReduction} percentage points.`);
  if (d.urbanHeatReductionC != null) lines.push(`Local cooling about ${d.urbanHeatReductionC} C.`);
  if (d.carbonAbsorptionKgPerYear != null) lines.push(`Carbon absorption about ${d.carbonAbsorptionKgPerYear} kg/year.`);
  if (d.trafficChange != null) lines.push(`Local traffic load change ${d.trafficChange}%.`);
  if (d.estimatedBeneficiaries != null) lines.push(`Estimated beneficiaries: ${d.estimatedBeneficiaries}.`);
  if (d.maintenanceCostPerYear != null) lines.push(`Maintenance cost about ${php(d.maintenanceCostPerYear)}/year.`);
  return lines.join("\n");
}

function simulationFallback(result: SimulationResult, profile: BarangayProfile): string {
  const d = result.deltas;
  const dir = d.resilience > 0 ? "improves" : d.resilience < 0 ? "lowers" : "does not materially change";
  const parts = [
    `Simulating this change in ${zoneName(profile, result.appliedTo.targetZoneId)} ${dir} the community resilience score, from ${result.before.resilience} to ${result.after.resilience}.`,
  ];
  const effects: string[] = [];
  if (d.floodReduction) effects.push(`flood exposure drops by ${d.floodReduction} percentage points`);
  if (d.urbanHeatReductionC) effects.push(`the area cools by about ${d.urbanHeatReductionC} C`);
  if (d.carbonAbsorptionKgPerYear) effects.push(`roughly ${d.carbonAbsorptionKgPerYear} kg of CO2 is absorbed per year`);
  if (d.trafficChange) effects.push(`local traffic load changes by ${d.trafficChange}%`);
  if (effects.length) parts.push(`Expected effects: ${effects.join(", ")}.`);
  if (d.estimatedBeneficiaries) parts.push(`About ${d.estimatedBeneficiaries} residents would benefit` + (d.maintenanceCostPerYear ? `, at an estimated ${php(d.maintenanceCostPerYear)} per year in maintenance.` : "."));
  parts.push("These are decision-support estimates from a simplified model, not guarantees.");
  return parts.join(" ");
}

export async function explainSimulation(
  result: SimulationResult,
  profile: BarangayProfile,
): Promise<string> {
  if (isAiEnabled()) {
    const prompt = [
      "Explain this simulated barangay scenario to a local-government official in 2-3 short",
      "paragraphs of clear, non-technical language. Use the exact numbers provided; do not",
      "change them or add new figures.",
      "",
      simulationFacts(result, profile),
    ].join("\n");
    const text = await generateText(prompt, DECISION_SUPPORT_NOTE);
    if (text) return text;
  }
  return simulationFallback(result, profile);
}

// ---------------------------------------------------------------------------
// Feature 2 — vulnerability explanation (structured)
// ---------------------------------------------------------------------------

const VULN_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ["summary", "recommendations"],
};

function vulnerabilityFallback(ranked: RankedZone[]): VulnerabilityExplanation {
  const top = ranked[0];
  const topNames = ranked.slice(0, 3).map((r) => `${r.name} (${r.breakdown.score})`).join(", ");
  const drivers = top?.breakdown.factors.slice(0, 3).map((f) => f.label.toLowerCase()) ?? [];
  return {
    summary: top
      ? `The most vulnerable zones are ${topNames}. ${top.name} ranks highest, driven mainly by ${drivers.join(", ")}. These figures are decision-support estimates from a simplified model.`
      : "No zones available to assess.",
    recommendations: [
      top ? `Prioritize ${top.name} for emergency response planning and pre-positioned resources.` : "",
      "Designate priority evacuation areas and verify accessible routes for elderly, children, and PWDs.",
      "Target social services and infrastructure upgrades (housing, road access, health outreach) to the highest-scoring zones.",
    ].filter(Boolean),
  };
}

export async function explainVulnerability(ranked: RankedZone[]): Promise<VulnerabilityExplanation> {
  if (isAiEnabled()) {
    const facts = ranked
      .map((r) => `${r.name} (${r.zoneId}): score ${r.breakdown.score}; top factors ${r.breakdown.factors.slice(0, 3).map((f) => f.label).join(", ")}`)
      .join("\n");
    const prompt = [
      "Given these computed zone vulnerability scores (higher = more vulnerable), write a",
      "short summary and 3-5 concrete recommendations (priority evacuation areas, infrastructure,",
      "and social services). Use the scores as given; do not invent new numbers.",
      "",
      facts,
    ].join("\n");
    const out = await generateJson<VulnerabilityExplanation>(prompt, VULN_SCHEMA, DECISION_SUPPORT_NOTE);
    if (out && typeof out.summary === "string" && Array.isArray(out.recommendations)) return out;
  }
  return vulnerabilityFallback(ranked);
}

// ---------------------------------------------------------------------------
// Feature 3 — budget explanation (structured)
// ---------------------------------------------------------------------------

const BUDGET_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    projects: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          projectId: { type: Type.STRING },
          rationale: { type: Type.STRING },
        },
        required: ["projectId", "rationale"],
      },
    },
  },
  required: ["summary", "projects"],
};

interface RawBudgetExplanation {
  summary?: string;
  projects?: Array<{ projectId?: string; rationale?: string }>;
}

function budgetFallback(result: BudgetResult): BudgetExplanation {
  const perProject: Record<string, string> = {};
  for (const s of result.selected) {
    perProject[s.project.id] = `Selected: benefit score ${s.benefit} at ${php(s.project.cost)} (priority ${s.priorityScore}). Strong value for the budget.`;
  }
  for (const r of result.rejected) {
    perProject[r.project.id] = `Not funded under the ${php(result.budget)} budget: benefit score ${r.benefit} did not fit once higher-value projects were selected.`;
  }
  return {
    summary: `Within the ${php(result.budget)} budget, ${result.selected.length} project(s) were selected for ${php(result.totalCost)}, maximizing total community benefit (${result.totalBenefit}). Rankings weigh impact, urgency, beneficiaries, cost-efficiency, maintenance, and climate resilience. Decision-support estimates from a simplified model.`,
    perProject,
  };
}

export async function explainBudget(result: BudgetResult): Promise<BudgetExplanation> {
  if (isAiEnabled()) {
    const facts = [
      `Budget: ${php(result.budget)}. Selected cost: ${php(result.totalCost)}. Total benefit: ${result.totalBenefit}.`,
      "Selected:",
      ...result.selected.map((s) => `  ${s.project.id} "${s.project.name}": benefit ${s.benefit}, cost ${php(s.project.cost)}, priority ${s.priorityScore}`),
      "Rejected (did not fit budget):",
      ...result.rejected.map((r) => `  ${r.project.id} "${r.project.name}": benefit ${r.benefit}, cost ${php(r.project.cost)}`),
    ].join("\n");
    const prompt = [
      "Given this computed budget-optimization result, write a short overall summary and a",
      "one-line rationale per project (selected and rejected). Use the numbers as given.",
      "",
      facts,
    ].join("\n");
    const raw = await generateJson<RawBudgetExplanation>(prompt, BUDGET_SCHEMA, DECISION_SUPPORT_NOTE);
    if (raw && typeof raw.summary === "string" && Array.isArray(raw.projects)) {
      const perProject: Record<string, string> = {};
      for (const p of raw.projects) {
        if (p.projectId && p.rationale) perProject[p.projectId] = p.rationale;
      }
      // Ensure every project has a rationale; backfill from the fallback if the model missed any.
      const fb = budgetFallback(result);
      for (const id of Object.keys(fb.perProject)) {
        if (!perProject[id]) perProject[id] = fb.perProject[id];
      }
      return { summary: raw.summary, perProject };
    }
  }
  return budgetFallback(result);
}
