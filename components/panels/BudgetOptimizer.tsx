"use client";

import { useState } from "react";
import type { ProjectCandidate } from "@/types";
import { api, type BudgetResponse } from "@/lib/client/api";
import { Card, Badge, Spinner } from "@/components/ui";

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
    <Card title="AI Budget Optimization" subtitle="Rank projects for the greatest community value" icon="💰">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="flex-1 text-sm">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-neutral-500">
              Available budget (PHP)
            </span>
            <input
              type="number"
              min={0}
              step={500_000}
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm tabular-nums outline-none focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200"
            />
          </label>
          <button
            onClick={run}
            disabled={loading || budget <= 0}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:opacity-40"
          >
            {loading ? "Optimizing…" : "Optimize"}
          </button>
        </div>

        <p className="text-xs text-neutral-500">
          {DEFAULT_PROJECTS.length} candidate projects · exact knapsack maximizes total benefit under budget.
        </p>

        {loading && <Spinner />}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {data && !loading && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge tone="green">{data.result.selected.length} funded</Badge>
              <span className="text-neutral-500">
                {peso(data.result.totalCost)} of {peso(data.result.budget)} · total benefit{" "}
                {Math.round(data.result.totalBenefit)}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-neutral-700">{data.summary}</p>

            <ul className="flex flex-col gap-2">
              {data.result.selected.map((s) => (
                <li key={s.project.id} className="rounded-lg border border-green-200 bg-green-50/60 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-neutral-800">✓ {s.project.name}</span>
                    <span className="text-xs text-neutral-500 tabular-nums">
                      {peso(s.project.cost)} · benefit {Math.round(s.benefit)}
                    </span>
                  </div>
                  {data.perProject[s.project.id] && (
                    <p className="mt-0.5 text-xs text-neutral-600">{data.perProject[s.project.id]}</p>
                  )}
                </li>
              ))}
              {data.result.rejected.map((r) => (
                <li key={r.project.id} className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 opacity-70">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-neutral-600">✕ {r.project.name}</span>
                    <span className="text-xs text-neutral-400 tabular-nums">
                      {peso(r.project.cost)} · benefit {Math.round(r.benefit)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}
