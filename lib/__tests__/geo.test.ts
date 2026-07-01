import { describe, it, expect } from "vitest";
import { polygonCentroid, vulnerabilityTier } from "../geo";

describe("polygonCentroid", () => {
  it("finds the center of a square", () => {
    const square = [[0, 0], [2, 0], [2, 2], [0, 2]];
    const c = polygonCentroid(square);
    expect(c.lng).toBeCloseTo(1, 6);
    expect(c.lat).toBeCloseTo(1, 6);
  });

  it("finds the centroid of a right triangle", () => {
    const triangle = [[0, 0], [3, 0], [0, 3]];
    const c = polygonCentroid(triangle);
    expect(c.lng).toBeCloseTo(1, 6);
    expect(c.lat).toBeCloseTo(1, 6);
  });

  it("falls back to vertex average for a degenerate (collinear) ring", () => {
    const line = [[0, 0], [1, 0], [2, 0]];
    const c = polygonCentroid(line);
    expect(c.lng).toBeCloseTo(1, 6);
    expect(c.lat).toBeCloseTo(0, 6);
  });

  it("returns a point inside the polygon for an irregular concave shape", () => {
    // An L-shape; naive vertex-average would land outside the notch corner.
    const lShape = [[0, 0], [2, 0], [2, 1], [1, 1], [1, 2], [0, 2]];
    const c = polygonCentroid(lShape);
    expect(c.lng).toBeGreaterThan(0);
    expect(c.lng).toBeLessThan(2);
    expect(c.lat).toBeGreaterThan(0);
    expect(c.lat).toBeLessThan(2);
  });
});

describe("vulnerabilityTier", () => {
  it("classifies High at and above 50", () => {
    expect(vulnerabilityTier(57.4)).toBe("High");
    expect(vulnerabilityTier(50)).toBe("High");
  });
  it("classifies Moderate between 35 and 50", () => {
    expect(vulnerabilityTier(49.9)).toBe("Moderate");
    expect(vulnerabilityTier(35)).toBe("Moderate");
  });
  it("classifies Low below 35", () => {
    expect(vulnerabilityTier(34.9)).toBe("Low");
    expect(vulnerabilityTier(0)).toBe("Low");
  });
});
