# BarangAI — Data Model & Engine Contracts

> Design contracts only. No application code. These types are the single source of
> truth the scoring engine, AI layer, API routes, and UI all build against.
>
> Confirmed decisions:
> 1. **Deterministic scoring** — all scores computed by pure TS formulas. Gemini only
>    *parses* natural language and *explains* already-computed numbers. It never invents a score.
> 2. **One barangay**, curated open + synthetic data, version-controlled as static files.
> 3. **Next.js App Router + Route Handlers**. No standalone Express. (`backend/` is retired.)
> 4. **Vercel** hosting; **Firebase** for Firestore + optional Auth.

---

## 0. Why this shape

Features 2 (Vulnerability), 3 (Budget), and 4 (Resilience) are the **same machine**:
weighted indicators → normalized score (0–100) → AI explanation. Feature 1 (Scenario)
*perturbs* the indicators and re-runs that machine. Feature 5 (Dashboard) *renders* it.

So the architecture is: **one digital-twin dataset → one deterministic scoring core →
one AI explanation layer → five views.** Everything below serves that.

---

## 1. The Digital Twin (static data)

The barangay is divided into **zones** (puroks/sitios). Each zone carries the raw
indicators. Scores are *derived*, never stored in the source data.

### 1.1 `data/barangay.geojson`

Standard GeoJSON `FeatureCollection`. One `Feature` per zone. Geometry is the zone
polygon; `properties.zoneId` links to indicators.

```jsonc
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": { "zoneId": "Z01", "name": "Purok 1 - Riverside" },
      "geometry": { "type": "Polygon", "coordinates": [ /* [lng,lat] rings */ ] }
    }
  ]
}
```

### 1.2 `data/indicators.json` — the raw twin

```ts
/** Raw, un-scored attributes of one zone. Sourced from PSA/NDRRMC/OSM + synthetic fill. */
export interface ZoneIndicators {
  zoneId: string;                 // matches GeoJSON properties.zoneId
  name: string;

  // --- Demographics (counts unless noted) ---
  population: number;
  elderly: number;                // 60+
  children: number;               // 0-14
  pwd: number;                    // persons with disabilities
  households: number;
  avgMonthlyIncome: number;       // PHP; lower = more vulnerable

  // --- Built environment (0..1 quality fractions where noted) ---
  housingQuality: number;         // 0..1, share of durable/permanent structures
  roadAccess: number;             // 0..1, share with paved/passable road access
  distanceToHospitalKm: number;   // nearest hospital/health center
  distanceToEvacCenterKm: number;

  // --- Hazard exposure (0..1, modeled probability/severity) ---
  floodExposure: number;          // 0..1
  landslideExposure: number;      // 0..1

  // --- Environment ---
  greenCoverFraction: number;     // 0..1, vegetation/canopy share
  treeCount: number;
}

export interface BarangayProfile {
  id: string;                     // e.g. "brgy-sanisidro"
  name: string;
  city: string;
  centroid: { lat: number; lng: number };
  zones: ZoneIndicators[];
  /** Existing facilities, used by the map + scenario engine. */
  facilities: Facility[];
  dataSources: string[];          // provenance, shown in UI for credibility
}

export interface Facility {
  id: string;
  type: "hospital" | "evacuation_center" | "school" | "park" | "fire_station" | "road";
  name: string;
  location: { lat: number; lng: number };
  zoneId?: string;
}
```

> **Provenance matters for judges.** `dataSources` is surfaced in the UI so evaluators
> see we cite PSA/NDRRMC/OSM and label synthetic fields honestly (PRD §11 allows synthetic).

---

## 2. Scoring Engine (`lib/scoring/`) — pure, deterministic, unit-tested

All functions are pure: same input → same output, no I/O, no AI. This is the
defensible core and the thing we write tests for.

### 2.1 Shared score shape

```ts
/** Every score returns its number AND the weighted breakdown that produced it,
 *  so the AI explanation and the UI can both show "why". */
export interface ScoreBreakdown {
  score: number;                  // 0..100, higher = better (resilience) / worse (vulnerability) — see each fn
  factors: ScoreFactor[];         // ordered, largest contribution first
}
export interface ScoreFactor {
  key: string;                    // e.g. "floodExposure"
  label: string;                  // human label for UI
  rawValue: number;
  weight: number;                 // 0..1, weights within a score sum to 1
  contribution: number;           // weight * normalized(rawValue), 0..100 scaled
}
```

### 2.2 Vulnerability — Feature 2

Higher score = **more** vulnerable (needs attention). Weights are explicit constants
in code so they're tunable and explainable.

```ts
export interface VulnerabilityWeights {
  elderlyShare: number; childrenShare: number; pwdShare: number;
  incomeInverse: number; housingInverse: number; roadInverse: number;
  hospitalDistance: number; floodExposure: number; landslideExposure: number;
}
export const DEFAULT_VULN_WEIGHTS: VulnerabilityWeights; // sums to 1

export function scoreVulnerability(
  zone: ZoneIndicators,
  weights?: VulnerabilityWeights,
): ScoreBreakdown;

/** Rank all zones; the dashboard's "priority evacuation areas" list. */
export function rankVulnerableZones(profile: BarangayProfile): Array<{
  zoneId: string; name: string; breakdown: ScoreBreakdown;
}>;
```

### 2.3 Resilience — Feature 4

Higher = **better** prepared. Six PRD indicators (§Feature 4). Computed for the whole
barangay (population-weighted across zones).

```ts
export interface ResilienceComponents {
  disasterPreparedness: number;   // 0..100
  healthcareAccess: number;
  infrastructureQuality: number;
  environmentalSustainability: number;
  transportAccess: number;
  emergencyResponse: number;
}
export function scoreResilience(profile: BarangayProfile): ScoreBreakdown & {
  components: ResilienceComponents;
};
```

### 2.4 Budget Optimization — Feature 3 (knapsack, not LLM sorting)

Deterministic 0/1 knapsack maximizing total benefit under the budget. Defensible and
reproducible; Gemini only writes the rationale per selected project.

```ts
export interface ProjectCandidate {
  id: string;
  name: string;
  cost: number;                   // PHP
  // benefit drivers, each 0..100 (or counts) — combined into a benefit value
  communityImpact: number;
  urgency: number;
  beneficiaries: number;
  maintenanceCostPerYear: number;
  climateResilience: number;
  targetZoneId?: string;
}
export interface BudgetWeights { /* per criterion, sums to 1 */ }

/** Pure benefit value for a single project (used by the knapsack + UI sort). */
export function projectBenefit(p: ProjectCandidate, w?: BudgetWeights): number;

export interface BudgetResult {
  selected: Array<{ project: ProjectCandidate; benefit: number; priorityScore: number }>;
  rejected: Array<{ project: ProjectCandidate; benefit: number; reason: "budget" }>;
  totalCost: number;
  budget: number;
  totalBenefit: number;
}
export function optimizeBudget(
  projects: ProjectCandidate[],
  budget: number,
  weights?: BudgetWeights,
): BudgetResult;
```

### 2.5 Scenario Simulation — Feature 1 (the deltas)

The simulator converts a parsed scenario into **indicator deltas**, applies them to a
*copy* of the profile, and re-runs resilience + vulnerability. The before/after diff is
the "62 → 78" result.

```ts
/** A normalized, machine-readable scenario produced by the AI parser (§3.1). */
export interface ScenarioParams {
  intervention:
    | "build_evacuation_center" | "build_park" | "plant_trees"
    | "road_oneway" | "divert_traffic" | "build_hospital" | "build_road"
    | "custom";
  targetZoneId?: string;
  location?: { lat: number; lng: number };
  magnitude?: number;             // e.g. number of trees, lanes — interpreted per intervention
  rawText: string;               // original user question, kept for the explanation
}

export interface SimulationResult {
  before: { resilience: number; vulnerabilityByZone: Record<string, number> };
  after:  { resilience: number; vulnerabilityByZone: Record<string, number> };
  deltas: {
    resilience: number;           // signed
    floodReduction?: number;      // PRD-listed outputs, where the intervention applies
    trafficChange?: number;
    carbonAbsorptionKgPerYear?: number;
    urbanHeatReductionC?: number;
    estimatedBeneficiaries?: number;
    maintenanceCostPerYear?: number;
  };
  appliedTo: ScenarioParams;
}
export function simulateScenario(
  profile: BarangayProfile,
  params: ScenarioParams,
): SimulationResult;
```

> **Determinism guardrail:** `simulateScenario` is pure math (lookup tables of effect
> coefficients per intervention type). The numbers are reproducible across demo runs —
> this is what satisfies PRD §8 "consistent AI outputs for predefined demo scenarios."

---

## 3. AI Layer (`lib/ai/`) — parse in, explain out

Gemini does exactly two jobs. Both use **structured output** so responses are typed and
parseable. A **canned fallback** covers the scripted demo scenarios if the API is slow/down.

### 3.1 Parse: natural language → `ScenarioParams`

```ts
/** Gemini with a responseSchema matching ScenarioParams. Falls back to a keyword
 *  matcher for the demo scripts if the call fails. */
export function parseScenario(question: string): Promise<ScenarioParams>;
```

### 3.2 Explain: computed numbers → narrative

The AI receives the **already-computed** SimulationResult/ScoreBreakdown and writes the
prose. It is explicitly instructed not to alter numbers.

```ts
export function explainSimulation(
  result: SimulationResult,
  profile: BarangayProfile,
): Promise<string>;

export function explainVulnerability(ranked: ReturnType<typeof rankVulnerableZones>): Promise<{
  summary: string;
  recommendations: string[];      // infra + social services per PRD Feature 2
}>;

export function explainBudget(result: BudgetResult): Promise<{
  summary: string;
  perProject: Record<string, string>;  // projectId -> one-line rationale
}>;
```

### 3.3 Fallback map

```ts
/** Keyed by a normalized form of the demo questions. Used when Gemini is unavailable
 *  OR for the rehearsed demo path, guaranteeing a smooth presentation. */
export const CANNED_RESPONSES: Record<string, { params: ScenarioParams; explanation: string }>;
```

> Model choice: **Gemini Flash** for parse + explain (latency-sensitive, hits the 5–10s
> NFR). Reserve Pro only if a feature needs deeper reasoning. Key lives server-side only.

---

## 4. API Route Contracts (`app/api/.../route.ts`)

All POST, JSON in/out. These wrap scoring (pure) + AI (explanation). The browser never
sees the Gemini key.

| Route | Request | Response |
|-------|---------|----------|
| `POST /api/simulate` | `{ question: string }` | `{ params, result: SimulationResult, explanation: string }` |
| `POST /api/vulnerability` | `{}` (uses static profile) | `{ ranked, summary, recommendations }` |
| `POST /api/budget` | `{ budget: number, projects: ProjectCandidate[] }` | `{ result: BudgetResult, summary, perProject }` |
| `GET  /api/resilience` | — | `{ breakdown, components }` |
| `GET  /api/twin` | — | `{ profile: BarangayProfile, geojson }` (dashboard bootstrap) |

### 4.1 Firestore (the only persistence)

Two collections, single shared workspace (no per-user scoping for MVP):

```
scenarios/{autoId}   -> { question, params, result, explanation, createdAt }
resilienceTimeline/{autoId} -> { score, triggeredByScenarioId, createdAt }
```

Base twin data stays in the repo as static files — Firestore holds only history +
the resilience timeline that powers Feature 4's "track over time" chart.

---

## 5. Proposed repository layout

```
/ (single Next.js app — replaces frontend/ + backend/)
├─ app/
│  ├─ (dashboard)/page.tsx          # Feature 5 shell: map + panels
│  ├─ api/{simulate,vulnerability,budget,resilience,twin}/route.ts
├─ components/                      # map, chat, charts, score gauges
├─ lib/
│  ├─ scoring/{vulnerability,resilience,budget,scenario}.ts   # §2, pure
│  ├─ ai/{parse,explain,canned}.ts                            # §3
│  └─ firebase/{client,admin}.ts
├─ data/{barangay.geojson,indicators.json}                    # §1, the twin
├─ types/index.ts                   # all interfaces above
└─ docs/                            # PRD, architecture, this file
```

> `backend/` and `frontend/` (currently empty) get removed; the Next.js app at the repo
> root is both. If you prefer to keep the app inside `frontend/`, that works too — say so
> and I'll nest the layout there.

---

## 6. Open items before scaffolding

1. **Pick the barangay** (name + city) so I can source a real boundary polygon for the GeoJSON.
2. **Confirm repo root vs `frontend/`** for the Next.js app.
3. **Effect coefficients** for `simulateScenario` — I'll propose defensible defaults
   (e.g. "1 tree ≈ X kg CO₂/yr", "evac center cuts effective hospital distance by Y")
   with citations; you sign off before they're locked.
```
