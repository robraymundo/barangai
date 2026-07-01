/**
 * Typed client-side fetchers for the API routes. Keep all network calls here so components
 * stay declarative and response shapes have one source of truth.
 */

import type {
  BarangayProfile,
  BudgetExplanation,
  BudgetResult,
  ProjectCandidate,
  RankedZone,
  ResilienceComponents,
  ScenarioParams,
  ScoreFactor,
  SimulationResult,
} from "@/types";

export interface ZoneFeature {
  type: "Feature";
  properties: { zoneId: string; name: string };
  geometry: { type: string; coordinates: number[][][] };
}
export interface ZoneFeatureCollection {
  type: "FeatureCollection";
  features: ZoneFeature[];
}

export interface TwinResponse {
  profile: BarangayProfile;
  geojson: ZoneFeatureCollection;
}
export interface ResilienceResponse {
  breakdown: { score: number; factors: ScoreFactor[] };
  components: ResilienceComponents;
}
export interface VulnerabilityResponse {
  ranked: RankedZone[];
  summary: string;
  recommendations: string[];
}
export interface SimulateResponse {
  params: ScenarioParams;
  result: SimulationResult;
  explanation: string;
}
export interface BudgetResponse extends BudgetExplanation {
  result: BudgetResult;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `${url} failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  twin: () => getJson<TwinResponse>("/api/twin"),
  resilience: () => getJson<ResilienceResponse>("/api/resilience"),
  vulnerability: () => postJson<VulnerabilityResponse>("/api/vulnerability", {}),
  simulate: (question: string) => postJson<SimulateResponse>("/api/simulate", { question }),
  budget: (budget: number, projects: ProjectCandidate[]) =>
    postJson<BudgetResponse>("/api/budget", { budget, projects }),
};
