"use client";

import { useEffect, useMemo, useState } from "react";
import { Droplets, Thermometer, Waves, Trees, Trash2, MapIcon, Sparkles } from "lucide-react";
import type { BarangayProfile } from "@/types";
import type { ZoneFeatureCollection, SimulateResponse } from "@/lib/client/api";
import { api } from "@/lib/client/api";
import { Badge, Card, ScoreDial, Spinner, Stat } from "@/components/ui";
import EnvLayerMap from "@/components/map/EnvLayerMap";
import { ENV_INTERVENTION_LIST, type EnvLayerKey, type EnvSimulationResult, type EnvIntervention, type ZoneEnvLayers } from "@/lib/scoring/environment";

const LAYERS: Array<{ key: EnvLayerKey; label: string; icon: typeof Droplets; polarity: "goodLow" | "goodHigh" }> = [
  { key: "floodRisk", label: "Flood-prone areas", icon: Waves, polarity: "goodLow" },
  { key: "urbanHeat", label: "Urban heat hotspots", icon: Thermometer, polarity: "goodLow" },
  { key: "drainageCondition", label: "Drainage condition", icon: Droplets, polarity: "goodHigh" },
  { key: "greenCoverage", label: "Green space coverage", icon: Trees, polarity: "goodHigh" },
  { key: "wasteRisk", label: "Waste accumulation risk", icon: Trash2, polarity: "goodLow" },
];

function fmt(n: number): string {
  return n.toLocaleString("en-PH", { maximumFractionDigits: 1 });
}

export default function EnvironmentalIntelligence({
  profile,
  geojson,
  onSimulated,
}: {
  profile: BarangayProfile;
  geojson: ZoneFeatureCollection;
  onSimulated?: (res: SimulateResponse) => void;
}) {
  const [layers, setLayers] = useState<ZoneEnvLayers[] | null>(null);
  const [activeLayer, setActiveLayer] = useState<EnvLayerKey>("floodRisk");
  const [zoneId, setZoneId] = useState<string>(profile.zones[0]?.zoneId ?? "");
  const [selected, setSelected] = useState<Set<EnvIntervention>>(new Set(["plant_trees"]));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ result: EnvSimulationResult; explanation: string } | null>(null);

  useEffect(() => {
    api.envLayers().then((r) => setLayers(r.layers)).catch(() => setLayers(null));
  }, []);

  const valueByZone = useMemo(() => {
    const map: Record<string, number> = {};
    (layers ?? []).forEach((l) => (map[l.zoneId] = l[activeLayer]));
    return map;
  }, [layers, activeLayer]);

  const activeLayerMeta = LAYERS.find((l) => l.key === activeLayer)!;

  function toggleIntervention(key: EnvIntervention) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function runSimulation() {
    if (selected.size === 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.envSimulate(zoneId, Array.from(selected));
      setResult(res);
      onSimulated?.({
        params: { intervention: "custom", targetZoneId: zoneId, rawText: `Environmental intervention: ${res.result.interventions.join(", ")}` },
        result: {
          before: { resilience: res.result.before.resilience, vulnerabilityByZone: {} },
          after: { resilience: res.result.after.resilience, vulnerabilityByZone: {} },
          deltas: { resilience: res.result.deltas.resilienceDelta },
          appliedTo: { intervention: "custom", targetZoneId: zoneId, rawText: "Environmental intervention" },
        },
        explanation: res.explanation,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Simulation failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[3fr_2fr]">
      {/* Map + layer toggles */}
      <Card bare>
        <h3 className="flex items-center gap-2 px-1 text-sm font-bold">
          <MapIcon size={15} strokeWidth={2.25} className="text-brand" aria-hidden />
          Environmental Layers
        </h3>
        <div className="mt-3 flex flex-wrap gap-1.5 px-1">
          {LAYERS.map((l) => (
            <button
              key={l.key}
              onClick={() => setActiveLayer(l.key)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                activeLayer === l.key
                  ? "bg-linear-to-br from-brand to-brand-2 text-white shadow-md shadow-brand/25"
                  : "border border-line bg-surface text-ink-dim hover:bg-surface-alt hover:text-ink"
              }`}
            >
              <l.icon size={13} strokeWidth={2.25} aria-hidden />
              {l.label}
            </button>
          ))}
        </div>
        <div className="relative mt-3 h-105 overflow-hidden rounded-2xl border border-line">
          {layers ? (
            <EnvLayerMap
              profile={profile}
              geojson={geojson}
              valueByZone={valueByZone}
              polarity={activeLayerMeta.polarity}
              legendLabel={activeLayerMeta.label}
              selectedZoneId={zoneId}
              onZoneClick={setZoneId}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Spinner label="Loading environmental layers…" />
            </div>
          )}
          <div className="absolute bottom-3 left-3 z-500 rounded-xl border border-line bg-white/85 px-3 py-2 backdrop-blur">
            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-dim">{activeLayerMeta.label}</div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium text-ink-dim">
                {activeLayerMeta.polarity === "goodLow" ? "Low" : "Poor"}
              </span>
              <div
                className="h-1.5 w-24 rounded-full"
                style={{
                  background:
                    activeLayerMeta.polarity === "goodLow"
                      ? "linear-gradient(to right, #16a34a, #f59e0b, #ef4444)"
                      : "linear-gradient(to right, #ef4444, #f59e0b, #16a34a)",
                }}
              />
              <span className="text-[10px] font-medium text-ink-dim">
                {activeLayerMeta.polarity === "goodLow" ? "High" : "Good"}
              </span>
            </div>
          </div>
        </div>
        <p className="mt-2 px-1 text-xs text-ink-faint">Click a zone on the map to select it for intervention simulation.</p>
      </Card>

      {/* Intervention simulator */}
      <Card title="Simulate Interventions" subtitle={`Target zone: ${profile.zones.find((z) => z.zoneId === zoneId)?.name ?? "—"}`} icon={Sparkles}>
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-dim">Zone</label>
            <select
              value={zoneId}
              onChange={(e) => setZoneId(e.target.value)}
              className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink outline-none transition focus:border-brand focus:ring-4 focus:ring-[#DCFCE7]"
            >
              {profile.zones.map((z) => (
                <option key={z.zoneId} value={z.zoneId}>
                  {z.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-dim">Interventions</label>
            <div className="flex flex-wrap gap-1.5">
              {ENV_INTERVENTION_LIST.map((i) => (
                <button
                  key={i.key}
                  onClick={() => toggleIntervention(i.key)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                    selected.has(i.key)
                      ? "bg-brand-dark text-white"
                      : "border border-line bg-surface text-ink-dim hover:bg-surface-alt hover:text-ink"
                  }`}
                >
                  {i.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={runSimulation}
            disabled={loading || selected.size === 0}
            className="w-full rounded-full bg-linear-to-br from-brand to-brand-2 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-brand/25 transition hover:-translate-y-px hover:shadow-lg hover:shadow-brand/30 disabled:opacity-40 disabled:shadow-none disabled:hover:translate-y-0"
          >
            {loading ? "Simulating…" : "Run Environmental Simulation"}
          </button>

          {error && <p className="text-sm text-red-600">{error}</p>}

          {result && !loading && (
            <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface-alt/60 p-4">
              <div className="flex items-center gap-4">
                <ScoreDial score={result.result.after.sustainabilityScore} polarity="goodHigh" size={92} label="Sustainability" />
                <div className="flex flex-1 items-center gap-3">
                  <span className="text-sm font-medium text-ink-dim">Resilience</span>
                  <span className="text-lg font-extrabold tabular-nums text-ink">{result.result.before.resilience}</span>
                  <span aria-hidden className="text-ink-faint">→</span>
                  <span className="text-lg font-extrabold tabular-nums text-ink">{result.result.after.resilience}</span>
                  <Badge tone={result.result.deltas.resilienceDelta >= 0 ? "green" : "red"}>
                    {result.result.deltas.resilienceDelta >= 0 ? "+" : ""}
                    {fmt(result.result.deltas.resilienceDelta)}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <Stat label="Flood reduction" value={`${fmt(result.result.deltas.floodReductionPct)} pp`} />
                <Stat label="Urban cooling" value={`${fmt(result.result.deltas.urbanTempReductionC)} °C`} />
                <Stat label="Carbon absorbed" value={`${fmt(result.result.deltas.carbonAbsorptionKgPerYear)} kg/yr`} />
                <Stat label="Drainage improved" value={`${fmt(result.result.deltas.drainageImprovementPct)} pp`} />
                <Stat label="Green coverage" value={`+${fmt(result.result.deltas.greenCoverageIncreasePct)} pp`} />
                <Stat label="Maintenance" value={`₱${fmt(result.result.deltas.maintenanceCostPerYear)}/yr`} />
              </div>

              <p className="whitespace-pre-line text-sm leading-relaxed text-ink-dim">{result.explanation}</p>
              <p className="text-xs text-ink-faint">
                Decision-support estimate from a simplified model — not an engineering prediction.
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
