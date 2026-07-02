/**
 * POST /api/policy — Policy Impact Simulator.
 * Body: { question: string, targetZoneId?: string }.
 */

import { NextResponse } from "next/server";
import { getProfile } from "@/lib/twin";
import { simulatePolicy } from "@/lib/scoring/policy";
import { explainPolicy } from "@/lib/ai";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "body must be a JSON object" }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  const question = typeof b.question === "string" ? b.question.trim() : "";
  if (!question) {
    return NextResponse.json({ error: "question must be a non-empty string" }, { status: 400 });
  }
  const targetZoneId = typeof b.targetZoneId === "string" ? b.targetZoneId : undefined;

  const profile = getProfile();
  const result = simulatePolicy(profile, question, targetZoneId);
  const explanation = await explainPolicy(result);

  return NextResponse.json({ result, explanation });
}
