/**
 * BarangAI — canonical type contracts.
 *
 * Single source of truth shared by the scoring engine (lib/scoring), the AI layer
 * (lib/ai), the API route handlers (app/api), and the UI. Mirrors docs/data-model.md.
 *
 * Convention: raw indicators are stored; scores are always DERIVED, never persisted
 * in the source data.
 */

// ---------------------------------------------------------------------------
// 1. Digital Twin — raw, un-scored data
// ---------------------------------------------------------------------------

/** Raw attributes of one zone (purok/sitio). Sourced from PSA/NDRRMC/OSM + synthetic fill. */
export interface ZoneIndicators {
  zoneId: string; // matches GeoJSON properties.zoneId
  name: string;

  // --- Demographics (counts unless noted) ---
  population: number;
  elderly: number; // 60+
  children: number; // 0-14
  pwd: number; // persons with disabilities
  households: number;
  avgMonthlyIncome: number; // PHP; lower = more vulnerable

  // --- Built environment (0..1 quality fractions where noted) ---
  housingQuality: number; // 0..1, share of durable/permanent structures
  roadAccess: number; // 0..1, share with paved/passable road access
  distanceToHospitalKm: number; // nearest hospital/health center
  distanceToEvacCenterKm: number;

  // --- Hazard exposure (0..1, modeled probability/severity) ---
  floodExposure: number; // 0..1
  landslideExposure: number; // 0..1

  // --- Environment ---
  greenCoverFraction: number; // 0..1, vegetation/canopy share
  treeCount: number;
}

export type FacilityType =
  | "hospital"
  | "evacuation_center"
  | "school"
  | "park"
  | "fire_station"
  | "road";

export interface Facility {
  id: string;
  type: FacilityType;
  name: string;
  location: { lat: number; lng: number };
  zoneId?: string;
}

export interface BarangayProfile {
  id: string; // e.g. "brgy-alibagu"
  name: string;
  city: string;
  centroid: { lat: number; lng: number };
  zones: ZoneIndicators[];
  facilities: Facility[];
  dataSources: string[]; // provenance, surfaced in UI for credibility
}

// ---------------------------------------------------------------------------
// 2. Scoring — shared shapes
// ---------------------------------------------------------------------------

/**
 * Every score returns its 0..100 value AND the weighted breakdown that produced it,
 * so both the AI explanation and the UI can show "why".
 */
export interface ScoreFactor {
  key: string; // e.g. "floodExposure"
  label: string; // human label for UI
  rawValue: number;
  weight: number; // 0..1; weights within a score sum to 1
  contribution: number; // weight * normalized(rawValue), on the 0..100 scale
}

export interface ScoreBreakdown {
  score: number; // 0..100 (direction documented per function)
  factors: ScoreFactor[]; // ordered, largest contribution first
}

// --- Vulnerability (Feature 2) — higher = MORE vulnerable ---

export interface VulnerabilityWeights {
  elderlyShare: number;
  childrenShare: number;
  pwdShare: number;
  incomeInverse: number;
  housingInverse: number;
  roadInverse: number;
  hospitalDistance: number;
  floodExposure: number;
  landslideExposure: number;
}

export interface RankedZone {
  zoneId: string;
  name: string;
  breakdown: ScoreBreakdown;
}

// --- Resilience (Feature 4) — higher = BETTER prepared ---

export interface ResilienceComponents {
  disasterPreparedness: number; // 0..100
  healthcareAccess: number;
  infrastructureQuality: number;
  environmentalSustainability: number;
  transportAccess: number;
  emergencyResponse: number;
}

export interface ResilienceWeights {
  disasterPreparedness: number;
  healthcareAccess: number;
  infrastructureQuality: number;
  environmentalSustainability: number;
  transportAccess: number;
  emergencyResponse: number;
}

export type ResilienceResult = ScoreBreakdown & {
  components: ResilienceComponents;
};

// --- Budget Optimization (Feature 3) ---

export interface ProjectCandidate {
  id: string;
  name: string;
  cost: number; // PHP
  communityImpact: number; // 0..100
  urgency: number; // 0..100
  beneficiaries: number; // count
  maintenanceCostPerYear: number; // PHP
  climateResilience: number; // 0..100
  targetZoneId?: string;
}

export interface BudgetWeights {
  communityImpact: number;
  urgency: number;
  beneficiaries: number; // applied to a normalized beneficiary scale
  costEfficiency: number; // benefit per peso
  maintenanceInverse: number; // lower maintenance = better
  climateResilience: number;
}

export interface BudgetSelection {
  project: ProjectCandidate;
  benefit: number; // 0..100 composite benefit
  priorityScore: number; // benefit per cost, scaled — drives ranking
}

export interface BudgetResult {
  selected: BudgetSelection[];
  rejected: Array<{ project: ProjectCandidate; benefit: number; reason: "budget" }>;
  totalCost: number;
  budget: number;
  totalBenefit: number;
}

// ---------------------------------------------------------------------------
// 3. Scenario Simulation (Feature 1)
// ---------------------------------------------------------------------------

export type InterventionType =
  | "build_evacuation_center"
  | "build_park"
  | "plant_trees"
  | "road_oneway"
  | "divert_traffic"
  | "build_hospital"
  | "build_road"
  | "custom";

/** Normalized, machine-readable scenario produced by the AI parser (lib/ai/parse). */
export interface ScenarioParams {
  intervention: InterventionType;
  targetZoneId?: string;
  location?: { lat: number; lng: number };
  magnitude?: number; // e.g. number of trees / lanes; interpreted per intervention
  rawText: string; // original user question, kept for the explanation
}

/** PRD Feature-1 outputs; each present only where the intervention applies. */
export interface SimulationDeltas {
  resilience: number; // signed change in barangay resilience score
  floodReduction?: number; // percentage-point reduction in effective flood exposure
  trafficChange?: number; // signed % change in local traffic load
  carbonAbsorptionKgPerYear?: number;
  urbanHeatReductionC?: number;
  estimatedBeneficiaries?: number;
  maintenanceCostPerYear?: number;
}

export interface SimulationResult {
  before: { resilience: number; vulnerabilityByZone: Record<string, number> };
  after: { resilience: number; vulnerabilityByZone: Record<string, number> };
  deltas: SimulationDeltas;
  appliedTo: ScenarioParams;
}

// ---------------------------------------------------------------------------
// 4. AI layer return shapes (lib/ai)
// ---------------------------------------------------------------------------

export interface VulnerabilityExplanation {
  summary: string;
  recommendations: string[]; // infrastructure + social services (PRD Feature 2)
}

export interface BudgetExplanation {
  summary: string;
  perProject: Record<string, string>; // projectId -> one-line rationale
}

export interface CannedResponse {
  params: ScenarioParams;
  explanation: string;
}
