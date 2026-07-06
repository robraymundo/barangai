"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap } from "leaflet";
import { scoreColor } from "@/components/ui";
import { polygonCentroid } from "@/lib/geo";
import type { LayerMapProps } from "./EnvLayerMap";

/** Keyless Leaflet fallback for EnvLayerMap, mirroring OSMMap's approach. */
export default function OSMLayerMap({ profile, geojson, valueByZone, polarity, legendLabel, onZoneClick, selectedZoneId }: LayerMapProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let map: LeafletMap | undefined;
    let observer: ResizeObserver | undefined;
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !ref.current || ref.current.dataset.init === "1") return;
      ref.current.dataset.init = "1";

      // Keep tiles filling the container when its width changes (e.g. sidebar collapse).
      observer = new ResizeObserver(() => map?.invalidateSize());
      observer.observe(ref.current);

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
          const value = valueByZone[zoneId] ?? 0;
          const isSelected = zoneId === selectedZoneId;
          return {
            color: isSelected ? "#124A2B" : "#ffffff",
            weight: isSelected ? 2.5 : 1.5,
            fillColor: scoreColor(value * 100, polarity),
            fillOpacity: isSelected ? 0.75 : 0.55,
          };
        },
        onEachFeature: (feature, lyr) => {
          const zoneId = feature.properties?.zoneId as string;
          const name = feature.properties?.name as string;
          const value = valueByZone[zoneId];
          lyr.bindPopup(
            `<strong>${name}</strong><br/>${legendLabel}: ${value != null ? Math.round(value * 100) : "n/a"}`,
          );
          lyr.on("click", () => onZoneClick?.(zoneId));
        },
      }).addTo(map);

      try {
        map.fitBounds(layer.getBounds(), { padding: [20, 20] });
      } catch {
        /* empty/degenerate geometry — keep default view */
      }

      for (const feature of geojson.features) {
        const zoneId = feature.properties.zoneId;
        const value = valueByZone[zoneId] ?? 0;
        const { lat, lng } = polygonCentroid(feature.geometry.coordinates[0]);
        L.marker([lat, lng], {
          icon: L.divIcon({
            html: `<div style="transform:translate(-50%,-50%);color:#0B2318;text-shadow:0 1px 3px rgba(255,255,255,0.95),0 0 2px rgba(255,255,255,0.95)" class="whitespace-nowrap text-[11px] font-bold tracking-wide">${Math.round(value * 100)}</div>`,
            className: "",
            iconSize: [0, 0],
            iconAnchor: [0, 0],
          }),
          interactive: false,
          keyboard: false,
        }).addTo(map);
      }
    })();

    return () => {
      cancelled = true;
      observer?.disconnect();
      if (map) map.remove();
      if (ref.current) delete ref.current.dataset.init;
    };
  }, [profile, geojson, valueByZone, polarity, legendLabel, onZoneClick, selectedZoneId]);

  return <div ref={ref} className="h-full w-full" />;
}
