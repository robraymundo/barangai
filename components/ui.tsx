/** Small presentational primitives shared across the dashboard. */

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { AlertCircle, type LucideIcon } from "lucide-react";

export function Card({
  title,
  subtitle,
  icon: Icon,
  children,
  className = "",
  bare = false,
}: {
  title?: string;
  subtitle?: string;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
  /** Render without the card surface/border — used inside a container that already
   *  provides one (e.g. the dashboard's floating dock panel), to avoid box-in-a-box. */
  bare?: boolean;
}) {
  const header = (title || subtitle) && (
    <header className={bare ? "mb-4" : "border-b border-line px-5 py-4"}>
      {title && (
        <h2 className="flex items-center gap-2 text-base font-bold text-ink">
          {Icon && <Icon size={18} strokeWidth={2} className="text-brand" aria-hidden />}
          {title}
        </h2>
      )}
      {subtitle && <p className="mt-0.5 text-sm text-ink-dim">{subtitle}</p>}
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
    <section className={`rounded-[20px] border border-line bg-surface shadow-card ${className}`}>
      {header}
      <div className="p-5">{children}</div>
    </section>
  );
}

/** Standard button. `primary` for the one main action per view, `ghost` for the rest. */
export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" }) {
  const variants = {
    primary:
      "bg-linear-to-br from-brand to-brand-2 text-white shadow-md shadow-brand/25 hover:-translate-y-px hover:shadow-lg hover:shadow-brand/30 active:translate-y-0 active:scale-[0.98]",
    ghost: "border border-line bg-surface text-ink hover:bg-surface-alt",
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition disabled:opacity-40 disabled:shadow-none disabled:hover:translate-y-0 ${variants[variant]} ${className}`}
      {...props}
    />
  );
}

export interface ZoneOption {
  zoneId: string;
  name: string;
}

/** Labeled zone picker, shared by the Scenario, Policy, and Climate simulators so a
 *  simulation can be scoped to a specific barangay zone. */
export function ZoneSelect({
  value,
  onChange,
  zones,
  className = "",
  label = "Zone",
}: {
  value: string;
  onChange: (zoneId: string) => void;
  zones: ZoneOption[];
  className?: string;
  label?: string;
}) {
  return (
    <label className={`block ${className}`}>
      {/* ps-3 matches the select's px-3 padding so the label lines up with the field's
          value text rather than its left border. */}
      <span className="mb-1.5 block ps-3 text-xs font-semibold uppercase tracking-wide text-ink-dim">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Target zone"
        className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink outline-none transition focus:border-brand focus:ring-4 focus:ring-brand-light"
      >
        {zones.map((z) => (
          <option key={z.zoneId} value={z.zoneId}>
            {z.name}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Inline alert for error/info feedback, consistent across all panels. */
export function Alert({ tone = "error", children }: { tone?: "error" | "info"; children: ReactNode }) {
  const tones = {
    error: "border-red-200 bg-red-50 text-red-700",
    info: "border-line bg-surface-alt text-ink-dim",
  };
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm leading-relaxed ${tones[tone]}`}>
      <AlertCircle size={16} strokeWidth={2.25} className="mt-0.5 shrink-0" aria-hidden />
      <div>{children}</div>
    </div>
  );
}

/** Friendly placeholder for pages/sections with no results yet. */
export function EmptyState({ icon: Icon, title, hint }: { icon: LucideIcon; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2.5 rounded-2xl border border-dashed border-line bg-surface-alt/40 px-6 py-12 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-alt text-brand" aria-hidden>
        <Icon size={20} strokeWidth={2} />
      </span>
      <div className="text-sm font-bold text-ink">{title}</div>
      {hint && <p className="max-w-sm text-xs leading-relaxed text-ink-dim">{hint}</p>}
    </div>
  );
}

/** Pulsing placeholder block for skeleton loading screens. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-surface-alt ${className}`} aria-hidden />;
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface-alt px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-ink-dim">{label}</div>
      <div className="mt-1 text-2xl font-extrabold tabular-nums text-ink">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-ink-dim">{hint}</div>}
    </div>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "green" | "amber" | "red" | "blue" }) {
  const tones: Record<string, string> = {
    neutral: "bg-surface-alt text-ink-dim ring-1 ring-inset ring-line",
    green: "bg-brand-light text-brand ring-1 ring-inset ring-brand/20",
    amber: "bg-[#FEF3C7] text-[#B45309] ring-1 ring-inset ring-[#F5E3A9]",
    red: "bg-[#FEE2E2] text-[#DC2626] ring-1 ring-inset ring-[#F7C6C6]",
    blue: "bg-sky-100 text-sky-700 ring-1 ring-inset ring-sky-200",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-ink-dim">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-brand" />
      {label ?? "Loading…"}
    </div>
  );
}

/** Interpolate red→amber→green where t=1 is "good". */
export function scoreColor(score: number, polarity: "goodHigh" | "goodLow"): string {
  const t = Math.max(0, Math.min(1, polarity === "goodHigh" ? score / 100 : 1 - score / 100));
  // red-500 -> amber-500 -> brand green (#2FA35C) — the "good" end matches the brand ramp.
  const stops = [
    { p: 0, c: [239, 68, 68] },
    { p: 0.5, c: [245, 158, 11] },
    { p: 1, c: [47, 163, 92] },
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
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E3F0E7" strokeWidth={stroke} />
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
        <text
          x="50%"
          y="50%"
          dominantBaseline="central"
          textAnchor="middle"
          style={{ fontSize: size * 0.26, fontWeight: 800, fill: "#0B2318" }}
        >
          {Math.round(score)}
        </text>
      </svg>
      {label && <div className="mt-1 text-sm font-semibold text-ink-dim">{label}</div>}
    </div>
  );
}
