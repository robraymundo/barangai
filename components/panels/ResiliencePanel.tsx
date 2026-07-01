"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ResilienceComponents } from "@/types";
import { Card, ScoreDial } from "@/components/ui";

const COMPONENT_LABELS: Record<keyof ResilienceComponents, string> = {
  disasterPreparedness: "Disaster prep",
  healthcareAccess: "Healthcare",
  infrastructureQuality: "Infrastructure",
  environmentalSustainability: "Environment",
  transportAccess: "Transport",
  emergencyResponse: "Emergency",
};

export interface TimelinePoint {
  label: string;
  score: number;
}

export default function ResiliencePanel({
  score,
  components,
  timeline,
}: {
  score: number;
  components: ResilienceComponents;
  timeline: TimelinePoint[];
}) {
  const barData = (Object.keys(COMPONENT_LABELS) as Array<keyof ResilienceComponents>).map((k) => ({
    name: COMPONENT_LABELS[k],
    value: components[k],
  }));

  const tooltipStyle = {
    background: "#171922",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8,
    color: "#e5e7eb",
    fontSize: 12,
  };
  const tickStyle = { fontSize: 10, fill: "#9ca3af" };

  return (
    <Card bare title="Community Resilience Score" subtitle="Updates after every simulation" icon="📊">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
          <ScoreDial score={score} polarity="goodHigh" label="Current resilience" />
          <div className="h-40 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="name" tick={tickStyle} interval={0} angle={-20} textAnchor="end" height={44} />
                <YAxis domain={[0, 100]} tick={tickStyle} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${Math.round(v)}`, "Score"]} />
                <Bar dataKey="value" fill="#22d3ee" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-500">
            Resilience over simulations
          </div>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeline} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="label" tick={tickStyle} />
                <YAxis domain={[0, 100]} tick={tickStyle} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${Math.round(v)}`, "Resilience"]} />
                <Line type="monotone" dataKey="score" stroke="#34d399" strokeWidth={2} dot={{ r: 3, fill: "#34d399" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </Card>
  );
}
