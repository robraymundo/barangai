/**
 * GET /api/resilience — current Community Resilience Score (Feature 4) with its six-component
 * breakdown. Pure deterministic computation over the static twin.
 */

import { NextResponse } from "next/server";
import { getProfile } from "@/lib/twin";
import { scoreResilience } from "@/lib/scoring";

export function GET() {
  const { score, factors, components } = scoreResilience(getProfile());
  return NextResponse.json({ breakdown: { score, factors }, components });
}
