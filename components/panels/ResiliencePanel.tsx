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
import { ShieldCheck } from "lucide-react";
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
    background: "#ffffff",
    border: "1px solid #DCEDE2",
    borderRadius: 10,
    color: "#0B2318",
    fontSize: 12,
    boxShadow: "0 4px 14px rgba(17,24,39,0.08)",
  };
  const tickStyle = { fontSize: 10, fill: "#5C7568" };

  return (
    <Card bare title="Community Resilience Score" subtitle="Updates after every simulation" icon={ShieldCheck}>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
          <ScoreDial score={score} polarity="goodHigh" label="Current resilience" />
          <div className="h-40 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(11,35,24,0.08)" />
                <XAxis dataKey="name" tick={tickStyle} interval={0} angle={-20} textAnchor="end" height={44} />
                <YAxis domain={[0, 100]} tick={tickStyle} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${Math.round(v)}`, "Score"]} />
                <Bar dataKey="value" fill="#15803D" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-faint">
            Resilience over simulations
          </div>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeline} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,35,24,0.08)" />
                <XAxis dataKey="label" tick={tickStyle} />
                <YAxis domain={[0, 100]} tick={tickStyle} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${Math.round(v)}`, "Resilience"]} />
                <Line type="monotone" dataKey="score" stroke="#16A34A" strokeWidth={2.5} dot={{ r: 3, fill: "#16A34A" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </Card>
  );
}
