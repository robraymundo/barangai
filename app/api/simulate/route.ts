/**
 * POST /api/simulate — AI Scenario Simulator (Feature 1, the flagship).
 * Body: { question: string }.
 *
 * Flow: rehearsed demo questions short-circuit to canned params + qualitative narrative
 * (fast, no AI latency); otherwise Gemini parses the question into structured params (with
 * an offline keyword fallback) and writes the explanation. Either way the IMPACT NUMBERS
 * come from the deterministic engine, never the LLM.
 */

import { NextResponse } from "next/server";
import { getProfile } from "@/lib/twin";
import { simulateScenario } from "@/lib/scoring";
import { matchCanned, parseScenario, explainSimulation } from "@/lib/ai";
import { validateSimulateRequest } from "@/lib/api/validation";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = validateSimulateRequest(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { question } = parsed.value;
  const profile = getProfile();
  const zones = profile.zones.map((z) => ({ zoneId: z.zoneId, name: z.name }));

  const canned = matchCanned(question);
  const params = canned ? canned.params : await parseScenario(question, zones);
  const result = simulateScenario(profile, params);
  const explanation = canned ? canned.explanation : await explainSimulation(result, profile);

  return NextResponse.json({ params, result, explanation });
}
