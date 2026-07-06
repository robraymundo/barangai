"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap } from "leaflet";
import type { BarangayProfile } from "@/types";
import type { ZoneFeatureCollection } from "@/lib/client/api";
import { scoreColor } from "@/components/ui";
import { polygonCentroid, vulnerabilityTier } from "@/lib/geo";

interface Props {
  profile: BarangayProfile;
  geojson: ZoneFeatureCollection;
  vulnerabilityByZone: Record<string, number>;
}

/**
 * Keyless interactive map (CARTO light basemap over Leaflet). Used as the fallback when no
 * Google Maps API key is configured, so Feature 5 is genuinely interactive with zero setup.
 * Leaflet is dynamically imported inside the effect to avoid any SSR/window access.
 */
export default function OSMMap({ profile, geojson, vulnerabilityByZone }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let map: LeafletMap | undefined;
    let observer: ResizeObserver | undefined;
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !ref.current || ref.current.dataset.init === "1") return;
      ref.current.dataset.init = "1";

      map = L.map(ref.current, { zoomControl: false }).setView(
        [profile.centroid.lat, profile.centroid.lng],
        14,
      );
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
        subdomains: "abcd",
        maxZoom: 19,
      }).addTo(map);
      L.control.zoom({ position: "bottomright" }).addTo(map);

      const layer = L.geoJSON(geojson as unknown as GeoJSON.GeoJsonObject, {
        style: (feature) => {
          const zoneId = feature?.properties?.zoneId as string;
          const score = vulnerabilityByZone[zoneId] ?? 0;
          return { color: "#ffffff", weight: 1.5, fillColor: scoreColor(score, "goodLow"), fillOpacity: 0.55 };
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
        // animate:false — a queued fit animation would crash if StrictMode/navigation
        // removes the map mid-flight (reads _leaflet_pos on torn-down panes).
        map.fitBounds(layer.getBounds(), { padding: [20, 20], animate: false });
      } catch {
        /* empty/degenerate geometry — keep default view */
      }

      // Inline "High"/"Moderate"/"Low" tier label centered in each zone polygon, so the
      // color coding is legible without relying solely on the corner legend. Non-interactive
      // so it never blocks the zone's own click-to-popup behavior.
      for (const feature of geojson.features) {
        const zoneId = feature.properties.zoneId;
        const score = vulnerabilityByZone[zoneId] ?? 0;
        const tier = vulnerabilityTier(score);
        const { lat, lng } = polygonCentroid(feature.geometry.coordinates[0]);
        L.marker([lat, lng], {
          icon: L.divIcon({
            html: `<div style="transform:translate(-50%,-50%);color:#0B2318;text-shadow:0 1px 3px rgba(255,255,255,0.95),0 0 2px rgba(255,255,255,0.95)" class="whitespace-nowrap text-[11px] font-bold tracking-wide">${tier}</div>`,
            className: "",
            iconSize: [0, 0],
            iconAnchor: [0, 0],
          }),
          interactive: false,
          keyboard: false,
        }).addTo(map);
      }

      for (const f of profile.facilities) {
        L.circleMarker([f.location.lat, f.location.lng], {
          radius: 6,
          color: "#ffffff",
          fillColor: "#1E6E41",
          fillOpacity: 0.9,
          weight: 2,
        })
          .bindPopup(`<strong>${f.name}</strong><br/>${f.type.replace(/_/g, " ")}`)
          .addTo(map);
      }

      // Keep tiles filling the container when its width changes (e.g. sidebar collapse).
      // Guard against the container being hidden (display:none → 0×0) or torn down, which
      // would otherwise make Leaflet throw "Cannot read properties of undefined (_leaflet_pos)".
      observer = new ResizeObserver(() => {
        const el = ref.current;
        if (cancelled || !map || !el || el.offsetParent === null || el.clientWidth === 0) return;
        try {
          map.invalidateSize({ animate: false, pan: false });
        } catch {
          /* map mid-teardown — safe to ignore */
        }
      });
      observer.observe(ref.current);
    })();

    return () => {
      cancelled = true;
      observer?.disconnect();
      try {
        map?.remove();
      } catch {
        /* animation frame may fire mid-teardown — safe to ignore */
      }
      if (ref.current) delete ref.current.dataset.init;
    };
  }, [profile, geojson, vulnerabilityByZone]);

  return <div ref={ref} className="h-full w-full" />;
}
