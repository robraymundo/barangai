"use client";

import { useEffect, useMemo, useState } from "react";
import {
  api,
  type ResilienceResponse,
  type SimulateResponse,
  type TwinResponse,
  type VulnerabilityResponse,
} from "@/lib/client/api";
import {
  FlaskConical,
  ShieldCheck,
  Users,
  Wallet,
  Info,
  Landmark,
  type LucideIcon,
} from "lucide-react";
import { Spinner, Badge, Card } from "@/components/ui";
import CommunityMap from "@/components/map/CommunityMap";
import ScenarioSimulator from "@/components/panels/ScenarioSimulator";
import ResiliencePanel, { type TimelinePoint } from "@/components/panels/ResiliencePanel";
import VulnerabilityPanel from "@/components/panels/VulnerabilityPanel";
import BudgetOptimizer from "@/components/panels/BudgetOptimizer";

type TabKey = "simulate" | "resilience" | "vulnerability" | "budget" | "info";

const TABS: Array<{ key: TabKey; label: string; icon: LucideIcon }> = [
  { key: "simulate", label: "Simulate", icon: FlaskConical },
  { key: "resilience", label: "Resilience", icon: ShieldCheck },
  { key: "vulnerability", label: "Vulnerability", icon: Users },
  { key: "budget", label: "Budget", icon: Wallet },
  { key: "info", label: "Info", icon: Info },
];

function DockButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`flex h-11 w-11 items-center justify-center rounded-xl transition ${
        active
          ? "bg-linear-to-br from-brand to-brand-2 text-white shadow-lg shadow-brand/30"
          : "text-ink-dim hover:bg-surface-alt hover:text-ink"
      }`}
    >
      <Icon size={19} strokeWidth={2} aria-hidden />
    </button>
  );
}

function GlassChip({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`pointer-events-auto rounded-2xl border border-line bg-white/80 shadow-[0_4px_14px_rgba(17,24,39,0.08)] backdrop-blur-xl ${className}`}
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
      <div className="flex h-dvh w-full items-center justify-center bg-page p-8">
        <div className="max-w-md rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!twin || !resilience || !vuln) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-page">
        <Spinner label="Loading BarangAI digital twin…" />
      </div>
    );
  }

  const toggle = (key: TabKey) => setActiveTab((prev) => (prev === key ? null : key));

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-page text-ink">
      {/* Map fills the entire viewport as the base layer. */}
      <div className="absolute inset-0 z-0">
        <CommunityMap profile={twin.profile} geojson={twin.geojson} vulnerabilityByZone={vulnerabilityByZone} />
      </div>

      {/* Subtle scrims behind the overlays for legibility over map tiles. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-32 bg-linear-to-b from-white/70 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-24 bg-linear-to-t from-white/50 to-transparent" />

      {/* Top bar: brand + live resilience readout. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-4 p-4">
        <GlassChip className="pointer-events-auto flex items-center gap-2.5 px-4 py-2.5">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-brand to-emerald-400 text-white shadow-md shadow-brand/30"
            aria-hidden
          >
            <Landmark size={18} strokeWidth={2} />
          </span>
          <div>
            <div className="text-sm font-extrabold leading-none text-ink">
              Barang<span className="text-brand">AI</span>
            </div>
            <div className="mt-0.5 text-[11px] font-medium text-ink-dim">
              {twin.profile.name} · {twin.profile.city}
            </div>
          </div>
        </GlassChip>

        <GlassChip className="pointer-events-auto flex items-center gap-2 px-4 py-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-dim">Resilience</span>
          <span className="text-xl font-extrabold tabular-nums text-ink">{Math.round(currentScore)}</span>
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
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-dim">
            Vulnerability
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium text-ink-dim">Low</span>
            <div
              className="h-1.5 w-24 rounded-full"
              style={{ background: "linear-gradient(to right, #16a34a, #f59e0b, #ef4444)" }}
            />
            <span className="text-[10px] font-medium text-ink-dim">High</span>
          </div>
        </GlassChip>
      </div>

      {/* Sliding panel — mounts every feature but only shows the active one, so switching
          tabs never resets typed input or computed results. */}
      <div
        className={`fixed z-20 overflow-y-auto rounded-[20px] border border-line bg-white/90 p-4 shadow-[0_20px_40px_-12px_rgba(17,24,39,0.18)] backdrop-blur-xl transition-all duration-200 ease-out
          inset-x-4 bottom-24 max-h-[65vh]
          sm:inset-x-auto sm:bottom-4 sm:left-auto sm:right-24 sm:top-20 sm:max-h-none sm:w-100
          ${activeTab ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0 sm:translate-x-4 sm:translate-y-0"}`}
      >
        <button
          onClick={() => setActiveTab(null)}
          aria-label="Close panel"
          className="absolute right-3 top-3 z-10 rounded-lg p-1 text-ink-faint transition hover:bg-surface-alt hover:text-ink"
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
          <Card bare title="About this demo" icon={Info}>
            <div className="flex flex-col gap-3 text-sm text-ink-dim">
              <p className="leading-relaxed">
                BarangAI outputs are decision-support estimates from simplified models, intended
                for scenario comparison — not engineering-grade predictions.
              </p>
              <div>
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                  Data sources
                </div>
                <ul className="list-inside list-disc space-y-0.5 text-ink-dim">
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
        className="pointer-events-auto fixed z-30 flex gap-1.5 rounded-2xl border border-line bg-white/80 p-1.5 shadow-[0_4px_14px_rgba(17,24,39,0.08)] backdrop-blur-xl
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
