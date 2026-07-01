"use client";

import { useEffect } from "react";
import { APIProvider, Map, useMap } from "@vis.gl/react-google-maps";
import type { BarangayProfile } from "@/types";
import type { ZoneFeatureCollection } from "@/lib/client/api";
import { scoreColor, Badge } from "@/components/ui";

interface MapProps {
  profile: BarangayProfile;
  geojson: ZoneFeatureCollection;
  vulnerabilityByZone: Record<string, number>;
}

/** Imperative layer: draws GeoJSON zones colored by vulnerability + facility markers. */
function ZonesLayer({ profile, geojson, vulnerabilityByZone }: MapProps) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const data = new google.maps.Data({ map });
    data.addGeoJson(geojson as unknown as object);
    data.setStyle((feature) => {
      const zoneId = String(feature.getProperty("zoneId"));
      const score = vulnerabilityByZone[zoneId] ?? 0;
      return {
        fillColor: scoreColor(score, "goodLow"),
        fillOpacity: 0.5,
        strokeColor: "#374151",
        strokeWeight: 1,
      };
    });

    const info = new google.maps.InfoWindow();
    const clickListener = data.addListener("click", (e: google.maps.Data.MouseEvent) => {
      const zoneId = String(e.feature.getProperty("zoneId"));
      const name = String(e.feature.getProperty("name"));
      const score = vulnerabilityByZone[zoneId];
      info.setContent(
        `<div style="font:13px sans-serif"><strong>${name}</strong><br/>Vulnerability score: ${score != null ? Math.round(score) : "n/a"}</div>`,
      );
      if (e.latLng) info.setPosition(e.latLng);
      info.open(map);
    });

    const markers = profile.facilities.map(
      (f) =>
        new google.maps.Marker({
          position: f.location,
          map,
          title: `${f.name} (${f.type.replace(/_/g, " ")})`,
        }),
    );

    return () => {
      data.setMap(null);
      markers.forEach((m) => m.setMap(null));
      google.maps.event.removeListener(clickListener);
      info.close();
    };
  }, [map, profile, geojson, vulnerabilityByZone]);

  return null;
}

/** Fallback shown when no Maps API key is configured — keeps the dashboard usable in dev. */
function MapFallback({ profile, vulnerabilityByZone }: MapProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        Set <code className="font-mono">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to render the
        interactive Google Map. Showing zone vulnerability below.
      </div>
      <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-3">
        {profile.zones.map((z) => {
          const score = vulnerabilityByZone[z.zoneId] ?? 0;
          return (
            <div
              key={z.zoneId}
              className="flex flex-col justify-between rounded-xl p-3 text-white"
              style={{ backgroundColor: scoreColor(score, "goodLow") }}
            >
              <span className="text-xs font-medium opacity-90">{z.name}</span>
              <span className="text-lg font-bold tabular-nums">{Math.round(score)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function CommunityMap(props: MapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return (
      <div className="h-[420px]">
        <MapFallback {...props} />
      </div>
    );
  }

  return (
    <div className="relative h-[420px] overflow-hidden rounded-xl">
      <div className="absolute right-2 top-2 z-10">
        <Badge tone="red">High vulnerability</Badge>
      </div>
      <APIProvider apiKey={apiKey}>
        <Map
          defaultCenter={props.profile.centroid}
          defaultZoom={14}
          gestureHandling="greedy"
          disableDefaultUI={false}
          style={{ width: "100%", height: "100%" }}
        >
          <ZonesLayer {...props} />
        </Map>
      </APIProvider>
    </div>
  );
}
