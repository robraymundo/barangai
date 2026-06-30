# Scenario Effect Coefficients — Assumptions & Sources

> **STATUS: DRAFT — proposed, awaiting sign-off.** These numbers drive
> `simulateScenario()` and make it deterministic. They live in
> [`lib/scoring/coefficients.ts`](../lib/scoring/coefficients.ts) as a single editable
> object so they can be tuned per barangay without touching engine logic. Every value is
> intentionally **conservative** — the platform is decision-*support*, not a guarantee
> (PRD §11), and judges should see defensible math, not optimistic guesses.

## How simulation works (so the coefficients make sense)

1. Gemini parses the natural-language question into `ScenarioParams` (intervention type,
   target zone, magnitude). It produces **no numbers** — only structure.
2. `simulateScenario()` looks up the intervention's effect model below, applies the deltas
   to a **copy** of the zone's raw indicators, and re-runs the deterministic scoring engine.
3. The before/after diff (e.g. resilience 62 → 78) and the PRD Feature-1 outputs are
   returned. Same input → same output, every time.

## Environmental constants

| Constant | Value | Basis / assumption |
|----------|-------|--------------------|
| CO₂ per tree per year | **21.77 kg** | Widely cited mixed-urban average (Arbor Day Foundation / i-Tree-style estimates). True range ~10–40 kg/yr by species, age, climate. We use the conservative mid-low and apply it linearly to tree count. |
| Mature tree canopy area | **30 m²** | Typical urban crown 25–50 m². Converts tree counts → added green-cover fraction (canopy ÷ zone area). |
| Urban heat reduction | **3.0 °C per +1.0 green-cover unit** | EPA Urban Heat Island literature reports neighborhood air-temp reductions of ~1–5 °C for substantial canopy gains. Modeled linearly, so +0.10 cover ≈ 0.3 °C local cooling. |
| Flood exposure reduction | **0.25 (0..1) per +1.0 green-cover unit** | Vegetated/permeable surfaces materially cut stormwater runoff (EPA green-infrastructure guidance). Conservative; +0.10 cover lowers 0..1 flood exposure by 0.025. Floored at 0. |
| Nominal zone area | **500,000 m² (~0.5 km²)** | Converts tree counts → added green-cover fraction (trees × canopy ÷ area). Matches the placeholder grid cells; override per zone with real polygons. |

## Per-intervention effect models

| Intervention | Default magnitude | Capital cost (PHP) | Maint./yr (PHP) | Key modeled effect | Assumption |
|--------------|-------------------|--------------------|-----------------|--------------------|------------|
| Build evacuation center | 1 | 8.0M | 250k | Served evac distance → 0.4 km (lifts preparedness + emergency response); beneficiaries = zone population | ~1.5 km walkable service radius; cost from typical multi-purpose evacuation building |
| Build hospital / health center | 1 | 25.0M | 1.2M | Served hospital distance → 0.6 km; healthcare access up | Barangay health station / small hospital scale |
| Build / pave road | 1 (km) | 5.0M | 150k | Road access → 0.95; transport up | Per-km concreting cost order-of-magnitude |
| Plant trees | 500 | 150k (~₱300/tree) | 50k | Canopy → green cover → carbon + heat + flood benefits | Includes early-care cost; benefits scale with tree count via ENV constants |
| Convert lot to park | 1 | 3.0M | 200k | +0.08 green cover, +120 trees to zone; heat/flood/carbon + staging value | Neighborhood pocket-park scale |
| Road one-way | 1 | 0 | 20k | −15% local traffic load; small emissions co-benefit | Policy change; cost is signage/enforcement |
| Divert traffic | 1 | 0 | 30k | −25% local traffic load | Larger relief than one-way; e.g. motorcycle diversion |

## What to review before we lock these

- **Costs** are Philippine order-of-magnitude estimates, not procured quotes — adjust to
  Ilagan City / DPWH references if you have them.
- **Carbon & cooling** use global urban-forestry averages; fine for a demo, flag as such.
- **Traffic & flood** effects are coarse linear models — deliberately simple and explainable
  for the hackathon, not a hydrological/traffic micro-simulation.
- All are **configurable**: change the object in `coefficients.ts` and every score, delta,
  and AI explanation updates consistently.
