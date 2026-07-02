/**
 * POST /api/environment — Climate & Environmental Intelligence.
 * Body: { zoneId: string, interventions: string[], magnitude?: number }.
 *
 * GET /api/environment — returns the six map layers for every zone (for the layer toggles).
 */

import { NextResponse } from "next/server";
import { getProfile } from "@/lib/twin";
import { computeZoneLayers, simulateEnvironment, ENV_INTERVENTIONS, type EnvIntervention } from "@/lib/scoring/environment";
import { explainEnvironment } from "@/lib/ai";

const VALID_INTERVENTIONS = new Set(Object.keys(ENV_INTERVENTIONS));

export async function GET() {
  const profile = getProfile();
  return NextResponse.json({ layers: computeZoneLayers(profile) });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "body must be a JSON object" }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  const profile = getProfile();

  const zoneId = typeof b.zoneId === "string" && profile.zones.some((z) => z.zoneId === b.zoneId)
    ? b.zoneId
    : profile.zones[0].zoneId;

  const rawInterventions = Array.isArray(b.interventions) ? b.interventions : [];
  const interventions = rawInterventions.filter(
    (i): i is EnvIntervention => typeof i === "string" && VALID_INTERVENTIONS.has(i),
  );
  if (interventions.length === 0) {
    return NextResponse.json({ error: "interventions must include at least one valid intervention" }, { status: 400 });
  }

  const magnitude = typeof b.magnitude === "number" && Number.isFinite(b.magnitude) ? b.magnitude : undefined;

  const result = simulateEnvironment(profile, zoneId, interventions, magnitude);
  const explanation = await explainEnvironment(result);

  return NextResponse.json({ result, explanation });
}
