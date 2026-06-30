/**
 * Feature 1 — AI Scenario Simulator (deterministic core).
 *
 * Takes a parsed, machine-readable scenario (produced by lib/ai with NO numbers), applies
 * intervention effects to a COPY of the barangay's raw indicators using the reviewable
 * coefficients in coefficients.ts, then re-runs the deterministic scoring engine. The
 * before/after diff (e.g. resilience 62 → 78) and the PRD Feature-1 outputs are returned.
 *
 * Purity guarantee: same (profile, params) → same SimulationResult, every run. This is what
 * satisfies PRD §8 "consistent AI outputs for predefined demo scenarios."
 */

import type {
  BarangayProfile,
  ScenarioParams,
  SimulationDeltas,
  SimulationResult,
  ZoneIndicators,
} from "@/types";
import { ENV, INTERVENTIONS } from "./coefficients";
import { scoreResilience } from "./resilience";
import { scoreVulnerability } from "./vulnerability";
import { clamp, round0, round1 } from "./util";

/** Deep-clone a profile so simulation never mutates the source twin. */
function cloneProfile(profile: BarangayProfile): BarangayProfile {
  return {
    ...profile,
    zones: profile.zones.map((z) => ({ ...z })),
    facilities: profile.facilities.map((f) => ({ ...f })),
  };
}

/** Resolve the target zone: explicit zoneId, else nearest facility/centroid fallback to first zone. */
function resolveZone(profile: BarangayProfile, params: ScenarioParams): ZoneIndicators {
  if (params.targetZoneId) {
    const z = profile.zones.find((z) => z.zoneId === params.targetZoneId);
    if (z) return z;
  }
  // Without an explicit target we apply to the most-populous zone (broadest demo impact).
  return profile.zones.reduce((a, b) => (b.population > a.population ? b : a));
}

/** Snapshot vulnerability per zone (zoneId -> score) for before/after comparison. */
function vulnerabilitySnapshot(profile: BarangayProfile): Record<string, number> {
  const out: Record<string, number> = {};
  for (const z of profile.zones) out[z.zoneId] = scoreVulnerability(z).score;
  return out;
}

/**
 * Apply green-cover-driven effects (shared by plant_trees and build_park): updates the
 * zone in place and returns the environmental deltas (carbon, flood, heat).
 */
function applyGreenCover(
  zone: ZoneIndicators,
  treesAdded: number,
  extraCoverFraction: number,
): Pick<SimulationDeltas, "carbonAbsorptionKgPerYear" | "floodReduction" | "urbanHeatReductionC"> {
  const coverFromTrees = (treesAdded * ENV.treeCanopyAreaM2) / ENV.nominalZoneAreaM2;
  const coverDelta = coverFromTrees + extraCoverFraction;

  const beforeFlood = zone.floodExposure;
  zone.treeCount += treesAdded;
  zone.greenCoverFraction = clamp(zone.greenCoverFraction + coverDelta, 0, 1);
  zone.floodExposure = clamp(
    zone.floodExposure - ENV.floodExposureReductionPerGreenCoverUnit * coverDelta,
    0,
    1,
  );

  return {
    carbonAbsorptionKgPerYear: round0(treesAdded * ENV.co2PerTreePerYearKg),
    floodReduction: round1((beforeFlood - zone.floodExposure) * 100), // percentage points
    urbanHeatReductionC: round1(ENV.urbanHeatReductionCPerGreenCoverUnit * coverDelta),
  };
}

/**
 * Run a scenario. Returns before/after resilience, per-zone vulnerability, and the
 * intervention-specific deltas. Never mutates the input profile.
 */
export function simulateScenario(
  profile: BarangayProfile,
  params: ScenarioParams,
): SimulationResult {
  const beforeResilience = scoreResilience(profile).score;
  const beforeVuln = vulnerabilitySnapshot(profile);

  const draft = cloneProfile(profile);
  const zone = resolveZone(draft, params);
  const deltas: SimulationDeltas = { resilience: 0 };

  switch (params.intervention) {
    case "build_evacuation_center": {
      const m = INTERVENTIONS.build_evacuation_center;
      zone.distanceToEvacCenterKm = Math.min(zone.distanceToEvacCenterKm, m.servedEvacDistanceKm);
      deltas.estimatedBeneficiaries = zone.population;
      deltas.maintenanceCostPerYear = m.maintenanceCostPerYear;
      break;
    }
    case "build_hospital": {
      const m = INTERVENTIONS.build_hospital;
      zone.distanceToHospitalKm = Math.min(zone.distanceToHospitalKm, m.servedHospitalDistanceKm);
      deltas.estimatedBeneficiaries = zone.population;
      deltas.maintenanceCostPerYear = m.maintenanceCostPerYear;
      break;
    }
    case "build_road": {
      const m = INTERVENTIONS.build_road;
      zone.roadAccess = Math.max(zone.roadAccess, m.roadAccessTarget);
      deltas.estimatedBeneficiaries = zone.population;
      deltas.maintenanceCostPerYear = m.maintenanceCostPerYear;
      break;
    }
    case "plant_trees": {
      const m = INTERVENTIONS.plant_trees;
      const trees = params.magnitude ?? m.defaultMagnitude;
      Object.assign(deltas, applyGreenCover(zone, trees, 0));
      deltas.estimatedBeneficiaries = zone.population;
      deltas.maintenanceCostPerYear = m.maintenanceCostPerYear;
      break;
    }
    case "build_park": {
      const m = INTERVENTIONS.build_park;
      Object.assign(deltas, applyGreenCover(zone, m.treesAdded, m.greenCoverAdded));
      deltas.estimatedBeneficiaries = zone.population;
      deltas.maintenanceCostPerYear = m.maintenanceCostPerYear;
      break;
    }
    case "road_oneway": {
      const m = INTERVENTIONS.road_oneway;
      deltas.trafficChange = -round1(m.trafficReduction * 100); // negative = less congestion
      deltas.maintenanceCostPerYear = m.maintenanceCostPerYear;
      deltas.estimatedBeneficiaries = zone.population;
      break;
    }
    case "divert_traffic": {
      const m = INTERVENTIONS.divert_traffic;
      deltas.trafficChange = -round1(m.trafficReduction * 100);
      deltas.maintenanceCostPerYear = m.maintenanceCostPerYear;
      deltas.estimatedBeneficiaries = zone.population;
      break;
    }
    case "custom":
    default:
      // Unknown/custom interventions produce no deterministic indicator change; the AI
      // layer will narrate qualitatively. Resilience delta stays 0.
      break;
  }

  const afterResilience = scoreResilience(draft).score;
  const afterVuln = vulnerabilitySnapshot(draft);
  deltas.resilience = round1(afterResilience - beforeResilience);

  return {
    before: { resilience: beforeResilience, vulnerabilityByZone: beforeVuln },
    after: { resilience: afterResilience, vulnerabilityByZone: afterVuln },
    deltas,
    appliedTo: params,
  };
}
