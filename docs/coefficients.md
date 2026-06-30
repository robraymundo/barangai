# Scenario Effect Coefficients — Assumptions, Confidence & Sources

## ⚠️ Disclaimer

These coefficients are intended for **demonstration and decision-support purposes only**.
They are built from **simplified models and publicly available research**, not from
site-specific engineering studies, and they are **not engineering-grade predictions**.
BarangAI is a planning-support and scenario-comparison tool; its outputs should inform
discussion, not replace formal feasibility studies, hydrological/traffic modeling, or
procurement-grade cost estimates. (Consistent with PRD §11: AI-generated outputs are
decision-support, not official predictions.)

## Limitations

- **Comparative, not predictive.** The engine is designed to compare scenarios *against
  each other on a consistent basis* (e.g. "an evacuation center raises resilience more
  than planting trees in this zone"), not to produce exact real-world forecasts. Treat the
  numbers as *relative signals*, not absolute guarantees.
- **Linear, single-zone effects.** Interventions are modeled as linear changes to one
  target zone's indicators. Spillover between zones, diminishing returns, construction
  lead time, and maintenance decay are intentionally omitted for clarity.
- **Generalized coefficients.** Environmental and traffic figures use national/global
  averages, not Alibagu-specific measurements. Real outcomes vary with soil, drainage,
  species mix, road network, and enforcement.
- **Determinism is the point.** Because every value is fixed, the same scenario always
  yields the same result — this is a *feature* for a reliable demo, but it also means the
  model does not capture real-world variance or uncertainty bands.

## How simulation works (so the coefficients make sense)

1. Gemini parses the natural-language question into `ScenarioParams` (intervention type,
   target zone, magnitude). It produces **no numbers** — only structure.
2. `simulateScenario()` looks up the intervention's effect model below, applies the deltas
   to a **copy** of the zone's raw indicators, and re-runs the deterministic scoring engine.
3. The before/after diff (e.g. resilience 62 → 78) and the PRD Feature-1 outputs are
   returned. Same input → same output, every time.

> The exact numeric values live in
> [`lib/scoring/coefficients.ts`](../lib/scoring/coefficients.ts) as a single editable
> object (the source of truth for calculation). The ranges shown below are for human
> review and transparency; the code uses the single point value.

### Confidence levels

- **High** — directly supported by established, widely-cited research or published unit costs.
- **Medium** — reasonable average drawn from credible sources, but real values vary materially.
- **Low** — simplified demonstration assumption; plausible in direction/magnitude but not validated.

## Environmental constants

| Constant | Value (code) | Confidence | Basis / source |
|----------|-------------|------------|----------------|
| CO₂ per tree per year | **21.77 kg** | Medium | Mixed-urban average consistent with **USDA Forest Service i-Tree** sequestration estimates; true range ~10–40 kg/yr by species, age, and climate. Applied linearly to tree count. |
| Mature tree canopy area | **30 m²** | Medium | Typical urban crown 25–50 m² (urban-forestry literature, i-Tree canopy datasets). Converts tree counts → added green-cover fraction. |
| Urban heat reduction | **3.0 °C per +1.0 green-cover unit** | Low | Direction supported by **US EPA — Using Trees and Vegetation to Reduce Heat Islands**, which reports neighborhood air-temp reductions of ~1–5 °C for substantial canopy gains. The *linear* per-unit conversion is a demonstration simplification. |
| Flood exposure reduction | **0.25 (0..1) per +1.0 green-cover unit** | Low | Direction supported by **US EPA — Green Infrastructure / Soak Up the Rain** (vegetated, permeable surfaces reduce stormwater runoff). Magnitude is a conservative demonstration assumption, not a hydrological result. |
| Nominal zone area | **500,000 m² (~0.5 km²)** | Low | Placeholder matching the demo grid cells in `data/barangay.json`. Replace per-zone once real **PSA/OSM** boundary polygons are loaded. |

## Per-intervention effect models

| Intervention | Default magnitude | Capital cost — estimated range (code value) | Maint./yr range (code) | Cost confidence | Effect confidence | Key modeled effect & basis |
|--------------|-------------------|---------------------------------------------|------------------------|-----------------|-------------------|----------------------------|
| Build evacuation center | 1 | **₱6M–₱10M** (8.0M) | ₱200k–₱300k (250k) | Medium | Medium | Served evac distance → 0.4 km (lifts disaster preparedness + emergency response). ~1.5 km walkable service radius; multi-purpose evacuation building scale (**DPWH**-type public-building costs; **NDRRMC** evacuation-planning guidance). |
| Build hospital / health center | 1 | **₱20M–₱30M** (25.0M) | ₱1.0M–₱1.5M (1.2M) | Medium | Medium | Served hospital distance → 0.6 km; raises healthcare access. Barangay health station / small facility scale (**DOH/DPWH** facility cost orders of magnitude). |
| Build / pave road | 1 km | **₱3M–₱7M / km** (5.0M) | ₱100k–₱200k (150k) | Medium | Medium | Road access → 0.95; improves transport. Per-km concreting based on **DPWH** unit-cost orders of magnitude. |
| Plant trees | 500 | **₱100k–₱200k** (150k; ~₱200–400/tree) | ₱40k–₱60k (50k) | Medium | Medium | Canopy → green cover → carbon + heat + flood co-benefits (via ENV constants). Per-tree cost aligned with **DENR National Greening Program** planting-and-early-care orders of magnitude. |
| Convert lot to park | 1 | **₱2M–₱4M** (3.0M) | ₱150k–₱250k (200k) | Low–Medium | Low–Medium | +0.08 green cover, +120 trees to zone → heat/flood/carbon + community staging value. Neighborhood pocket-park scale. |
| Road one-way | 1 | **₱0 capital** (0); signage/enforcement ₱10k–₱30k/yr (20k) | — | Medium (policy) | Low | −15% local traffic load + minor emissions co-benefit. **Conservative demonstration assumption**, not a validated traffic model. |
| Divert traffic | 1 | **₱0 capital** (0); ₱20k–₱40k/yr (30k) | — | Medium (policy) | Low | −25% local traffic load (e.g. motorcycle diversion). **Conservative demonstration assumption**, not a validated traffic model. |

### Note on traffic & flood values specifically

The traffic-load changes (−15% / −25%) and the green-cover→flood-reduction factor are
**conservative demonstration assumptions chosen to be directionally plausible and easy to
explain**. They are *not* outputs of a calibrated traffic-microsimulation or a
hydrological/hydraulic model. For a production deployment these would be replaced with
locally-validated models and field data.

## Source references

- **USDA Forest Service — i-Tree** (`itreetools.org`): urban tree carbon sequestration and canopy.
- **US EPA — Heat Island Reduction** ("Using Trees and Vegetation to Reduce Heat Islands").
- **US EPA — Green Infrastructure / Soak Up the Rain**: stormwater runoff reduction from vegetation/permeable surfaces.
- **DENR — National Greening Program**: tree-planting and early-care cost orders of magnitude.
- **DPWH**: road and public-building unit-cost orders of magnitude (Philippine context).
- **PSA** (2020 Census): demographic inputs to the digital twin.
- **NDRRMC / Project NOAH**: hazard exposure and evacuation-planning references.

> Source references name the relevant programs/agencies for credibility and follow-up;
> specific published figures should be re-verified before any non-demo use.

## Status

**Finalized for the hackathon MVP demonstration** (per review on 2026-07-01), subject to
the disclaimer and limitations above. All values remain configurable in
`coefficients.ts`; changing them updates every score, delta, and AI explanation consistently.
