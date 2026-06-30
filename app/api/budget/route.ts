/**
 * POST /api/budget — AI Budget Optimization Engine (Feature 3).
 * Body: { budget: number, projects: ProjectCandidate[] }.
 * Returns the deterministic knapsack selection plus an AI (or fallback) rationale.
 */

import { NextResponse } from "next/server";
import { optimizeBudget } from "@/lib/scoring";
import { explainBudget } from "@/lib/ai";
import { validateBudgetRequest } from "@/lib/api/validation";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = validateBudgetRequest(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const result = optimizeBudget(parsed.value.projects, parsed.value.budget);
  const { summary, perProject } = await explainBudget(result);
  return NextResponse.json({ result, summary, perProject });
}
