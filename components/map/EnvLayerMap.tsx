"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { APIProvider, Map, useMap } from "@vis.gl/react-google-maps";
import type { BarangayProfile } from "@/types";
import type { ZoneFeatureCollection } from "@/lib/client/api";
import { scoreColor } from "@/components/ui";
import { polygonCentroid } from "@/lib/geo";

const OSMLayerMap = dynamic(() => import("./OSMLayerMap"), { ssr: false });

export interface LayerMapProps {
  profile: BarangayProfile;
  geojson: ZoneFeatureCollection;
  /** zoneId -> 0..1 value for the currently selected environmental layer. */
  valueByZone: Record<string, number>;
  /** "goodLow" = red at 1 (e.g. flood risk); "goodHigh" = green at 1 (e.g. green coverage). */
  polarity: "goodLow" | "goodHigh";
  legendLabel: string;
  onZoneClick?: (zoneId: string) => void;
  selectedZoneId?: string;
}

/** Same light civic theme as CommunityMap, kept local so this file has zero dependency on it. */
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

function ZonesLayer({ profile, geojson, valueByZone, polarity, legendLabel, onZoneClick, selectedZoneId }: LayerMapProps) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const data = new google.maps.Data({ map });
    data.addGeoJson(geojson as unknown as object);
    data.setStyle((feature) => {
      const zoneId = String(feature.getProperty("zoneId"));
      const value = valueByZone[zoneId] ?? 0;
      const isSelected = zoneId === selectedZoneId;
      return {
        fillColor: scoreColor(value * 100, polarity),
        fillOpacity: isSelected ? 0.75 : 0.5,
        strokeColor: isSelected ? "#124A2B" : "#ffffff",
        strokeWeight: isSelected ? 2.5 : 1.5,
      };
    });

    const info = new google.maps.InfoWindow();
    const clickListener = data.addListener("click", (e: google.maps.Data.MouseEvent) => {
      const zoneId = String(e.feature.getProperty("zoneId"));
      const name = String(e.feature.getProperty("name"));
      const value = valueByZone[zoneId];
      info.setContent(
        `<div style="font:13px sans-serif"><strong>${name}</strong><br/>${legendLabel}: ${value != null ? Math.round(value * 100) : "n/a"}</div>`,
      );
      if (e.latLng) info.setPosition(e.latLng);
      info.open(map);
      onZoneClick?.(zoneId);
    });

    const labelMarkers = geojson.features.map((feature) => {
      const { lat, lng } = polygonCentroid(feature.geometry.coordinates[0]);
      const zoneId = feature.properties.zoneId;
      const value = valueByZone[zoneId] ?? 0;
      return new google.maps.Marker({
        position: { lat, lng },
        map,
        label: { text: String(Math.round(value * 100)), color: "#0B2318", fontSize: "11px", fontWeight: "700" },
        icon: { path: google.maps.SymbolPath.CIRCLE, scale: 0, fillOpacity: 0, strokeOpacity: 0 },
        clickable: false,
      });
    });

    return () => {
      data.setMap(null);
      labelMarkers.forEach((m) => m.setMap(null));
      google.maps.event.removeListener(clickListener);
      info.close();
    };
  }, [map, profile, geojson, valueByZone, polarity, legendLabel, onZoneClick, selectedZoneId]);

  return null;
}

/** Fills its parent container. Colors zones by whichever environmental layer is selected. */
export default function EnvLayerMap(props: LayerMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return <OSMLayerMap {...props} />;
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
