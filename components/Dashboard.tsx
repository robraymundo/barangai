"use client";

import { useEffect, useMemo, useState } from "react";
import {
  api,
  type ResilienceResponse,
  type SimulateResponse,
  type TwinResponse,
  type VulnerabilityResponse,
} from "@/lib/client/api";
import { Spinner, Badge, Card } from "@/components/ui";
import CommunityMap from "@/components/map/CommunityMap";
import ScenarioSimulator from "@/components/panels/ScenarioSimulator";
import ResiliencePanel, { type TimelinePoint } from "@/components/panels/ResiliencePanel";
import VulnerabilityPanel from "@/components/panels/VulnerabilityPanel";
import BudgetOptimizer from "@/components/panels/BudgetOptimizer";

type TabKey = "simulate" | "resilience" | "vulnerability" | "budget" | "info";

const TABS: Array<{ key: TabKey; label: string; icon: string }> = [
  { key: "simulate", label: "Simulate", icon: "🤖" },
  { key: "resilience", label: "Resilience", icon: "📊" },
  { key: "vulnerability", label: "Vulnerability", icon: "🏘️" },
  { key: "budget", label: "Budget", icon: "💰" },
  { key: "info", label: "Info", icon: "ℹ️" },
];

function DockButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`flex h-11 w-11 items-center justify-center rounded-xl text-lg transition ${
        active
          ? "bg-emerald-500 text-neutral-950 shadow-lg shadow-emerald-500/30"
          : "text-neutral-300 hover:bg-white/10 hover:text-white"
      }`}
    >
      <span aria-hidden>{icon}</span>
    </button>
  );
}

function GlassChip({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`pointer-events-auto rounded-2xl border border-white/10 bg-neutral-900/70 shadow-lg shadow-black/30 backdrop-blur-xl ${className}`}
    >
      {children}
    </div>
  );
}

export default function Dashboard() {
  const [twin, setTwin] = useState<TwinResponse | null>(null);
  const [resilience, setResilience] = useState<ResilienceResponse | null>(null);
  const [vuln, setVuln] = useState<VulnerabilityResponse | null>(null);
  const [sims, setSims] = useState<SimulateResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey | null>("simulate");

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
      <div className="flex h-dvh w-full items-center justify-center bg-neutral-950 p-8">
        <div className="max-w-md rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      </div>
    );
  }

  if (!twin || !resilience || !vuln) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-neutral-950">
        <Spinner label="Loading BarangAI digital twin…" />
      </div>
    );
  }

  const toggle = (key: TabKey) => setActiveTab((prev) => (prev === key ? null : key));

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-neutral-950 text-neutral-100">
      {/* Map fills the entire viewport as the base layer. */}
      <div className="absolute inset-0 z-0">
        <CommunityMap profile={twin.profile} geojson={twin.geojson} vulnerabilityByZone={vulnerabilityByZone} />
      </div>

      {/* Subtle scrims behind the overlays for legibility over map tiles. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-32 bg-linear-to-b from-black/50 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-24 bg-linear-to-t from-black/40 to-transparent" />

      {/* Top bar: brand + live resilience readout. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-4 p-4">
        <GlassChip className="pointer-events-auto flex items-center gap-2.5 px-4 py-2.5">
          <span className="text-lg" aria-hidden>
            🌟
          </span>
          <div>
            <div className="text-sm font-semibold leading-none text-neutral-50">BarangAI</div>
            <div className="mt-0.5 text-[11px] text-neutral-400">
              {twin.profile.name} · {twin.profile.city}
            </div>
          </div>
        </GlassChip>

        <GlassChip className="pointer-events-auto flex items-center gap-2 px-4 py-2.5">
          <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">Resilience</span>
          <span className="text-xl font-bold tabular-nums text-neutral-50">{Math.round(currentScore)}</span>
          {sims.length > 0 && (
            <Badge tone={currentScore >= baseline ? "green" : "red"}>
              {currentScore >= baseline ? "+" : ""}
              {Math.round((currentScore - baseline) * 10) / 10}
            </Badge>
          )}
        </GlassChip>
      </div>

      {/* Legend: what the map coloring means. */}
      <div className="pointer-events-none absolute bottom-4 left-4 z-30 hidden sm:block">
        <GlassChip className="pointer-events-auto px-3 py-2.5">
          <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-neutral-400">
            Vulnerability
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-neutral-400">Low</span>
            <div
              className="h-1.5 w-24 rounded-full"
              style={{ background: "linear-gradient(to right, #22c55e, #f59e0b, #ef4444)" }}
            />
            <span className="text-[10px] text-neutral-400">High</span>
          </div>
        </GlassChip>
      </div>

      {/* Sliding panel — mounts every feature but only shows the active one, so switching
          tabs never resets typed input or computed results. */}
      <div
        className={`fixed z-20 overflow-y-auto rounded-2xl border border-white/10 bg-neutral-900/80 p-4 shadow-2xl shadow-black/40 backdrop-blur-xl transition-all duration-200 ease-out
          inset-x-4 bottom-24 max-h-[65vh]
          sm:inset-x-auto sm:bottom-4 sm:left-auto sm:right-24 sm:top-20 sm:max-h-none sm:w-100
          ${activeTab ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0 sm:translate-x-4 sm:translate-y-0"}`}
      >
        <button
          onClick={() => setActiveTab(null)}
          aria-label="Close panel"
          className="absolute right-3 top-3 z-10 rounded-lg p-1 text-neutral-500 transition hover:bg-white/5 hover:text-neutral-200"
        >
          ✕
        </button>

        <div className={activeTab === "simulate" ? "" : "hidden"}>
          <ScenarioSimulator onSimulated={(res) => setSims((prev) => [...prev, res])} />
        </div>
        <div className={activeTab === "resilience" ? "" : "hidden"}>
          <ResiliencePanel score={currentScore} components={resilience.components} timeline={timeline} />
        </div>
        <div className={activeTab === "vulnerability" ? "" : "hidden"}>
          <VulnerabilityPanel ranked={vuln.ranked} summary={vuln.summary} recommendations={vuln.recommendations} />
        </div>
        <div className={activeTab === "budget" ? "" : "hidden"}>
          <BudgetOptimizer />
        </div>
        <div className={activeTab === "info" ? "" : "hidden"}>
          <Card bare title="About this demo" icon="ℹ️">
            <div className="flex flex-col gap-3 text-sm text-neutral-300">
              <p className="leading-relaxed">
                BarangAI outputs are decision-support estimates from simplified models, intended
                for scenario comparison — not engineering-grade predictions.
              </p>
              <div>
                <div className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Data sources
                </div>
                <ul className="list-inside list-disc space-y-0.5 text-neutral-400">
                  {twin.profile.dataSources.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Dock rail — always visible; toggles which panel slides in. */}
      <div
        className="pointer-events-auto fixed z-30 flex gap-1.5 rounded-2xl border border-white/10 bg-neutral-900/70 p-1.5 shadow-lg shadow-black/30 backdrop-blur-xl
          bottom-4 left-1/2 -translate-x-1/2 flex-row
          sm:bottom-auto sm:left-auto sm:right-4 sm:top-1/2 sm:translate-x-0 sm:-translate-y-1/2 sm:flex-col"
      >
        {TABS.map((t) => (
          <DockButton key={t.key} active={activeTab === t.key} icon={t.icon} label={t.label} onClick={() => toggle(t.key)} />
        ))}
      </div>
    </div>
  );
}
