/**
 * GET /api/twin — bootstrap payload for the dashboard: the full digital-twin profile plus
 * the zone boundary GeoJSON. Static data, so this is a cheap, cacheable read.
 */

import { NextResponse } from "next/server";
import { getProfile, getGeojson } from "@/lib/twin";

export function GET() {
  return NextResponse.json({ profile: getProfile(), geojson: getGeojson() });
}
