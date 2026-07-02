/**
 * Explanation layer for the two new modules (Climate & Environmental Intelligence, Policy
 * Impact Simulator). Same contract as lib/ai/explain.ts: Gemini narrates ALREADY-COMPUTED
 * numbers, never invents them, and every function has a deterministic fallback so the
 * platform reads sensibly with no API key configured.
 */

import type { EnvSimulationResult } from "@/lib/scoring/environment";
import type { PolicySimulationResult } from "@/lib/scoring/policy";
import { generateText, isAiEnabled } from "./client";

const DECISION_SUPPORT_NOTE =
  "Frame results as decision-support estimates from a simplified model, not guarantees.";

function interventionLabel(key: string): string {
  return key.replace(/_/g, " ");
}

function environmentFacts(result: EnvSimulationResult): string {
  const d = result.deltas;
  const lines = [
    `Interventions: ${result.interventions.map(interventionLabel).join(", ")} in ${result.zoneName}.`,
    `Resilience score: ${result.before.resilience} -> ${result.after.resilience} (change ${d.resilienceDelta >= 0 ? "+" : ""}${d.resilienceDelta}).`,
    `Environmental sustainability score: ${result.before.sustainabilityScore} -> ${result.after.sustainabilityScore}.`,
    `Flood exposure reduced by ${d.floodReductionPct} percentage points.`,
    `Urban temperature reduced by about ${d.urbanTempReductionC} C.`,
    `Carbon absorption about ${d.carbonAbsorptionKgPerYear} kg/year.`,
    `Drainage condition improved by ${d.drainageImprovementPct} percentage points.`,
    `Green coverage increased by ${d.greenCoverageIncreasePct} percentage points.`,
  ];
  return lines.join("\n");
}

function environmentFallback(result: EnvSimulationResult): string {
  const d = result.deltas;
  const dir = d.resilienceDelta > 0 ? "improves" : d.resilienceDelta < 0 ? "slightly lowers" : "does not materially change";
  const parts = [
    `Applying ${result.interventions.map(interventionLabel).join(", ")} in ${result.zoneName} ${dir} the community resilience score, from ${result.before.resilience} to ${result.after.resilience}.`,
    `The environmental sustainability score moves from ${result.before.sustainabilityScore} to ${result.after.sustainabilityScore}, driven mainly by a ${d.greenCoverageIncreasePct}-percentage-point rise in green coverage and a ${d.floodReductionPct}-percentage-point drop in flood exposure.`,
  ];
  if (d.urbanTempReductionC > 0) parts.push(`Local temperatures are expected to cool by about ${d.urbanTempReductionC} C.`);
  if (d.carbonAbsorptionKgPerYear > 0) parts.push(`The added vegetation absorbs roughly ${d.carbonAbsorptionKgPerYear} kg of CO2 per year.`);
  if (d.drainageImprovementPct > 0) parts.push(`Drainage conditions improve by about ${d.drainageImprovementPct} percentage points, cutting nuisance flooding risk.`);
  parts.push(DECISION_SUPPORT_NOTE);
  return parts.join(" ");
}

export async function explainEnvironment(result: EnvSimulationResult): Promise<string> {
  if (isAiEnabled()) {
    const prompt = [
      "Explain this simulated barangay environmental intervention to a local-government",
      "official in 2-3 short paragraphs of clear, non-technical language. Use the exact",
      "numbers provided; do not change them or add new figures.",
      "",
      environmentFacts(result),
    ].join("\n");
    const text = await generateText(prompt, DECISION_SUPPORT_NOTE);
    if (text) return text;
  }
  return environmentFallback(result);
}

function policyFacts(result: PolicySimulationResult): string {
  const m = result.metrics;
  const lines = [
    `Policy: ${result.typeLabel} — "${result.rawText}" — applied to ${result.zoneName}.`,
    `Resilience score: ${result.before.resilience} -> ${result.after.resilience} (change ${result.resilienceDelta >= 0 ? "+" : ""}${result.resilienceDelta}).`,
    `Traffic congestion change: ${m.trafficCongestionPct}%.`,
    `Travel time change: ${m.travelTimeMin} minutes.`,
    `Air pollution change: ${m.airPollutionPct}%.`,
    `Public accessibility change: ${m.accessibilityPct}%.`,
    `Emergency response time change: ${m.emergencyResponseMin} minutes.`,
    `Business activity change: ${m.businessActivityPct}%.`,
    `Community satisfaction change: ${m.communitySatisfactionPct}%.`,
    `Estimated beneficiaries: ${m.estimatedBeneficiaries}.`,
  ];
  return lines.join("\n");
}

function policyFallback(result: PolicySimulationResult): string {
  const m = result.metrics;
  const parts: string[] = [];
  const congestionWord = m.trafficCongestionPct < 0 ? "reduces" : m.trafficCongestionPct > 0 ? "increases" : "leaves unchanged";
  parts.push(
    `Based on the simulation, ${result.typeLabel.toLowerCase()} ${congestionWord} traffic congestion by approximately ${Math.abs(m.trafficCongestionPct)}%, changes emergency response time by about ${Math.abs(m.emergencyResponseMin)} minute(s), and shifts public accessibility by ${m.accessibilityPct >= 0 ? "+" : ""}${m.accessibilityPct}%.`,
  );
  parts.push(
    `Business activity is projected to change by ${m.businessActivityPct >= 0 ? "+" : ""}${m.businessActivityPct}%, with community satisfaction moving by ${m.communitySatisfactionPct >= 0 ? "+" : ""}${m.communitySatisfactionPct}%, reaching an estimated ${m.estimatedBeneficiaries.toLocaleString("en-PH")} residents in ${result.zoneName}.`,
  );
  parts.push(DECISION_SUPPORT_NOTE);
  return parts.join(" ");
}

export async function explainPolicy(result: PolicySimulationResult): Promise<string> {
  if (isAiEnabled()) {
    const prompt = [
      "Explain this simulated barangay policy change to a local-government official in 2-3",
      "short paragraphs of clear, non-technical language, in the tone of a policy briefing.",
      "Use the exact numbers provided; do not change them or add new figures.",
      "",
      policyFacts(result),
    ].join("\n");
    const text = await generateText(prompt, DECISION_SUPPORT_NOTE);
    if (text) return text;
  }
  return policyFallback(result);
}
