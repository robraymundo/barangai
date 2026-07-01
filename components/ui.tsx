/** Small, dependency-free presentational primitives shared across the dashboard. */

import type { ReactNode } from "react";

export function Card({
  title,
  subtitle,
  icon,
  children,
  className = "",
  bare = false,
}: {
  title?: string;
  subtitle?: string;
  icon?: string;
  children: ReactNode;
  className?: string;
  /** Render without the glass surface/border — used inside a container that already
   *  provides one (e.g. the dashboard's floating dock panel), to avoid box-in-a-box. */
  bare?: boolean;
}) {
  const header = (title || subtitle) && (
    <header className={bare ? "mb-4" : "border-b border-white/10 px-5 py-4"}>
      {title && (
        <h2 className="flex items-center gap-2 text-base font-semibold text-neutral-50">
          {icon && <span aria-hidden>{icon}</span>}
          {title}
        </h2>
      )}
      {subtitle && <p className="mt-0.5 text-sm text-neutral-400">{subtitle}</p>}
    </header>
  );

  if (bare) {
    return (
      <div className={className}>
        {header}
        {children}
      </div>
    );
  }

  return (
    <section
      className={`rounded-2xl border border-white/10 bg-neutral-900/60 shadow-xl shadow-black/20 backdrop-blur-xl ${className}`}
    >
      {header}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-xl bg-white/5 px-4 py-3">
      <div className="text-xs font-medium uppercase tracking-wide text-neutral-400">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-neutral-50">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-neutral-400">{hint}</div>}
    </div>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "green" | "amber" | "red" | "blue" }) {
  const tones: Record<string, string> = {
    neutral: "bg-white/10 text-neutral-300 ring-1 ring-inset ring-white/10",
    green: "bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-500/30",
    amber: "bg-amber-500/15 text-amber-300 ring-1 ring-inset ring-amber-500/30",
    red: "bg-red-500/15 text-red-300 ring-1 ring-inset ring-red-500/30",
    blue: "bg-sky-500/15 text-sky-300 ring-1 ring-inset ring-sky-500/30",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-neutral-400">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-700 border-t-emerald-400" />
      {label ?? "Loading…"}
    </div>
  );
}

/** Interpolate red→amber→green where t=1 is "good". Tuned brighter for dark backgrounds. */
export function scoreColor(score: number, polarity: "goodHigh" | "goodLow"): string {
  const t = Math.max(0, Math.min(1, polarity === "goodHigh" ? score / 100 : 1 - score / 100));
  // red-500 -> amber-500 -> green-500
  const stops = [
    { p: 0, c: [239, 68, 68] },
    { p: 0.5, c: [245, 158, 11] },
    { p: 1, c: [34, 197, 94] },
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
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#27272a" strokeWidth={stroke} />
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
          style={{ transition: "stroke-dashoffset 500ms ease, stroke 500ms ease" }}
        />
        <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" className="fill-neutral-50" style={{ fontSize: size * 0.26, fontWeight: 700 }}>
          {Math.round(score)}
        </text>
      </svg>
      {label && <div className="mt-1 text-sm font-medium text-neutral-400">{label}</div>}
    </div>
  );
}
