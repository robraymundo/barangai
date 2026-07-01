"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap } from "leaflet";
import type { BarangayProfile } from "@/types";
import type { ZoneFeatureCollection } from "@/lib/client/api";
import { scoreColor } from "@/components/ui";

interface Props {
  profile: BarangayProfile;
  geojson: ZoneFeatureCollection;
  vulnerabilityByZone: Record<string, number>;
}

/**
 * Keyless interactive map (CARTO dark basemap over Leaflet). Used as the fallback when no
 * Google Maps API key is configured, so Feature 5 is genuinely interactive with zero setup.
 * Leaflet is dynamically imported inside the effect to avoid any SSR/window access.
 */
export default function OSMMap({ profile, geojson, vulnerabilityByZone }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let map: LeafletMap | undefined;
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !ref.current || ref.current.dataset.init === "1") return;
      ref.current.dataset.init = "1";

      map = L.map(ref.current, { zoomControl: false }).setView(
        [profile.centroid.lat, profile.centroid.lng],
        14,
      );
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
        subdomains: "abcd",
        maxZoom: 19,
      }).addTo(map);
      L.control.zoom({ position: "bottomright" }).addTo(map);

      const layer = L.geoJSON(geojson as unknown as GeoJSON.GeoJsonObject, {
        style: (feature) => {
          const zoneId = feature?.properties?.zoneId as string;
          const score = vulnerabilityByZone[zoneId] ?? 0;
          return { color: "#9ca3af", weight: 1, fillColor: scoreColor(score, "goodLow"), fillOpacity: 0.55 };
        },
        onEachFeature: (feature, lyr) => {
          const zoneId = feature.properties?.zoneId as string;
          const name = feature.properties?.name as string;
          const score = vulnerabilityByZone[zoneId];
          lyr.bindPopup(
            `<strong>${name}</strong><br/>Vulnerability score: ${score != null ? Math.round(score) : "n/a"}`,
          );
        },
      }).addTo(map);

      try {
        map.fitBounds(layer.getBounds(), { padding: [20, 20] });
      } catch {
        /* empty/degenerate geometry — keep default view */
      }

      for (const f of profile.facilities) {
        L.circleMarker([f.location.lat, f.location.lng], {
          radius: 6,
          color: "#38bdf8",
          fillColor: "#0ea5e9",
          fillOpacity: 0.9,
          weight: 2,
        })
          .bindPopup(`<strong>${f.name}</strong><br/>${f.type.replace(/_/g, " ")}`)
          .addTo(map);
      }
    })();

    return () => {
      cancelled = true;
      if (map) map.remove();
      if (ref.current) delete ref.current.dataset.init;
    };
  }, [profile, geojson, vulnerabilityByZone]);

  return <div ref={ref} className="h-full w-full" />;
}
