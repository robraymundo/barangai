"use client";

import { useEffect, useMemo, useState } from "react";
import {
  api,
  type ResilienceResponse,
  type SimulateResponse,
  type TwinResponse,
  type VulnerabilityResponse,
} from "@/lib/client/api";
import { Spinner, Badge } from "@/components/ui";
import CommunityMap from "@/components/map/CommunityMap";
import ScenarioSimulator from "@/components/panels/ScenarioSimulator";
import ResiliencePanel, { type TimelinePoint } from "@/components/panels/ResiliencePanel";
import VulnerabilityPanel from "@/components/panels/VulnerabilityPanel";
import BudgetOptimizer from "@/components/panels/BudgetOptimizer";
import { Card } from "@/components/ui";

export default function Dashboard() {
  const [twin, setTwin] = useState<TwinResponse | null>(null);
  const [resilience, setResilience] = useState<ResilienceResponse | null>(null);
  const [vuln, setVuln] = useState<VulnerabilityResponse | null>(null);
  const [sims, setSims] = useState<SimulateResponse[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.twin(), api.resilience(), api.vulnerability()])
      .then(([t, r, v]) => {
        setTwin(t);
        setResilience(r);
        setVuln(v);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load community data"));
  }, []);

  const vulnerabilityByZone = useMemo(() => {
    const map: Record<string, number> = {};
    vuln?.ranked.forEach((r) => (map[r.zoneId] = r.breakdown.score));
    return map;
  }, [vuln]);

  const baseline = resilience?.breakdown.score ?? 0;
  const currentScore = sims.length ? sims[sims.length - 1].result.after.resilience : baseline;
  const timeline: TimelinePoint[] = useMemo(
    () => [
      { label: "Baseline", score: baseline },
      ...sims.map((s, i) => ({ label: `Sim ${i + 1}`, score: s.result.after.resilience })),
    ],
    [baseline, sims],
  );

  if (error) {
    return (
      <div className="mx-auto max-w-2xl p-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      </div>
    );
  }

  if (!twin || !resilience || !vuln) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner label="Loading BarangAI digital twin…" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-neutral-900">
            🌟 BarangAI
          </h1>
          <p className="text-sm text-neutral-500">
            Digital Twin & Decision Intelligence · Barangay {twin.profile.name}, {twin.profile.city}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs uppercase tracking-wide text-neutral-400">Resilience</div>
            <div className="text-3xl font-bold tabular-nums text-neutral-900">{Math.round(currentScore)}</div>
          </div>
          {sims.length > 0 && (
            <Badge tone={currentScore >= baseline ? "green" : "red"}>
              {currentScore >= baseline ? "+" : ""}
              {Math.round((currentScore - baseline) * 10) / 10} vs baseline
            </Badge>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title="Community Analytics Dashboard" subtitle="Interactive digital twin — zones shaded by vulnerability" icon="🗺️">
            <CommunityMap profile={twin.profile} geojson={twin.geojson} vulnerabilityByZone={vulnerabilityByZone} />
          </Card>
        </div>
        <div className="lg:col-span-1">
          <ResiliencePanel score={currentScore} components={resilience.components} timeline={timeline} />
        </div>
      </div>

      <div className="mt-5">
        <ScenarioSimulator onSimulated={(res) => setSims((prev) => [...prev, res])} />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <VulnerabilityPanel ranked={vuln.ranked} summary={vuln.summary} recommendations={vuln.recommendations} />
        <BudgetOptimizer />
      </div>

      <footer className="mt-8 border-t border-neutral-100 pt-4 text-xs text-neutral-400">
        <p className="font-medium text-neutral-500">Data sources</p>
        <ul className="mt-1 list-inside list-disc">
          {twin.profile.dataSources.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
        <p className="mt-2">
          BarangAI outputs are decision-support estimates from simplified models, not engineering-grade predictions.
        </p>
      </footer>
    </div>
  );
}
