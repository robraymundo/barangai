/**
 * Loads the static digital-twin dataset (the "twin") as a typed BarangayProfile.
 * Source data lives in data/indicators.json and is version-controlled. Validation is
 * intentionally light for the MVP — the JSON is authored, not user-supplied.
 */

import type { BarangayProfile } from "@/types";
import indicators from "@/data/indicators.json";
import geojson from "@/data/barangay.json";

export const barangayProfile = indicators as BarangayProfile;

export function getProfile(): BarangayProfile {
  return barangayProfile;
}

/** Zone boundary GeoJSON (FeatureCollection) for the map. */
export function getGeojson() {
  return geojson;
}
