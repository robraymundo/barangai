/**
 * Scenario effect coefficients — the lookup tables that make simulateScenario() pure
 * and reproducible.
 *
 * STATUS: Finalized for the hackathon MVP demonstration. See docs/coefficients.md for the
 * disclaimer, limitations, per-coefficient confidence levels (High/Medium/Low), and sources
 * behind every number. Values are for decision-SUPPORT and scenario comparison only — they
 * are simplified, not engineering-grade predictions. Grouped in one exported object so they
 * stay easy to review, tune, and override per barangay.
 *
 * Direction conventions:
 *   - resilience score: 0..100, higher = better.
 *   - vulnerability score: 0..100, higher = worse.
 *   - flood/heat reductions are expressed as positive "improvement" magnitudes.
 *
 * Every coefficient is deliberately conservative; the goal is defensible, not optimistic.
 */

// --- Environmental constants -------------------------------------------------

export const ENV = {
  /**
   * CO₂ sequestered per urban tree per year (kg). 21.77 kg/yr is the widely cited
   * mixed-urban average (Arbor Day Foundation / i-Tree style estimates). Real range
   * is ~10–40 depending on species, age, and climate; we use the conservative mid-low.
   */
  co2PerTreePerYearKg: 21.77,

  /** Average crown/canopy area of a mature urban tree (m²). Used to convert tree
   *  counts into added green-cover fraction. Typical urban range 25–50 m². */
  treeCanopyAreaM2: 30,

  /**
   * Air-temperature reduction (°C) per +1.0 (i.e. +100%) of green-cover fraction in a
   * zone, applied linearly to the actual delta. EPA Heat Island literature reports
   * neighborhood air-temp reductions on the order of 1–5 °C for substantial canopy gains;
   * we model 3 °C per full unit of cover, so e.g. +0.10 cover ≈ 0.3 °C local cooling.
   */
  urbanHeatReductionCPerGreenCoverUnit: 3.0,

  /**
   * Flood-exposure reduction per +1.0 of green-cover fraction (in exposure points, 0..1
   * scale). Green/permeable surfaces cut stormwater runoff materially (EPA green
   * infrastructure); modeled conservatively at 0.25 per full unit, so +0.10 cover lowers
   * a zone's 0..1 flood exposure by 0.025. Capped so exposure never goes negative.
   */
  floodExposureReductionPerGreenCoverUnit: 0.25,

  /**
   * Nominal zone area (m²) used to convert tree counts into added green-cover fraction
   * (trees × canopy ÷ area). Approximates the ~0.5 km² order of magnitude of each zone
   * wedge in data/barangay.json; override per zone once surveyed per-purok areas exist.
   */
  nominalZoneAreaM2: 500_000,
} as const;

// --- Per-intervention effect models ------------------------------------------
//
// Each model describes how one intervention perturbs the raw ZoneIndicators and which
// PRD Feature-1 outputs it reports. simulateScenario() reads these, applies the deltas to
// a COPY of the profile, and re-runs the deterministic scoring engine.

export interface InterventionModel {
  /** Default magnitude when the AI parser does not extract one (e.g. unspecified count). */
  defaultMagnitude: number;
  /** One-time capital cost (PHP) — used for context/UI, not for scoring. */
  estimatedCapitalCost: number;
  /** Recurring maintenance (PHP/yr) reported in SimulationDeltas. */
  maintenanceCostPerYear: number;
}

export const INTERVENTIONS = {
  /**
   * Build evacuation center. Improves disaster preparedness + emergency response for the
   * target zone by cutting effective evacuation distance. Service radius ~1.5 km (walkable
   * planning standard). Beneficiaries = population of the target zone.
   */
  build_evacuation_center: {
    defaultMagnitude: 1,
    estimatedCapitalCost: 8_000_000,
    maintenanceCostPerYear: 250_000,
    /** New effective distance-to-evac-center for the served zone (km). Drives the
     *  disaster-preparedness and emergency-response components via evac-closeness. */
    servedEvacDistanceKm: 0.4,
  },

  /**
   * Build hospital / health center. Cuts distance-to-hospital for the target zone and
   * lifts healthcare access. Served distance ~0.6 km within the zone.
   */
  build_hospital: {
    defaultMagnitude: 1,
    estimatedCapitalCost: 25_000_000,
    maintenanceCostPerYear: 1_200_000,
    servedHospitalDistanceKm: 0.6,
  },

  /**
   * Build / pave road. Raises road access toward full and improves transport. Magnitude =
   * km of road (context only). roadAccessTarget caps the improved share.
   */
  build_road: {
    defaultMagnitude: 1,
    estimatedCapitalCost: 5_000_000,
    maintenanceCostPerYear: 150_000,
    roadAccessTarget: 0.95,
  },

  /**
   * Plant trees. magnitude = number of trees. Adds canopy → green cover → carbon, heat,
   * and flood benefits via ENV constants. Cheapest, slowest-maturing intervention.
   */
  plant_trees: {
    defaultMagnitude: 500,
    estimatedCapitalCost: 150_000, // ~PHP 300/tree planted incl. early care
    maintenanceCostPerYear: 50_000,
  },

  /**
   * Convert vacant lot to public park. Adds a block of green cover + trees to the zone and
   * yields heat/flood/carbon benefits, plus a small wellbeing/preparedness staging value.
   */
  build_park: {
    defaultMagnitude: 1,
    estimatedCapitalCost: 3_000_000,
    maintenanceCostPerYear: 200_000,
    /** Green-cover fraction added to the target zone by one park. */
    greenCoverAdded: 0.08,
    /** Trees added by one park (feeds carbon math alongside cover). */
    treesAdded: 120,
  },

  /**
   * Make a road one-way. Policy change (no capital cost). Reduces local congestion on the
   * affected segment; modeled as a traffic-load reduction with a small emissions co-benefit.
   */
  road_oneway: {
    defaultMagnitude: 1,
    estimatedCapitalCost: 0,
    maintenanceCostPerYear: 20_000, // signage / enforcement
    /** Expected reduction in local traffic load (fraction). Negative trafficChange. */
    trafficReduction: 0.15,
  },

  /**
   * Divert traffic (e.g. motorcycles) off a road. Policy change. Larger modeled congestion
   * relief on the target segment than one-way conversion.
   */
  divert_traffic: {
    defaultMagnitude: 1,
    estimatedCapitalCost: 0,
    maintenanceCostPerYear: 30_000,
    trafficReduction: 0.25,
  },
} as const;

export type KnownIntervention = keyof typeof INTERVENTIONS;
