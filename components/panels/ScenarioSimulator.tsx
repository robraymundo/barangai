"use client";

import { useState } from "react";
import { FlaskConical } from "lucide-react";
import { api, type SimulateResponse } from "@/lib/client/api";
import { Card, Badge, Spinner } from "@/components/ui";

const EXAMPLES = [
  "What if we build a new evacuation center here?",
  "What if we plant 500 trees?",
  "What if this vacant lot becomes a public park?",
  "What if this road becomes one-way?",
  "What if motorcycles are diverted from this road?",
];

function fmt(n: number): string {
  return n.toLocaleString("en-PH", { maximumFractionDigits: 1 });
}

function DeltaGrid({ res }: { res: SimulateResponse }) {
  const d = res.result.deltas;
  const items: Array<{ label: string; value: string }> = [];
  if (d.floodReduction != null) items.push({ label: "Flood reduction", value: `${fmt(d.floodReduction)} pp` });
  if (d.trafficChange != null) items.push({ label: "Traffic change", value: `${fmt(d.trafficChange)}%` });
  if (d.carbonAbsorptionKgPerYear != null) items.push({ label: "Carbon absorbed", value: `${fmt(d.carbonAbsorptionKgPerYear)} kg/yr` });
  if (d.urbanHeatReductionC != null) items.push({ label: "Urban cooling", value: `${fmt(d.urbanHeatReductionC)} °C` });
  if (d.estimatedBeneficiaries != null) items.push({ label: "Beneficiaries", value: fmt(d.estimatedBeneficiaries) });
  if (d.maintenanceCostPerYear != null) items.push({ label: "Maintenance", value: `₱${fmt(d.maintenanceCostPerYear)}/yr` });
  if (!items.length) return null;
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {items.map((it) => (
        <div key={it.label} className="rounded-lg bg-white/5 px-3 py-2">
          <div className="text-xs text-neutral-400">{it.label}</div>
          <div className="text-sm font-semibold tabular-nums text-neutral-50">{it.value}</div>
        </div>
      ))}
    </div>
  );
}

export default function ScenarioSimulator({
  onSimulated,
}: {
  onSimulated?: (res: SimulateResponse) => void;
}) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [res, setRes] = useState<SimulateResponse | null>(null);

  async function run(q: string) {
    const query = q.trim();
    if (!query) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.simulate(query);
      setRes(data);
      onSimulated?.(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Simulation failed");
    } finally {
      setLoading(false);
    }
  }

  const delta = res?.result.deltas.resilience ?? 0;

  return (
    <Card bare title="AI Scenario Simulator" subtitle="Ask a what-if question about a project or policy" icon={FlaskConical}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run(question)}
            placeholder="e.g. What if we build a park?"
            className="flex-1 rounded-lg border border-white/10 bg-neutral-800/60 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20"
            aria-label="Scenario question"
          />
          <button
            onClick={() => run(question)}
            disabled={loading || !question.trim()}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-emerald-400 disabled:opacity-40"
          >
            {loading ? "Simulating…" : "Simulate"}
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => setQuestion(ex)}
              disabled={loading}
              className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-neutral-400 transition hover:border-emerald-500/40 hover:text-emerald-300 disabled:opacity-40"
            >
              {ex}
            </button>
          ))}
        </div>

        {loading && <Spinner label="Running deterministic model + AI explanation…" />}
        {error && <p className="text-sm text-red-400">{error}</p>}

        {res && !loading && (
          <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-3">
              <span className="text-sm text-neutral-400">Community Resilience</span>
              <span className="text-lg font-semibold tabular-nums text-neutral-50">{res.result.before.resilience}</span>
              <span aria-hidden className="text-neutral-500">→</span>
              <span className="text-lg font-semibold tabular-nums text-neutral-50">{res.result.after.resilience}</span>
              <Badge tone={delta > 0 ? "green" : delta < 0 ? "red" : "neutral"}>
                {delta > 0 ? "+" : ""}
                {fmt(delta)}
              </Badge>
            </div>
            <DeltaGrid res={res} />
            <p className="whitespace-pre-line text-sm leading-relaxed text-neutral-300">{res.explanation}</p>
            <p className="text-xs text-neutral-500">
              Decision-support estimate from a simplified model — not an engineering prediction.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
