"use client";

import { useState } from "react";
import { Wallet } from "lucide-react";
import type { ProjectCandidate } from "@/types";
import { api, type BudgetResponse } from "@/lib/client/api";
import { Alert, Badge, Button, EmptyState, Spinner } from "@/components/ui";

/** Seeded, Alibagu-relevant candidate projects for a one-click demo. */
const DEFAULT_PROJECTS: ProjectCandidate[] = [
  { id: "evac", name: "Riverside Evacuation Center", cost: 8_000_000, communityImpact: 88, urgency: 90, beneficiaries: 3200, maintenanceCostPerYear: 250_000, climateResilience: 70, targetZoneId: "Z01" },
  { id: "drainage", name: "Purok 1 Drainage Upgrade", cost: 6_000_000, communityImpact: 80, urgency: 85, beneficiaries: 3200, maintenanceCostPerYear: 120_000, climateResilience: 80, targetZoneId: "Z01" },
  { id: "health", name: "Purok 5 Health Station", cost: 25_000_000, communityImpact: 85, urgency: 70, beneficiaries: 1950, maintenanceCostPerYear: 1_200_000, climateResilience: 60, targetZoneId: "Z05" },
  { id: "road", name: "Farm-to-Market Road (Purok 4)", cost: 5_000_000, communityImpact: 70, urgency: 65, beneficiaries: 2400, maintenanceCostPerYear: 150_000, climateResilience: 55, targetZoneId: "Z04" },
  { id: "trees", name: "Riverside Tree Planting (2,000)", cost: 600_000, communityImpact: 45, urgency: 40, beneficiaries: 3200, maintenanceCostPerYear: 80_000, climateResilience: 85, targetZoneId: "Z01" },
  { id: "park", name: "Highway Pocket Park", cost: 3_000_000, communityImpact: 55, urgency: 40, beneficiaries: 3650, maintenanceCostPerYear: 200_000, climateResilience: 75, targetZoneId: "Z03" },
];

function peso(n: number): string {
  return `₱${n.toLocaleString("en-PH")}`;
}

export default function BudgetOptimizer() {
  const [budget, setBudget] = useState(15_000_000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<BudgetResponse | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      setData(await api.budget(budget, DEFAULT_PROJECTS));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Optimization failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="flex-1 text-sm">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-dim">
              Available budget (PHP)
            </span>
            <input
              type="number"
              min={0}
              step={500_000}
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm tabular-nums text-ink outline-none transition focus:border-brand focus:ring-4 focus:ring-[#DCFCE7]"
            />
          </label>
          <Button onClick={run} disabled={loading || budget <= 0}>
            {loading ? "Optimizing…" : "Optimize"}
          </Button>
        </div>

        <p className="text-xs text-ink-faint">
          {DEFAULT_PROJECTS.length} candidate projects · exact knapsack maximizes total benefit under budget.
        </p>

        {loading && <Spinner />}
        {error && <Alert>{error}</Alert>}

        {!data && !loading && !error && (
          <EmptyState
            icon={Wallet}
            title="No optimization yet"
            hint="Set your available budget and press Optimize — the knapsack solver will pick the project mix with the greatest community value."
          />
        )}

        {data && !loading && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge tone="green">{data.result.selected.length} funded</Badge>
              <span className="text-ink-dim">
                {peso(data.result.totalCost)} of {peso(data.result.budget)} · total benefit{" "}
                {Math.round(data.result.totalBenefit)}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-ink-dim">{data.summary}</p>

            <ul className="flex flex-col gap-2">
              {data.result.selected.map((s) => (
                <li key={s.project.id} className="rounded-xl border border-[#BBE7C8] bg-[#DCFCE7]/60 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-ink">✓ {s.project.name}</span>
                    <span className="text-xs tabular-nums text-ink-dim">
                      {peso(s.project.cost)} · benefit {Math.round(s.benefit)}
                    </span>
                  </div>
                  {data.perProject[s.project.id] && (
                    <p className="mt-0.5 text-xs text-ink-dim">{data.perProject[s.project.id]}</p>
                  )}
                </li>
              ))}
              {data.result.rejected.map((r) => (
                <li key={r.project.id} className="rounded-xl border border-line bg-surface-alt/50 px-3 py-2 opacity-70">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-ink-dim">✕ {r.project.name}</span>
                    <span className="text-xs tabular-nums text-ink-faint">
                      {peso(r.project.cost)} · benefit {Math.round(r.benefit)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
        </div>
      )}
    </div>
  );
}
