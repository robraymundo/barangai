/**
 * Small, pure geometry helpers for map zone labeling. No dependency on Leaflet/Google types
 * so both map implementations (Google Maps, Leaflet/OSM) can share the same logic.
 */

/** Area-weighted centroid of a simple polygon ring ([lng, lat] pairs, GeoJSON order). */
export function polygonCentroid(ring: number[][]): { lat: number; lng: number } {
  let area = 0;
  let cx = 0;
  let cy = 0;
  const n = ring.length;
  for (let i = 0; i < n; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % n];
    const cross = x1 * y2 - x2 * y1;
    area += cross;
    cx += (x1 + x2) * cross;
    cy += (y1 + y2) * cross;
  }
  area /= 2;

  if (Math.abs(area) < 1e-12) {
    // Degenerate/collinear ring — fall back to a plain vertex average.
    const sum = ring.reduce((acc, [x, y]) => [acc[0] + x, acc[1] + y], [0, 0]);
    return { lng: sum[0] / n, lat: sum[1] / n };
  }

  return { lng: cx / (6 * area), lat: cy / (6 * area) };
}

export type VulnerabilityTier = "High" | "Moderate" | "Low";

/**
 * Bucket a 0..100 vulnerability score (higher = more vulnerable) into a display tier.
 * Thresholds chosen from Alibagu's actual score distribution (27.7–57.4, with natural
 * gaps around 35 and 50), not arbitrary round numbers.
 */
export function vulnerabilityTier(score: number): VulnerabilityTier {
  if (score >= 50) return "High";
  if (score >= 35) return "Moderate";
  return "Low";
}
