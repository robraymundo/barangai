/** Small, dependency-free presentational primitives shared across the dashboard. */

import type { ReactNode } from "react";

export function Card({
  title,
  subtitle,
  icon,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  icon?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-neutral-200 bg-white shadow-sm ${className}`}
    >
      {(title || subtitle) && (
        <header className="border-b border-neutral-100 px-5 py-4">
          {title && (
            <h2 className="flex items-center gap-2 text-base font-semibold text-neutral-900">
              {icon && <span aria-hidden>{icon}</span>}
              {title}
            </h2>
          )}
          {subtitle && <p className="mt-0.5 text-sm text-neutral-500">{subtitle}</p>}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-xl bg-neutral-50 px-4 py-3">
      <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-neutral-900">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-neutral-500">{hint}</div>}
    </div>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "green" | "amber" | "red" | "blue" }) {
  const tones: Record<string, string> = {
    neutral: "bg-neutral-100 text-neutral-700",
    green: "bg-green-100 text-green-800",
    amber: "bg-amber-100 text-amber-800",
    red: "bg-red-100 text-red-800",
    blue: "bg-blue-100 text-blue-800",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-neutral-500">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-600" />
      {label ?? "Loading…"}
    </div>
  );
}

/** Interpolate red→amber→green where t=1 is "good". */
export function scoreColor(score: number, polarity: "goodHigh" | "goodLow"): string {
  const t = Math.max(0, Math.min(1, polarity === "goodHigh" ? score / 100 : 1 - score / 100));
  // red #dc2626 -> amber #f59e0b -> green #16a34a
  const stops = [
    { p: 0, c: [220, 38, 38] },
    { p: 0.5, c: [245, 158, 11] },
    { p: 1, c: [22, 163, 74] },
  ];
  let a = stops[0];
  let b = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i].p && t <= stops[i + 1].p) {
      a = stops[i];
      b = stops[i + 1];
      break;
    }
  }
  const span = b.p - a.p || 1;
  const k = (t - a.p) / span;
  const rgb = a.c.map((av, i) => Math.round(av + (b.c[i] - av) * k));
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

/** Circular gauge (SVG). `polarity` picks the color direction. */
export function ScoreDial({
  score,
  polarity = "goodHigh",
  size = 128,
  label,
}: {
  score: number;
  polarity?: "goodHigh" | "goodLow";
  size?: number;
  label?: string;
}) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const frac = Math.max(0, Math.min(100, score)) / 100;
  const color = scoreColor(score, polarity);
  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Score ${score} of 100`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" className="fill-neutral-900" style={{ fontSize: size * 0.26, fontWeight: 700 }}>
          {Math.round(score)}
        </text>
      </svg>
      {label && <div className="mt-1 text-sm font-medium text-neutral-600">{label}</div>}
    </div>
  );
}
