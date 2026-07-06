/**
 * Lightweight request validation for the API route handlers. No external schema lib — the
 * inputs are small and well-defined, so hand-validation keeps the dependency surface lean.
 */

import type { ProjectCandidate } from "@/types";

export type Validated<T> = { ok: true; value: T } | { ok: false; error: string };

/** Coerce a value to a finite number, defaulting when absent/invalid. */
function num(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/** Validate a single project candidate from an untrusted request body. */
function toProject(raw: unknown, index: number): Validated<ProjectCandidate> {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, error: `projects[${index}] must be an object` };
  }
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || !r.id) return { ok: false, error: `projects[${index}].id is required` };
  if (typeof r.name !== "string" || !r.name) return { ok: false, error: `projects[${index}].name is required` };
  if (typeof r.cost !== "number" || !Number.isFinite(r.cost) || r.cost < 0) {
    return { ok: false, error: `projects[${index}].cost must be a non-negative number` };
  }
  return {
    ok: true,
    value: {
      id: r.id,
      name: r.name,
      cost: r.cost,
      communityImpact: num(r.communityImpact),
      urgency: num(r.urgency),
      beneficiaries: num(r.beneficiaries),
      maintenanceCostPerYear: num(r.maintenanceCostPerYear),
      climateResilience: num(r.climateResilience),
      targetZoneId: typeof r.targetZoneId === "string" ? r.targetZoneId : undefined,
    },
  };
}

export interface BudgetRequest {
  budget: number;
  projects: ProjectCandidate[];
}

/** Validate the POST /api/budget body: { budget, projects[] }. */
export function validateBudgetRequest(body: unknown): Validated<BudgetRequest> {
  if (typeof body !== "object" || body === null) return { ok: false, error: "body must be a JSON object" };
  const b = body as Record<string, unknown>;
  if (typeof b.budget !== "number" || !Number.isFinite(b.budget) || b.budget <= 0) {
    return { ok: false, error: "budget must be a positive number" };
  }
  if (!Array.isArray(b.projects) || b.projects.length === 0) {
    return { ok: false, error: "projects must be a non-empty array" };
  }
  const projects: ProjectCandidate[] = [];
  for (let i = 0; i < b.projects.length; i++) {
    const v = toProject(b.projects[i], i);
    if (!v.ok) return v;
    projects.push(v.value);
  }
  return { ok: true, value: { budget: b.budget, projects } };
}

/** Validate the POST /api/simulate body: { question, targetZoneId? }. */
export function validateSimulateRequest(
  body: unknown,
): Validated<{ question: string; targetZoneId?: string }> {
  if (typeof body !== "object" || body === null) return { ok: false, error: "body must be a JSON object" };
  const b = body as Record<string, unknown>;
  if (typeof b.question !== "string" || b.question.trim().length === 0) {
    return { ok: false, error: "question must be a non-empty string" };
  }
  const targetZoneId = typeof b.targetZoneId === "string" && b.targetZoneId ? b.targetZoneId : undefined;
  return { ok: true, value: { question: b.question.trim(), targetZoneId } };
}
