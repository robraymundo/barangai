"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  api,
  type ResilienceResponse,
  type SimulateResponse,
  type TwinResponse,
  type VulnerabilityResponse,
} from "@/lib/client/api";
import {
  FlaskConical,
  ShieldCheck,
  Users,
  Wallet,
  Info,
  LayoutDashboard,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Map as MapIcon,
  Building2,
  Leaf,
  MessagesSquare,
  type LucideIcon,
} from "lucide-react";
import { Badge, Alert, Button, Skeleton } from "@/components/ui";
import { BrandLogo, BrandGlyph } from "@/components/BrandLogo";
import CommunityMap from "@/components/map/CommunityMap";
import ScenarioSimulator from "@/components/panels/ScenarioSimulator";
import ResiliencePanel, { type TimelinePoint } from "@/components/panels/ResiliencePanel";
import VulnerabilityPanel from "@/components/panels/VulnerabilityPanel";
import BudgetOptimizer from "@/components/panels/BudgetOptimizer";
import EnvironmentalIntelligence from "@/components/panels/EnvironmentalIntelligence";
import PolicyImpactSimulator from "@/components/panels/PolicyImpactSimulator";

type ViewKey =
  | "dashboard"
  | "simulate"
  | "resilience"
  | "vulnerability"
  | "budget"
  | "environment"
  | "policy"
  | "info";

const NAV_GROUPS: Array<{ label: string; items: Array<{ key: ViewKey; label: string; icon: LucideIcon }> }> = [
  {
    label: "Overview",
    items: [
      { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { key: "resilience", label: "Resilience", icon: ShieldCheck },
    ],
  },
  {
    label: "AI Intelligence",
    items: [
      { key: "simulate", label: "Scenario Simulator", icon: FlaskConical },
      { key: "vulnerability", label: "Vulnerability", icon: Users },
      { key: "budget", label: "Budget Optimizer", icon: Wallet },
      { key: "environment", label: "Climate & Environment", icon: Leaf },
      { key: "policy", label: "Policy Impact Simulator", icon: MessagesSquare },
    ],
  },
  {
    label: "System",
    items: [{ key: "info", label: "About", icon: Info }],
  },
];

function NavItem({
  active,
  icon: Icon,
  label,
  collapsed,
  onClick,
}: {
  active: boolean;
  icon: LucideIcon;
  label: string;
  collapsed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      title={collapsed ? label : undefined}
      className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold transition ${
        collapsed ? "md:justify-center md:px-0" : ""
      } ${
        active
          ? "bg-linear-to-br from-brand to-brand-2 text-white shadow-lg shadow-brand/30"
          : "text-ink-dim hover:bg-surface-alt hover:text-ink"
      }`}
    >
      <Icon size={17} strokeWidth={2} aria-hidden className="shrink-0" />
      <span className={`whitespace-nowrap ${collapsed ? "md:hidden" : ""}`}>{label}</span>
    </button>
  );
}

function ViewHead({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h1 className="text-2xl font-extrabold sm:text-[26px]">{title}</h1>
      <p className="mt-1 text-sm text-ink-dim">{subtitle}</p>
    </div>
  );
}

function PanelCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-[20px] border border-line bg-surface p-5 shadow-card ${className}`}>
      {children}
    </section>
  );
}

export default function Dashboard() {
  const [twin, setTwin] = useState<TwinResponse | null>(null);
  const [resilience, setResilience] = useState<ResilienceResponse | null>(null);
  const [vuln, setVuln] = useState<VulnerabilityResponse | null>(null);
  const [sims, setSims] = useState<SimulateResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ViewKey>("dashboard");
  const [mobileNav, setMobileNav] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  // Restore the saved sidebar state after mount (SSR always renders expanded).
  useEffect(() => {
    if (localStorage.getItem("barangai:sidebar-collapsed") === "1") setCollapsed(true);
  }, []);

  const toggleCollapsed = () =>
    setCollapsed((c) => {
      localStorage.setItem("barangai:sidebar-collapsed", c ? "0" : "1");
      return !c;
    });

  // Escape closes the mobile drawer.
  useEffect(() => {
    if (!mobileNav) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileNav(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileNav]);

  useEffect(() => {
    Promise.all([api.twin(), api.resilience(), api.vulnerability()])
      .then(([t, r, v]) => {
        setTwin(t);
        setResilience(r);
        setVuln(v);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load community data"));
  }, []);

  const vulnerabilityByZone = useMemo(() => {
    const map: Record<string, number> = {};
    vuln?.ranked.forEach((r) => (map[r.zoneId] = r.breakdown.score));
    return map;
  }, [vuln]);

  const baseline = resilience?.breakdown.score ?? 0;
  const currentScore = sims.length ? sims[sims.length - 1].result.after.resilience : baseline;
  const timeline: TimelinePoint[] = useMemo(
    () => [
      { label: "Baseline", score: baseline },
      ...sims.map((s, i) => ({ label: `Sim ${i + 1}`, score: s.result.after.resilience })),
    ],
    [baseline, sims],
  );

  if (error) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-page p-8">
        <div className="flex w-full max-w-md flex-col gap-4">
          <Alert tone="error">
            <strong className="mb-0.5 block">Couldn&apos;t load community data</strong>
            {error}
          </Alert>
          <Button variant="ghost" className="self-start" onClick={() => window.location.reload()}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  if (!twin || !resilience || !vuln) {
    // Skeleton mirrors the real shell so the page doesn't shift when data lands.
    return (
      <div className="flex h-dvh w-full overflow-hidden bg-page" aria-busy="true">
        <span className="sr-only">Loading BarangAI digital twin…</span>
        <div className="hidden w-64 shrink-0 flex-col border-r border-line bg-surface md:flex">
          <div className="flex items-center gap-3 border-b border-line px-5 py-5">
            <Skeleton className="h-10 w-10" />
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-2.5 w-32" />
            </div>
          </div>
          <div className="flex flex-col gap-2 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-16 shrink-0 items-center border-b border-line px-4 sm:px-6">
            <Skeleton className="hidden h-4 w-56 sm:block" />
            <Skeleton className="ml-auto h-10 w-44 rounded-2xl" />
          </div>
          <div className="flex-1 overflow-hidden px-4 py-6 sm:px-6">
            <div className="mx-auto flex max-w-[1600px] flex-col gap-5">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-56 w-full rounded-[28px]" />
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-28 rounded-[20px]" />
                ))}
              </div>
              <Skeleton className="h-105 w-full rounded-[20px]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const select = (key: ViewKey) => {
    setActiveView(key);
    setMobileNav(false);
    mainRef.current?.scrollTo({ top: 0 });
  };

  const kpis: Array<{ icon: LucideIcon; chip: string; value: string; label: string; bar?: number }> = [
    { icon: ShieldCheck, chip: "bg-brand", value: `${Math.round(currentScore)}/100`, label: "Community Resilience", bar: currentScore },
    { icon: MapIcon, chip: "bg-[#F59E0B]", value: String(vuln.ranked.length), label: "Zones tracked" },
    { icon: Building2, chip: "bg-[#2596be]", value: String(twin.profile.facilities.length), label: "Facilities mapped" },
    { icon: Users, chip: "bg-[#EF4444]", value: vuln.ranked[0]?.name ?? "—", label: "Most vulnerable zone" },
    { icon: FlaskConical, chip: "bg-[#8B5CF6]", value: String(sims.length), label: "Simulations run" },
  ];

  const mapLegend = (
    <div className="absolute bottom-3 left-3 z-500 rounded-xl border border-line bg-white/85 px-3 py-2 backdrop-blur">
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-dim">Vulnerability</div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-medium text-ink-dim">Low</span>
        <div
          className="h-1.5 w-24 rounded-full"
          style={{ background: "linear-gradient(to right, #16a34a, #f59e0b, #ef4444)" }}
        />
        <span className="text-[10px] font-medium text-ink-dim">High</span>
      </div>
    </div>
  );

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-page text-ink">
      {/* Mobile nav backdrop */}
      {mobileNav && (
        <div
          className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm md:hidden"
          onClick={() => setMobileNav(false)}
          aria-hidden
        />
      )}

      {/* ============ SIDEBAR ============ */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-line bg-surface transition-[width,transform] duration-300 ease-out md:static md:translate-x-0 ${
          collapsed ? "md:w-19" : "md:w-64"
        } ${mobileNav ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div
          className={`flex items-center gap-3 overflow-hidden border-b border-line px-5 py-5 ${
            collapsed ? "md:justify-center md:px-0" : ""
          }`}
        >
          {/* Branding is fully hidden in collapsed mode — the rail leads with the toggle. */}
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-md shadow-brand/30 ${
              collapsed ? "md:hidden" : ""
            }`}
            aria-hidden
          >
            <BrandLogo className="h-10 w-10" />
          </span>
          <div className={collapsed ? "md:hidden" : ""}>
            <div className="whitespace-nowrap text-[15px] font-extrabold leading-none">
              Barang<span className="text-brand">AI</span>
            </div>
            <div className="mt-1 whitespace-nowrap text-[11px] font-medium text-ink-dim">Decision Intelligence</div>
          </div>
          <button
            className={`hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl text-ink-dim transition hover:bg-surface-alt hover:text-ink md:flex ${
              collapsed ? "" : "ml-auto"
            }`}
            onClick={toggleCollapsed}
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen size={18} strokeWidth={2} /> : <PanelLeftClose size={18} strokeWidth={2} />}
          </button>
          <button
            className="ml-auto rounded-lg p-1 text-ink-faint hover:bg-surface-alt hover:text-ink md:hidden"
            onClick={() => setMobileNav(false)}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4" aria-label="Primary">
          {NAV_GROUPS.map((group, gi) => (
            <div key={group.label}>
              <div
                className={`px-3.5 pb-1.5 pt-4 text-[11px] font-bold uppercase tracking-wider text-ink-faint first:pt-0 ${
                  collapsed ? "md:hidden" : ""
                }`}
              >
                {group.label}
              </div>
              {/* Collapsed rail marks group boundaries with a thin divider instead of a label. */}
              {gi > 0 && (
                <div className={collapsed ? "mx-2 mb-3 mt-1 hidden h-px bg-line md:block" : "hidden"} aria-hidden />
              )}
              <div className="flex flex-col gap-1 pb-3">
                {group.items.map((item) => (
                  <NavItem
                    key={item.key}
                    active={activeView === item.key}
                    icon={item.icon}
                    label={item.label}
                    collapsed={collapsed}
                    onClick={() => select(item.key)}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className={`border-t border-line p-4 ${collapsed ? "md:p-3" : ""}`}>
          <div
            className={`flex items-center gap-2.5 rounded-2xl bg-surface-alt px-3 py-2.5 ${
              collapsed ? "md:justify-center md:px-0" : ""
            }`}
            title={collapsed ? `Digital twin active — ${twin.profile.name} · ${twin.profile.city}` : undefined}
          >
            <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-2 opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand-2" />
            </span>
            <div className={collapsed ? "md:hidden" : ""}>
              <div className="whitespace-nowrap text-xs font-bold">Digital twin active</div>
              <div className="whitespace-nowrap text-[11px] text-ink-dim">
                {twin.profile.name} · {twin.profile.city}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ============ MAIN ============ */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-line bg-white/70 px-4 backdrop-blur-xl sm:px-6">
          <button
            className="rounded-xl border border-line bg-surface p-2 text-ink-dim hover:bg-surface-alt hover:text-ink md:hidden"
            onClick={() => setMobileNav(true)}
            aria-label="Open menu"
          >
            <Menu size={18} />
          </button>
          <div className="hidden text-sm font-medium text-ink-dim sm:block">
            Digital twin · {twin.profile.name}, {twin.profile.city}
          </div>
          <div className="ml-auto flex items-center gap-2 rounded-2xl border border-line bg-surface px-4 py-2 shadow-card">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-dim">Resilience</span>
            <span className="text-lg font-extrabold tabular-nums">{Math.round(currentScore)}</span>
            {sims.length > 0 && (
              <Badge tone={currentScore >= baseline ? "green" : "red"}>
                {currentScore >= baseline ? "+" : ""}
                {Math.round((currentScore - baseline) * 10) / 10}
              </Badge>
            )}
          </div>
        </header>

        {/* Scrolling content — every view stays mounted (hidden) so typed input and
            computed results survive navigation; maps mount only while visible. */}
        <main ref={mainRef} className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
          <div className="mx-auto max-w-[1600px]">
            {/* ---------- DASHBOARD ---------- */}
            <div className={activeView === "dashboard" ? "view-in flex flex-col gap-5" : "hidden"}>
              <ViewHead
                title={twin.profile.name}
                subtitle={`Real-time digital twin overview · ${twin.profile.city}`}
              />

              <div className="relative overflow-hidden rounded-[28px] bg-linear-to-br from-brand-dark to-brand p-8 text-white shadow-[0_20px_40px_-12px_rgba(17,24,39,0.3)] sm:p-10">
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{ background: "radial-gradient(circle at 85% 20%, rgba(255,255,255,0.12), transparent 55%)" }}
                  aria-hidden
                />
                <BrandGlyph
                  size={190}
                  className="pointer-events-none absolute -right-4 top-1/2 hidden -translate-y-1/2 text-white/10 lg:block"
                />
                <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3.5 py-1.5 text-[11px] font-bold tracking-wide">
                  AI Digital Twin
                </span>
                <h2 className="mt-4 max-w-lg text-[26px] font-extrabold leading-tight sm:text-3xl">
                  Smarter decisions for {twin.profile.name}
                </h2>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-white/80">
                  Simulate projects and policies on the digital twin before spending public funds — from
                  flood mitigation to budget allocation.
                </p>
                <button
                  onClick={() => select("simulate")}
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-brand-dark shadow-md transition hover:-translate-y-px hover:shadow-lg"
                >
                  <FlaskConical size={16} strokeWidth={2.25} aria-hidden />
                  Run a Simulation
                </button>
                <span className="absolute bottom-8 right-8 hidden items-center gap-2 rounded-full border border-white/30 bg-white/15 px-4 py-2 text-xs font-bold backdrop-blur md:inline-flex">
                  <ShieldCheck size={14} aria-hidden />
                  Resilience {Math.round(currentScore)}/100
                </span>
              </div>

              {/* KPI cards — all values come from live app data */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {kpis.map((k) => (
                  <div
                    key={k.label}
                    className="rounded-[20px] border border-line bg-surface p-4 shadow-card transition-shadow hover:shadow-lift"
                  >
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-xl text-white ${k.chip}`}
                      aria-hidden
                    >
                      <k.icon size={16} strokeWidth={2.25} />
                    </span>
                    <div className="mt-3 truncate text-xl font-extrabold tabular-nums" title={k.value}>
                      {k.value}
                    </div>
                    <div className="mt-0.5 text-xs font-semibold text-ink-dim">{k.label}</div>
                    {k.bar != null && (
                      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-surface-alt">
                        <div
                          className="h-full rounded-full bg-linear-to-r from-brand to-brand-2 transition-all duration-700"
                          style={{ width: `${Math.max(0, Math.min(100, k.bar))}%` }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <PanelCard className="p-4">
                <h3 className="flex items-center gap-2 px-1 text-sm font-bold">
                  <MapIcon size={15} strokeWidth={2.25} className="text-brand" aria-hidden />
                  Community Map
                </h3>
                <div className="relative mt-3 h-120 overflow-hidden rounded-2xl border border-line">
                  <CommunityMap
                    profile={twin.profile}
                    geojson={twin.geojson}
                    vulnerabilityByZone={vulnerabilityByZone}
                  />
                  {mapLegend}
                </div>
              </PanelCard>
            </div>

            {/* ---------- SCENARIO SIMULATOR ---------- */}
            <div className={activeView === "simulate" ? "view-in flex flex-col gap-5" : "hidden"}>
              <ViewHead title="AI Scenario Simulator" subtitle="Ask a what-if question about a project or policy" />
              <PanelCard>
                <ScenarioSimulator zones={twin.profile.zones} onSimulated={(res) => setSims((prev) => [...prev, res])} />
              </PanelCard>
            </div>

            {/* ---------- RESILIENCE ---------- */}
            <div className={activeView === "resilience" ? "view-in flex flex-col gap-5" : "hidden"}>
              <ViewHead title="Community Resilience Score" subtitle="Updates after every simulation" />
              <PanelCard>
                <ResiliencePanel score={currentScore} components={resilience.components} timeline={timeline} />
              </PanelCard>
            </div>

            {/* ---------- VULNERABILITY ---------- */}
            <div className={activeView === "vulnerability" ? "view-in flex flex-col gap-5" : "hidden"}>
              <ViewHead title="Community Vulnerability Intelligence" subtitle="Who is most at risk, not just where" />
              <div className="grid items-start gap-4 lg:grid-cols-[3fr_2fr]">
                <PanelCard className="p-4">
                  <h3 className="flex items-center gap-2 px-1 text-sm font-bold">
                    <MapIcon size={15} strokeWidth={2.25} className="text-brand" aria-hidden />
                    Vulnerability Map
                  </h3>
                  <div className="relative mt-3 h-105 overflow-hidden rounded-2xl border border-line">
                    {/* Mounted only while visible so the map initializes at the right size. */}
                    {activeView === "vulnerability" && (
                      <CommunityMap
                        profile={twin.profile}
                        geojson={twin.geojson}
                        vulnerabilityByZone={vulnerabilityByZone}
                      />
                    )}
                    {mapLegend}
                  </div>
                </PanelCard>
                <PanelCard>
                  <VulnerabilityPanel ranked={vuln.ranked} summary={vuln.summary} recommendations={vuln.recommendations} />
                </PanelCard>
              </div>
            </div>

            {/* ---------- BUDGET ---------- */}
            <div className={activeView === "budget" ? "view-in flex flex-col gap-5" : "hidden"}>
              <ViewHead title="AI Budget Optimization" subtitle="Rank projects for the greatest community value" />
              <PanelCard>
                <BudgetOptimizer />
              </PanelCard>
            </div>

            {/* ---------- CLIMATE & ENVIRONMENTAL INTELLIGENCE ---------- */}
            <div className={activeView === "environment" ? "view-in flex flex-col gap-5" : "hidden"}>
              <ViewHead
                title="Climate & Environmental Intelligence"
                subtitle="Analyze environmental risk layers and simulate green interventions"
              />
              {activeView === "environment" && (
                <EnvironmentalIntelligence
                  profile={twin.profile}
                  geojson={twin.geojson}
                  onSimulated={(res) => setSims((prev) => [...prev, res])}
                />
              )}
            </div>

            {/* ---------- POLICY IMPACT SIMULATOR ---------- */}
            <div className={activeView === "policy" ? "view-in flex flex-col gap-5" : "hidden"}>
              <ViewHead title="Policy Impact Simulator" subtitle="Simulate policies in natural language and compare outcomes" />
              <PolicyImpactSimulator zones={twin.profile.zones} onSimulated={(res) => setSims((prev) => [...prev, res])} />
            </div>

            {/* ---------- ABOUT ---------- */}
            <div className={activeView === "info" ? "view-in flex flex-col gap-5" : "hidden"}>
              <ViewHead title="About this demo" subtitle="Methodology & data sources" />
              <PanelCard>
                <div className="grid gap-6 text-sm text-ink-dim md:grid-cols-2">
                  <div>
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                      Methodology
                    </div>
                    <p className="max-w-prose leading-relaxed">
                      BarangAI outputs are decision-support estimates from simplified models, intended
                      for scenario comparison — not engineering-grade predictions.
                    </p>
                  </div>
                  <div>
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                      Data sources
                    </div>
                    <ul className="list-inside list-disc space-y-0.5 text-ink-dim">
                      {twin.profile.dataSources.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </PanelCard>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
