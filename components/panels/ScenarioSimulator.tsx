"use client";

import { useState } from "react";
import { FlaskConical } from "lucide-react";
import { api, type SimulateResponse } from "@/lib/client/api";
import { Alert, Badge, Button, EmptyState, Spinner } from "@/components/ui";

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
        <div key={it.label} className="rounded-lg border border-line bg-surface px-3 py-2">
          <div className="text-xs font-medium text-ink-dim">{it.label}</div>
          <div className="text-sm font-bold tabular-nums text-ink">{it.value}</div>
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
    <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run(question)}
            placeholder="e.g. What if we build a park?"
            className="flex-1 rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink placeholder-ink-faint outline-none transition focus:border-brand focus:ring-4 focus:ring-[#DCFCE7]"
            aria-label="Scenario question"
          />
          <Button onClick={() => run(question)} disabled={loading || !question.trim()}>
            {loading ? "Simulating…" : "Simulate"}
          </Button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => setQuestion(ex)}
              disabled={loading}
              className="rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink-dim transition hover:bg-surface-alt hover:text-ink disabled:opacity-40"
            >
              {ex}
            </button>
          ))}
        </div>

        {loading && <Spinner label="Running deterministic model + AI explanation…" />}
        {error && <Alert>{error}</Alert>}

        {!res && !loading && !error && (
          <EmptyState
            icon={FlaskConical}
            title="No simulation yet"
            hint="Ask a what-if question above or tap an example to see its projected impact on the community."
          />
        )}

        {res && !loading && (
          <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface-alt/60 p-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-ink-dim">Community Resilience</span>
              <span className="text-lg font-extrabold tabular-nums text-ink">{res.result.before.resilience}</span>
              <span aria-hidden className="text-ink-faint">→</span>
              <span className="text-lg font-extrabold tabular-nums text-ink">{res.result.after.resilience}</span>
              <Badge tone={delta > 0 ? "green" : delta < 0 ? "red" : "neutral"}>
                {delta > 0 ? "+" : ""}
                {fmt(delta)}
              </Badge>
            </div>
            <DeltaGrid res={res} />
            <p className="whitespace-pre-line text-sm leading-relaxed text-ink-dim">{res.explanation}</p>
            <p className="text-xs text-ink-faint">
              Decision-support estimate from a simplified model — not an engineering prediction.
            </p>
        </div>
      )}
    </div>
  );
}
