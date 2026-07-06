"use client";

import { useState } from "react";
import { Route, ShieldCheck, Wind, Users, Siren, Store, Smile, MapPin, MessagesSquare } from "lucide-react";
import type { SimulateResponse } from "@/lib/client/api";
import { api } from "@/lib/client/api";
import { Alert, Badge, Button, Card, EmptyState, Spinner } from "@/components/ui";
import { POLICY_TEMPLATES, type PolicySimulationResult } from "@/lib/scoring/policy";

function fmt(n: number): string {
  return n.toLocaleString("en-PH", { maximumFractionDigits: 1 });
}
function signed(n: number, suffix = ""): string {
  return `${n >= 0 ? "+" : ""}${fmt(n)}${suffix}`;
}

interface Run {
  id: string;
  result: PolicySimulationResult;
  explanation: string;
}

const METRIC_DEFS: Array<{
  key: keyof PolicySimulationResult["metrics"];
  label: string;
  icon: typeof Route;
  suffix: string;
  goodDirection: -1 | 1; // -1 means lower is better
}> = [
  { key: "trafficCongestionPct", label: "Traffic congestion", icon: Route, suffix: "%", goodDirection: -1 },
  { key: "travelTimeMin", label: "Travel time", icon: Route, suffix: " min", goodDirection: -1 },
  { key: "airPollutionPct", label: "Air pollution", icon: Wind, suffix: "%", goodDirection: -1 },
  { key: "accessibilityPct", label: "Public accessibility", icon: MapPin, suffix: "%", goodDirection: 1 },
  { key: "emergencyResponseMin", label: "Emergency response", icon: Siren, suffix: " min", goodDirection: -1 },
  { key: "businessActivityPct", label: "Business activity", icon: Store, suffix: "%", goodDirection: 1 },
  { key: "communitySatisfactionPct", label: "Community satisfaction", icon: Smile, suffix: "%", goodDirection: 1 },
  { key: "estimatedBeneficiaries", label: "Estimated beneficiaries", icon: Users, suffix: "", goodDirection: 1 },
];

export default function PolicyImpactSimulator({
  onSimulated,
}: {
  onSimulated?: (res: SimulateResponse) => void;
}) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);

  async function run(q: string) {
    const query = q.trim();
    if (!query) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.policySimulate(query);
      const entry: Run = { id: `${Date.now()}`, result: res.result, explanation: res.explanation };
      setRuns((prev) => [...prev, entry]);
      onSimulated?.({
        params: { intervention: "custom", targetZoneId: res.result.zoneId, rawText: query },
        result: {
          before: { resilience: res.result.before.resilience, vulnerabilityByZone: {} },
          after: { resilience: res.result.after.resilience, vulnerabilityByZone: {} },
          deltas: { resilience: res.result.resilienceDelta },
          appliedTo: { intervention: "custom", targetZoneId: res.result.zoneId, rawText: query },
        },
        explanation: res.explanation,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Simulation failed");
    } finally {
      setLoading(false);
    }
  }

  const latest = runs[runs.length - 1];

  return (
    <div className="flex flex-col gap-5">
      <Card title="Ask a Policy Question" subtitle="Natural language, or pick a template below" icon={ShieldCheck}>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && run(question)}
              placeholder="e.g. What if tricycle terminals are relocated?"
              className="flex-1 rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink placeholder-ink-faint outline-none transition focus:border-brand focus:ring-4 focus:ring-brand-light"
              aria-label="Policy question"
            />
            <Button onClick={() => run(question)} disabled={loading || !question.trim()}>
              {loading ? "Simulating…" : "Simulate"}
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {POLICY_TEMPLATES.map((t) => (
              <button
                key={t.type}
                onClick={() => setQuestion(t.example)}
                disabled={loading}
                className="rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink-dim transition hover:bg-surface-alt hover:text-ink disabled:opacity-40"
              >
                {t.example}
              </button>
            ))}
          </div>
          {loading && <Spinner label="Running deterministic model + AI explanation…" />}
          {error && <Alert>{error}</Alert>}
        </div>
      </Card>

      {runs.length === 0 && !loading && !error && (
        <EmptyState
          icon={MessagesSquare}
          title="No policy simulations yet"
          hint="Ask a question above or pick a template — run several to unlock a side-by-side scenario comparison."
        />
      )}

      {latest && !loading && (
        <Card title={latest.result.typeLabel} subtitle={`Applied to ${latest.result.zoneName}`}>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-ink-dim">Community Resilience</span>
              <span className="text-lg font-extrabold tabular-nums text-ink">{latest.result.before.resilience}</span>
              <span aria-hidden className="text-ink-faint">→</span>
              <span className="text-lg font-extrabold tabular-nums text-ink">{latest.result.after.resilience}</span>
              <Badge tone={latest.result.resilienceDelta >= 0 ? "green" : "red"}>
                {latest.result.resilienceDelta >= 0 ? "+" : ""}
                {fmt(latest.result.resilienceDelta)}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {METRIC_DEFS.map((m) => {
                const value = latest.result.metrics[m.key];
                const good = m.goodDirection === -1 ? value <= 0 : value >= 0;
                return (
                  <div key={m.key} className="rounded-lg border border-line bg-surface px-3 py-2">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-ink-dim">
                      <m.icon size={12} strokeWidth={2.25} aria-hidden />
                      {m.label}
                    </div>
                    <div className={`text-sm font-bold tabular-nums ${m.key === "estimatedBeneficiaries" ? "text-ink" : good ? "text-brand" : "text-danger"}`}>
                      {m.key === "estimatedBeneficiaries" ? fmt(value) : signed(value, m.suffix)}
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="whitespace-pre-line text-sm leading-relaxed text-ink-dim">{latest.explanation}</p>
            <p className="text-xs text-ink-faint">
              Decision-support estimate from a simplified model — not an engineering prediction.
            </p>
          </div>
        </Card>
      )}

      {runs.length > 1 && (
        <Card title="Compare Scenarios" subtitle={`${runs.length} policy simulations run this session`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-150 border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-ink-dim">
                  <th className="py-2 pr-3">Policy</th>
                  <th className="py-2 pr-3">Resilience Δ</th>
                  {METRIC_DEFS.map((m) => (
                    <th key={m.key} className="py-2 pr-3">{m.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id} className="border-b border-line transition-colors last:border-0 hover:bg-surface-alt/50">
                    <td className="py-2.5 pr-3 font-semibold text-ink">{r.result.typeLabel}</td>
                    <td className="py-2.5 pr-3 tabular-nums">
                      <Badge tone={r.result.resilienceDelta >= 0 ? "green" : "red"}>
                        {r.result.resilienceDelta >= 0 ? "+" : ""}
                        {fmt(r.result.resilienceDelta)}
                      </Badge>
                    </td>
                    {METRIC_DEFS.map((m) => (
                      <td key={m.key} className="py-2.5 pr-3 tabular-nums text-ink-dim">
                        {m.key === "estimatedBeneficiaries" ? fmt(r.result.metrics[m.key]) : signed(r.result.metrics[m.key], m.suffix)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
