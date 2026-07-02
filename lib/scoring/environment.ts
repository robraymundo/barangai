/**
 * Feature — Climate & Environmental Intelligence (deterministic core).
 *
 * Two responsibilities:
 *  1. `computeZoneLayers` — derive per-zone environmental layer values (flood, urban heat,
 *     drainage, green coverage, waste risk) from the existing ZoneIndicators. No new source
 *     data is required; every layer is a documented, reviewable function of fields already
 *     in data/indicators.json.
 *  2. `simulateEnvironment` — apply one or more interventions to a COPY of a zone's raw
 *     indicators using the coefficients below, then re-run the real resilience engine
 *     (scoreResilience) for a genuine before/after delta. Same purity guarantee as
 *     simulateScenario: same (profile, zoneId, interventions) → same result, every run.
 */

import type { BarangayProfile, ZoneIndicators } from "@/types";
import { scoreResilience } from "./resilience";
import { clamp, round0, round1 } from "./util";
import { ENV } from "./coefficients";

// ---------------------------------------------------------------------------
// Layers
// ---------------------------------------------------------------------------

/** Per-zone environmental layer values, all 0..1. For risk-style layers, higher = worse;
 *  for condition/coverage-style layers, higher = better (documented per field). */
export interface ZoneEnvLayers {
  zoneId: string;
  name: string;
  /** 0..1, higher = worse. Directly sourced from ZoneIndicators.floodExposure. */
  floodRisk: number;
  /** 0..1, higher = worse (hotter). Inverse of green cover with a paved/housing-density proxy. */
  urbanHeat: number;
  /** 0..1, higher = BETTER drained. Proxy from road access + inverse flood exposure. */
  drainageCondition: number;
  /** 0..1, higher = better. Directly sourced from ZoneIndicators.greenCoverFraction. */
  greenCoverage: number;
  /** 0..1, higher = worse. Proxy from population density-ish signal (households) and housing quality. */
  wasteRisk: number;
}

/** Derive all six map layers for every zone. Pure function of the current profile. */
export function computeZoneLayers(profile: BarangayProfile): ZoneEnvLayers[] {
  return profile.zones.map((z) => {
    const floodRisk = clamp(z.floodExposure, 0, 1);
    const urbanHeat = clamp(1 - z.greenCoverFraction * 0.8 - z.roadAccess * 0.05, 0, 1);
    const drainageCondition = clamp(0.55 * z.roadAccess + 0.45 * (1 - z.floodExposure), 0, 1);
    const greenCoverage = clamp(z.greenCoverFraction, 0, 1);
    // More households per unit housing quality ~ denser, less-serviced waste collection.
    const densitySignal = clamp(z.households / 1200, 0, 1);
    const wasteRisk = clamp(0.6 * densitySignal + 0.4 * (1 - z.housingQuality), 0, 1);
    return { zoneId: z.zoneId, name: z.name, floodRisk, urbanHeat, drainageCondition, greenCoverage, wasteRisk };
  });
}

export type EnvLayerKey = keyof Omit<ZoneEnvLayers, "zoneId" | "name">;

// ---------------------------------------------------------------------------
// Interventions
// ---------------------------------------------------------------------------

export type EnvIntervention =
  | "plant_trees"
  | "rain_gardens"
  | "permeable_pavements"
  | "drainage_upgrades"
  | "river_cleanup"
  | "green_spaces";

export interface EnvInterventionModel {
  label: string;
  defaultMagnitude: number;
  estimatedCapitalCost: number;
  maintenanceCostPerYear: number;
  /** Green-cover fraction added directly (independent of tree count), 0..1. */
  greenCoverAdded: number;
  /** Trees added (feeds carbon absorption via ENV.co2PerTreePerYearKg). */
  treesAdded: number;
  /** Direct improvement to zone.roadAccess-adjacent drainage proxy, 0..1. */
  drainageImprovement: number;
  /** Direct reduction to flood exposure, 0..1 points, independent of green-cover math. */
  directFloodReduction: number;
}

export const ENV_INTERVENTIONS: Record<EnvIntervention, EnvInterventionModel> = {
  plant_trees: {
    label: "Planting trees",
    defaultMagnitude: 500,
    estimatedCapitalCost: 150_000,
    maintenanceCostPerYear: 50_000,
    greenCoverAdded: 0,
    treesAdded: 500,
    drainageImprovement: 0,
    directFloodReduction: 0,
  },
  rain_gardens: {
    label: "Rain gardens",
    defaultMagnitude: 5,
    estimatedCapitalCost: 900_000,
    maintenanceCostPerYear: 60_000,
    greenCoverAdded: 0.03,
    treesAdded: 20,
    drainageImprovement: 0.06,
    directFloodReduction: 0.04,
  },
  permeable_pavements: {
    label: "Permeable pavements",
    defaultMagnitude: 1,
    estimatedCapitalCost: 2_200_000,
    maintenanceCostPerYear: 90_000,
    greenCoverAdded: 0,
    treesAdded: 0,
    drainageImprovement: 0.1,
    directFloodReduction: 0.07,
  },
  drainage_upgrades: {
    label: "Drainage upgrades",
    defaultMagnitude: 1,
    estimatedCapitalCost: 4_500_000,
    maintenanceCostPerYear: 180_000,
    greenCoverAdded: 0,
    treesAdded: 0,
    drainageImprovement: 0.18,
    directFloodReduction: 0.12,
  },
  river_cleanup: {
    label: "River cleanup",
    defaultMagnitude: 1,
    estimatedCapitalCost: 1_500_000,
    maintenanceCostPerYear: 220_000,
    greenCoverAdded: 0.01,
    treesAdded: 0,
    drainageImprovement: 0.08,
    directFloodReduction: 0.09,
  },
  green_spaces: {
    label: "Additional green spaces",
    defaultMagnitude: 1,
    estimatedCapitalCost: 3_000_000,
    maintenanceCostPerYear: 200_000,
    greenCoverAdded: 0.08,
    treesAdded: 120,
    drainageImprovement: 0.02,
    directFloodReduction: 0.02,
  },
};

export const ENV_INTERVENTION_LIST: Array<{ key: EnvIntervention; label: string }> = (
  Object.keys(ENV_INTERVENTIONS) as EnvIntervention[]
).map((key) => ({ key, label: ENV_INTERVENTIONS[key].label }));

// ---------------------------------------------------------------------------
// Simulation
// ---------------------------------------------------------------------------

export interface EnvSimulationDeltas {
  floodReductionPct: number; // percentage points off floodExposure
  urbanTempReductionC: number;
  carbonAbsorptionKgPerYear: number;
  drainageImprovementPct: number; // percentage points
  greenCoverageIncreasePct: number; // percentage points
  sustainabilityScore: number; // 0..100 composite, higher = better
  resilienceDelta: number; // signed change in the real barangay resilience score
  maintenanceCostPerYear: number;
  estimatedCapitalCost: number;
}

export interface EnvSimulationResult {
  zoneId: string;
  zoneName: string;
  interventions: EnvIntervention[];
  before: { resilience: number; sustainabilityScore: number; layers: ZoneEnvLayers };
  after: { resilience: number; sustainabilityScore: number; layers: ZoneEnvLayers };
  deltas: EnvSimulationDeltas;
}

function cloneProfile(profile: BarangayProfile): BarangayProfile {
  return {
    ...profile,
    zones: profile.zones.map((z) => ({ ...z })),
    facilities: profile.facilities.map((f) => ({ ...f })),
  };
}

function sustainabilityScore(l: ZoneEnvLayers): number {
  const composite =
    0.3 * l.greenCoverage + 0.25 * (1 - l.floodRisk) + 0.2 * l.drainageCondition + 0.15 * (1 - l.urbanHeat) + 0.1 * (1 - l.wasteRisk);
  return round1(clamp(composite, 0, 1) * 100);
}

function layersForZone(profile: BarangayProfile, zoneId: string): ZoneEnvLayers {
  const layers = computeZoneLayers(profile);
  return layers.find((l) => l.zoneId === zoneId) ?? layers[0];
}

/**
 * Simulate one or more interventions applied together to a single zone. Never mutates the
 * input profile. Resilience before/after comes from the real scoring engine (scoreResilience)
 * so the number shown here is exactly what will also move the app-wide Resilience Score.
 */
export function simulateEnvironment(
  profile: BarangayProfile,
  zoneId: string,
  interventions: EnvIntervention[],
  magnitudeOverride?: number,
): EnvSimulationResult {
  const beforeResilience = scoreResilience(profile).score;
  const beforeLayers = layersForZone(profile, zoneId);
  const beforeSustainability = sustainabilityScore(beforeLayers);

  const draft = cloneProfile(profile);
  const zone: ZoneIndicators = draft.zones.find((z) => z.zoneId === zoneId) ?? draft.zones[0];

  let treesAdded = 0;
  let greenCoverAdded = 0;
  let maintenanceCostPerYear = 0;
  let estimatedCapitalCost = 0;
  let directFloodReduction = 0;
  let drainageImprovementRaw = 0;

  const applied = interventions.length ? interventions : ["plant_trees" as EnvIntervention];

  for (const key of applied) {
    const m = ENV_INTERVENTIONS[key];
    const magnitude = key === "plant_trees" ? (magnitudeOverride ?? m.defaultMagnitude) : m.defaultMagnitude;
    const scale = key === "plant_trees" ? magnitude / m.defaultMagnitude : 1;
    treesAdded += m.treesAdded * scale;
    greenCoverAdded += m.greenCoverAdded;
    maintenanceCostPerYear += m.maintenanceCostPerYear;
    estimatedCapitalCost += m.estimatedCapitalCost;
    directFloodReduction += m.directFloodReduction;
    drainageImprovementRaw += m.drainageImprovement;
  }

  const coverFromTrees = (treesAdded * ENV.treeCanopyAreaM2) / ENV.nominalZoneAreaM2;
  const totalCoverDelta = coverFromTrees + greenCoverAdded;

  const beforeFlood = zone.floodExposure;
  zone.treeCount += Math.round(treesAdded);
  zone.greenCoverFraction = clamp(zone.greenCoverFraction + totalCoverDelta, 0, 1);
  zone.floodExposure = clamp(
    zone.floodExposure - ENV.floodExposureReductionPerGreenCoverUnit * totalCoverDelta - directFloodReduction,
    0,
    1,
  );
  // Drainage is modeled as a bump to road access (the proxy computeZoneLayers uses) — capped at 1.
  zone.roadAccess = clamp(zone.roadAccess + drainageImprovementRaw, 0, 1);

  const afterResilience = scoreResilience(draft).score;
  const afterLayers = layersForZone(draft, zoneId);
  const afterSustainability = sustainabilityScore(afterLayers);

  const deltas: EnvSimulationDeltas = {
    floodReductionPct: round1((beforeFlood - zone.floodExposure) * 100),
    urbanTempReductionC: round1(ENV.urbanHeatReductionCPerGreenCoverUnit * totalCoverDelta),
    carbonAbsorptionKgPerYear: round0(treesAdded * ENV.co2PerTreePerYearKg),
    drainageImprovementPct: round1((afterLayers.drainageCondition - beforeLayers.drainageCondition) * 100),
    greenCoverageIncreasePct: round1(totalCoverDelta * 100),
    sustainabilityScore: afterSustainability,
    resilienceDelta: round1(afterResilience - beforeResilience),
    maintenanceCostPerYear,
    estimatedCapitalCost,
  };

  return {
    zoneId: zone.zoneId,
    zoneName: zone.name,
    interventions: applied,
    before: { resilience: beforeResilience, sustainabilityScore: beforeSustainability, layers: beforeLayers },
    after: { resilience: afterResilience, sustainabilityScore: afterSustainability, layers: afterLayers },
    deltas,
  };
}
