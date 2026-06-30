/** Small, deterministic fixtures for scoring-engine tests. */

import type { BarangayProfile, ProjectCandidate, ZoneIndicators } from "@/types";

/** A clearly high-vulnerability zone (poor, exposed, isolated). */
export const HIGH_VULN_ZONE: ZoneIndicators = {
  zoneId: "H",
  name: "High Vuln",
  population: 1000,
  elderly: 220,
  children: 420,
  pwd: 90,
  households: 240,
  avgMonthlyIncome: 6000,
  housingQuality: 0.2,
  roadAccess: 0.2,
  distanceToHospitalKm: 9,
  distanceToEvacCenterKm: 5.5,
  floodExposure: 0.85,
  landslideExposure: 0.4,
  greenCoverFraction: 0.05,
  treeCount: 100,
};

/** A clearly low-vulnerability zone (well-off, safe, connected). */
export const LOW_VULN_ZONE: ZoneIndicators = {
  zoneId: "L",
  name: "Low Vuln",
  population: 1000,
  elderly: 80,
  children: 150,
  pwd: 20,
  households: 280,
  avgMonthlyIncome: 28000,
  housingQuality: 0.9,
  roadAccess: 0.95,
  distanceToHospitalKm: 0.8,
  distanceToEvacCenterKm: 0.5,
  floodExposure: 0.1,
  landslideExposure: 0.03,
  greenCoverFraction: 0.4,
  treeCount: 2200,
};

export const TEST_PROFILE: BarangayProfile = {
  id: "brgy-test",
  name: "Test",
  city: "Testville",
  centroid: { lat: 17, lng: 121 },
  zones: [HIGH_VULN_ZONE, LOW_VULN_ZONE],
  facilities: [],
  dataSources: ["synthetic test fixture"],
};

export const TEST_PROJECTS: ProjectCandidate[] = [
  {
    id: "P1-strong",
    name: "High-value project",
    cost: 5_000_000,
    communityImpact: 90,
    urgency: 90,
    beneficiaries: 5000,
    maintenanceCostPerYear: 100_000,
    climateResilience: 90,
  },
  {
    id: "P2-weak",
    name: "Low-value project",
    cost: 4_000_000,
    communityImpact: 15,
    urgency: 10,
    beneficiaries: 300,
    maintenanceCostPerYear: 800_000,
    climateResilience: 10,
  },
];
