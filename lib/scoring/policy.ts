/**
 * Feature — Policy Impact Simulator (deterministic core).
 *
 * Officials type a natural-language "what if" policy question (or pick a template).
 * `detectPolicyType` classifies it with the same lightweight keyword approach used by
 * lib/ai/canned.ts. `simulatePolicy` then applies the matched policy's coefficients to a
 * COPY of the target zone (nudging roadAccess / evac distance, the same fields the real
 * resilience engine reads) so the resilience number shown here is the exact number that
 * also updates the app-wide Resilience Score — never an LLM-invented figure. The wider
 * civic metrics (traffic, air quality, accessibility, etc.) are reviewable coefficients
 * per policy type, same spirit as coefficients.ts.
 */

import type { BarangayProfile, ZoneIndicators } from "@/types";
import { scoreResilience } from "./resilience";
import { clamp, round0, round1 } from "./util";

export type PolicyType =
  | "parking_restriction"
  | "one_way_street"
  | "school_time_shift"
  | "motorcycle_diversion"
  | "terminal_relocation"
  | "market_hours_extension"
  | "pedestrian_zone"
  | "custom";

export interface PolicyTemplate {
  type: PolicyType;
  label: string;
  example: string;
}

export const POLICY_TEMPLATES: PolicyTemplate[] = [
  { type: "parking_restriction", label: "Parking restriction", example: "What if parking is prohibited here?" },
  { type: "one_way_street", label: "One-way street", example: "What if this road becomes one-way?" },
  { type: "school_time_shift", label: "Earlier class times", example: "What if classes start 30 minutes earlier?" },
  { type: "motorcycle_diversion", label: "Motorcycle diversion", example: "What if motorcycles are diverted?" },
  { type: "terminal_relocation", label: "Terminal relocation", example: "What if tricycle terminals are relocated?" },
  { type: "market_hours_extension", label: "Extended market hours", example: "What if market hours are extended?" },
  { type: "pedestrian_zone", label: "New pedestrian zone", example: "What if a new pedestrian zone is created?" },
];

interface PolicyCoefficients {
  trafficCongestionPct: number; // signed, negative = less congestion
  travelTimeMin: number; // signed minutes, negative = faster
  airPollutionPct: number; // signed, negative = cleaner
  accessibilityPct: number; // signed, positive = more accessible
  emergencyResponseMin: number; // signed minutes, negative = faster response
  businessActivityPct: number; // signed
  communitySatisfactionPct: number; // signed
  beneficiaryFraction: number; // 0..1 share of the target zone's population
  roadAccessDelta: number; // applied to zone.roadAccess (real resilience input)
  evacDistanceDeltaKm: number; // applied to zone.distanceToEvacCenterKm (real resilience input)
  maintenanceCostPerYear: number;
}

const COEFFICIENTS: Record<Exclude<PolicyType, "custom">, PolicyCoefficients> = {
  parking_restriction: {
    trafficCongestionPct: -12,
    travelTimeMin: -3,
    airPollutionPct: -6,
    accessibilityPct: 4,
    emergencyResponseMin: -0.5,
    businessActivityPct: -5,
    communitySatisfactionPct: 3,
    beneficiaryFraction: 0.6,
    roadAccessDelta: 0.03,
    evacDistanceDeltaKm: -0.1,
    maintenanceCostPerYear: 15_000,
  },
  one_way_street: {
    trafficCongestionPct: -15,
    travelTimeMin: -4,
    airPollutionPct: -8,
    accessibilityPct: 2,
    emergencyResponseMin: -1,
    businessActivityPct: -2,
    communitySatisfactionPct: 5,
    beneficiaryFraction: 0.55,
    roadAccessDelta: 0.05,
    evacDistanceDeltaKm: -0.15,
    maintenanceCostPerYear: 20_000,
  },
  school_time_shift: {
    trafficCongestionPct: -9,
    travelTimeMin: -5,
    airPollutionPct: -3,
    accessibilityPct: 3,
    emergencyResponseMin: -0.3,
    businessActivityPct: 0,
    communitySatisfactionPct: 4,
    beneficiaryFraction: 0.35,
    roadAccessDelta: 0.01,
    evacDistanceDeltaKm: 0,
    maintenanceCostPerYear: 0,
  },
  motorcycle_diversion: {
    trafficCongestionPct: -22,
    travelTimeMin: -6,
    airPollutionPct: -10,
    accessibilityPct: -3,
    emergencyResponseMin: -2,
    businessActivityPct: -3,
    communitySatisfactionPct: 6,
    beneficiaryFraction: 0.65,
    roadAccessDelta: 0.06,
    evacDistanceDeltaKm: -0.2,
    maintenanceCostPerYear: 30_000,
  },
  terminal_relocation: {
    trafficCongestionPct: -18,
    travelTimeMin: 2,
    airPollutionPct: -5,
    accessibilityPct: 10,
    emergencyResponseMin: -2,
    businessActivityPct: 6,
    communitySatisfactionPct: 5,
    beneficiaryFraction: 0.5,
    roadAccessDelta: 0.07,
    evacDistanceDeltaKm: -0.25,
    maintenanceCostPerYear: 180_000,
  },
  market_hours_extension: {
    trafficCongestionPct: 5,
    travelTimeMin: 1,
    airPollutionPct: 2,
    accessibilityPct: 6,
    emergencyResponseMin: 0,
    businessActivityPct: 14,
    communitySatisfactionPct: 4,
    beneficiaryFraction: 0.4,
    roadAccessDelta: 0,
    evacDistanceDeltaKm: 0,
    maintenanceCostPerYear: 40_000,
  },
  pedestrian_zone: {
    trafficCongestionPct: -10,
    travelTimeMin: 3,
    airPollutionPct: -14,
    accessibilityPct: 12,
    emergencyResponseMin: 0.5,
    businessActivityPct: 9,
    communitySatisfactionPct: 9,
    beneficiaryFraction: 0.7,
    roadAccessDelta: -0.02,
    evacDistanceDeltaKm: 0.05,
    maintenanceCostPerYear: 250_000,
  },
};

const KEYWORDS: Array<{ type: Exclude<PolicyType, "custom">; words: string[] }> = [
  { type: "parking_restriction", words: ["parking", "no parking", "park here"] },
  { type: "one_way_street", words: ["one-way", "one way", "oneway"] },
  { type: "school_time_shift", words: ["class", "school", "classes start"] },
  { type: "motorcycle_diversion", words: ["motorcycle", "motorcycles", "tricycle diverted", "diverted"] },
  { type: "terminal_relocation", words: ["terminal", "relocat"] },
  { type: "market_hours_extension", words: ["market hours", "market", "extended hours"] },
  { type: "pedestrian_zone", words: ["pedestrian", "walkway", "car-free", "car free"] },
];

/** Lightweight keyword classifier — same spirit as lib/ai/canned.ts's detectIntervention. */
export function detectPolicyType(rawText: string): PolicyType {
  const q = rawText.toLowerCase();
  for (const { type, words } of KEYWORDS) {
    if (words.some((w) => q.includes(w))) return type;
  }
  return "custom";
}

export interface PolicyMetrics {
  trafficCongestionPct: number;
  travelTimeMin: number;
  airPollutionPct: number;
  accessibilityPct: number;
  emergencyResponseMin: number;
  businessActivityPct: number;
  communitySatisfactionPct: number;
  estimatedBeneficiaries: number;
  maintenanceCostPerYear: number;
}

export interface PolicySimulationResult {
  rawText: string;
  type: PolicyType;
  typeLabel: string;
  zoneId: string;
  zoneName: string;
  before: { resilience: number };
  after: { resilience: number };
  resilienceDelta: number;
  metrics: PolicyMetrics;
}

const TYPE_LABELS: Record<PolicyType, string> = {
  parking_restriction: "Parking restriction",
  one_way_street: "One-way street conversion",
  school_time_shift: "Adjusted class schedule",
  motorcycle_diversion: "Motorcycle diversion",
  terminal_relocation: "Terminal relocation",
  market_hours_extension: "Extended market hours",
  pedestrian_zone: "New pedestrian zone",
  custom: "Custom policy",
};

// A mild, deterministic policy used for free-text questions that don't match a template —
// modest, mostly-neutral effects so the system never invents a dramatic outcome for text
// it couldn't classify.
const CUSTOM_FALLBACK: PolicyCoefficients = {
  trafficCongestionPct: -3,
  travelTimeMin: -0.5,
  airPollutionPct: -1,
  accessibilityPct: 2,
  emergencyResponseMin: -0.2,
  businessActivityPct: 1,
  communitySatisfactionPct: 2,
  beneficiaryFraction: 0.3,
  roadAccessDelta: 0.01,
  evacDistanceDeltaKm: 0,
  maintenanceCostPerYear: 10_000,
};

function cloneProfile(profile: BarangayProfile): BarangayProfile {
  return {
    ...profile,
    zones: profile.zones.map((z) => ({ ...z })),
    facilities: profile.facilities.map((f) => ({ ...f })),
  };
}

function resolveZone(profile: BarangayProfile, targetZoneId?: string): ZoneIndicators {
  if (targetZoneId) {
    const z = profile.zones.find((z) => z.zoneId === targetZoneId);
    if (z) return z;
  }
  return profile.zones.reduce((a, b) => (b.population > a.population ? b : a));
}

/**
 * Simulate a natural-language (or template) policy. Resilience before/after comes from the
 * real scoring engine so it stays consistent with every other feature in the app.
 */
export function simulatePolicy(
  profile: BarangayProfile,
  rawText: string,
  targetZoneId?: string,
): PolicySimulationResult {
  const type = detectPolicyType(rawText);
  const coeff = type === "custom" ? CUSTOM_FALLBACK : COEFFICIENTS[type];

  const beforeResilience = scoreResilience(profile).score;

  const draft = cloneProfile(profile);
  const zone = resolveZone(draft, targetZoneId);
  zone.roadAccess = clamp(zone.roadAccess + coeff.roadAccessDelta, 0, 1);
  zone.distanceToEvacCenterKm = Math.max(0, zone.distanceToEvacCenterKm + coeff.evacDistanceDeltaKm);

  const afterResilience = scoreResilience(draft).score;

  const metrics: PolicyMetrics = {
    trafficCongestionPct: round1(coeff.trafficCongestionPct),
    travelTimeMin: round1(coeff.travelTimeMin),
    airPollutionPct: round1(coeff.airPollutionPct),
    accessibilityPct: round1(coeff.accessibilityPct),
    emergencyResponseMin: round1(coeff.emergencyResponseMin),
    businessActivityPct: round1(coeff.businessActivityPct),
    communitySatisfactionPct: round1(coeff.communitySatisfactionPct),
    estimatedBeneficiaries: round0(resolveZone(profile, targetZoneId).population * coeff.beneficiaryFraction),
    maintenanceCostPerYear: coeff.maintenanceCostPerYear,
  };

  return {
    rawText,
    type,
    typeLabel: TYPE_LABELS[type],
    zoneId: zone.zoneId,
    zoneName: zone.name,
    before: { resilience: beforeResilience },
    after: { resilience: afterResilience },
    resilienceDelta: round1(afterResilience - beforeResilience),
    metrics,
  };
}
