/**
 * Feature 4 — Community Resilience Score (deterministic).
 *
 * Composite 0..100 where HIGHER = BETTER prepared. Six PRD sub-indicators are each derived
 * per zone (0..1), aggregated population-weighted across the barangay, scaled to 0..100,
 * then combined with the component weights. This is the score that moves "62 → 78" when a
 * scenario is simulated.
 */

import type {
  BarangayProfile,
  ResilienceComponents,
  ResilienceResult,
  ResilienceWeights,
  ScoreFactor,
  ZoneIndicators,
} from "@/types";
import {
  assertWeightsSumToOne,
  clamp,
  normalize,
  round1,
  toScore,
  weightedMean,
} from "./util";

/** Component weights for the composite (sum to 1). */
export const DEFAULT_RESILIENCE_WEIGHTS: ResilienceWeights = {
  disasterPreparedness: 0.22,
  healthcareAccess: 0.18,
  infrastructureQuality: 0.18,
  environmentalSustainability: 0.14,
  transportAccess: 0.13,
  emergencyResponse: 0.15,
};

const REF = {
  evacKm: [0, 6],
  hospitalKm: [0, 10],
  greenCover: [0, 0.6],
  treeCount: [0, 3000],
} as const;

const COMPONENT_LABELS: Record<keyof ResilienceComponents, string> = {
  disasterPreparedness: "Disaster preparedness",
  healthcareAccess: "Healthcare accessibility",
  infrastructureQuality: "Infrastructure quality",
  environmentalSustainability: "Environmental sustainability",
  transportAccess: "Transportation accessibility",
  emergencyResponse: "Emergency response capability",
};

/** Per-zone component values, each 0..1 (higher = better). */
function zoneComponents(zone: ZoneIndicators): ResilienceComponents {
  const evacCloseness = 1 - normalize(zone.distanceToEvacCenterKm, REF.evacKm[0], REF.evacKm[1]);
  const hospitalCloseness =
    1 - normalize(zone.distanceToHospitalKm, REF.hospitalKm[0], REF.hospitalKm[1]);
  const greenNorm = normalize(zone.greenCoverFraction, REF.greenCover[0], REF.greenCover[1]);
  const treeNorm = normalize(zone.treeCount, REF.treeCount[0], REF.treeCount[1]);
  const road = clamp(zone.roadAccess, 0, 1);
  const housing = clamp(zone.housingQuality, 0, 1);

  return {
    disasterPreparedness:
      0.4 * (1 - clamp(zone.floodExposure, 0, 1)) +
      0.2 * (1 - clamp(zone.landslideExposure, 0, 1)) +
      0.4 * evacCloseness,
    healthcareAccess: hospitalCloseness,
    infrastructureQuality: 0.5 * housing + 0.5 * road,
    environmentalSustainability: 0.7 * greenNorm + 0.3 * treeNorm,
    transportAccess: 0.7 * road + 0.3 * hospitalCloseness,
    emergencyResponse: 0.6 * evacCloseness + 0.4 * road,
  };
}

/** Population-weighted barangay-level components (each 0..1). */
function aggregateComponents(profile: BarangayProfile): ResilienceComponents {
  const weights = profile.zones.map((z) => z.population);
  const per = profile.zones.map(zoneComponents);
  const pick = (k: keyof ResilienceComponents) =>
    weightedMean(per.map((c) => c[k]), weights);

  return {
    disasterPreparedness: pick("disasterPreparedness"),
    healthcareAccess: pick("healthcareAccess"),
    infrastructureQuality: pick("infrastructureQuality"),
    environmentalSustainability: pick("environmentalSustainability"),
    transportAccess: pick("transportAccess"),
    emergencyResponse: pick("emergencyResponse"),
  };
}

/**
 * Compute the barangay resilience score (0..100, higher = better) with its six-component
 * breakdown. Returns components already scaled to 0..100 for direct display.
 */
export function scoreResilience(
  profile: BarangayProfile,
  weights: ResilienceWeights = DEFAULT_RESILIENCE_WEIGHTS,
): ResilienceResult {
  assertWeightsSumToOne(weights, "resilience");

  const agg = aggregateComponents(profile); // 0..1 each
  const keys = Object.keys(weights) as Array<keyof ResilienceComponents>;

  const factors: ScoreFactor[] = keys.map((k) => ({
    key: k,
    label: COMPONENT_LABELS[k],
    rawValue: toScore(agg[k]),
    weight: weights[k],
    contribution: round1(weights[k] * agg[k] * 100),
  }));

  const score = round1(factors.reduce((sum, f) => sum + f.contribution, 0));
  const components: ResilienceComponents = {
    disasterPreparedness: toScore(agg.disasterPreparedness),
    healthcareAccess: toScore(agg.healthcareAccess),
    infrastructureQuality: toScore(agg.infrastructureQuality),
    environmentalSustainability: toScore(agg.environmentalSustainability),
    transportAccess: toScore(agg.transportAccess),
    emergencyResponse: toScore(agg.emergencyResponse),
  };

  factors.sort((a, b) => b.contribution - a.contribution);
  return { score, factors, components };
}
