"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { APIProvider, Map, useMap } from "@vis.gl/react-google-maps";
import type { BarangayProfile } from "@/types";
import type { ZoneFeatureCollection } from "@/lib/client/api";
import { scoreColor } from "@/components/ui";
import { polygonCentroid, vulnerabilityTier } from "@/lib/geo";

// Leaflet fallback — loaded only when there's no Google key, client-side only.
const OSMMap = dynamic(() => import("./OSMMap"), { ssr: false });

interface MapProps {
  profile: BarangayProfile;
  geojson: ZoneFeatureCollection;
  vulnerabilityByZone: Record<string, number>;
}

/** Hand-authored light civic map theme (feature/element stylers) matching the app shell. */
const LIGHT_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#f2f7f2" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#5c7568" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#d7e2d9" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#93aa9c" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#e8efe9" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#cfe3f5" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#7c9ab0" }] },
];

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
        strokeColor: "#ffffff",
        strokeWeight: 1.5,
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

    // Inline "High"/"Moderate"/"Low" tier label centered in each zone, matching the OSM
    // fallback. Google's basic marker label has no background-pill styling, so this is a
    // plainer treatment than the Leaflet path — acceptable since it's the secondary map.
    const labelMarkers = geojson.features.map((feature) => {
      const zoneId = feature.properties.zoneId;
      const score = vulnerabilityByZone[zoneId] ?? 0;
      const tier = vulnerabilityTier(score);
      const { lat, lng } = polygonCentroid(feature.geometry.coordinates[0]);
      return new google.maps.Marker({
        position: { lat, lng },
        map,
        label: { text: tier, color: "#0B2318", fontSize: "11px", fontWeight: "700" },
        icon: { path: google.maps.SymbolPath.CIRCLE, scale: 0, fillOpacity: 0, strokeOpacity: 0 },
        clickable: false,
      });
    });

    return () => {
      data.setMap(null);
      markers.forEach((m) => m.setMap(null));
      labelMarkers.forEach((m) => m.setMap(null));
      google.maps.event.removeListener(clickListener);
      info.close();
    };
  }, [map, profile, geojson, vulnerabilityByZone]);

  return null;
}

/** Fills its parent container — the dashboard positions this as a full-bleed backdrop. */
export default function CommunityMap(props: MapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return <OSMMap {...props} />;
  }

  return (
    <APIProvider apiKey={apiKey}>
      <Map
        defaultCenter={props.profile.centroid}
        defaultZoom={14}
        gestureHandling="greedy"
        disableDefaultUI
        zoomControl
        clickableIcons={false}
        styles={LIGHT_MAP_STYLE}
        style={{ width: "100%", height: "100%" }}
      >
        <ZonesLayer {...props} />
      </Map>
    </APIProvider>
  );
}
