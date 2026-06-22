"use client";

import { useEffect } from "react";
import L from "leaflet";
import {
  Circle,
  MapContainer,
  Marker,
  TileLayer,
  useMap,
} from "react-leaflet";
import type { Prospect, ProspectTier } from "@/lib/types/prospect";
import "leaflet/dist/leaflet.css";

const TIER_COLORS: Record<ProspectTier, string> = {
  hot: "#ef4444",
  warm: "#f97316",
  cold: "#94a3b8",
};

function createTierIcon(tier: ProspectTier) {
  const color = TIER_COLORS[tier];
  return L.divIcon({
    className: "",
    html: `<div style="
      width: 14px;
      height: 14px;
      background: ${color};
      border: 2px solid white;
      border-radius: 50%;
      box-shadow: 0 1px 4px rgba(0,0,0,0.35);
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

const userLocationIcon = L.divIcon({
  className: "",
  html: `<div style="
    width: 18px;
    height: 18px;
    background: #2563eb;
    border: 3px solid white;
    border-radius: 50%;
    box-shadow: 0 2px 6px rgba(0,0,0,0.4);
  "></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function RecenterMap({
  center,
  radiusMeters,
}: {
  center: [number, number];
  radiusMeters: number;
}) {
  const map = useMap();

  useEffect(() => {
    map.setView(center);
    const radiusKm = radiusMeters / 1000;
    const zoom =
      radiusKm <= 2 ? 14 : radiusKm <= 5 ? 13 : radiusKm <= 10 ? 12 : radiusKm <= 20 ? 11 : 10;
    map.setZoom(zoom);
  }, [map, center, radiusMeters]);

  return null;
}

interface ProspectMapProps {
  center: [number, number];
  radiusMeters: number;
  prospects: Prospect[];
  selectedPlaceId?: string | null;
  onSelectProspect?: (placeId: string) => void;
}

export function ProspectMap({
  center,
  radiusMeters,
  prospects,
  selectedPlaceId,
  onSelectProspect,
}: ProspectMapProps) {
  return (
    <MapContainer
      center={center}
      zoom={12}
      className="h-full w-full rounded-lg"
      scrollWheelZoom
    >
      <RecenterMap center={center} radiusMeters={radiusMeters} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={center} icon={userLocationIcon} />
      <Circle
        center={center}
        radius={radiusMeters}
        pathOptions={{
          color: "#2563eb",
          fillColor: "#2563eb",
          fillOpacity: 0.08,
          weight: 2,
        }}
      />
      {prospects.map((prospect) => (
        <Marker
          key={prospect.placeId}
          position={[prospect.lat, prospect.lng]}
          icon={createTierIcon(prospect.tier)}
          opacity={selectedPlaceId && selectedPlaceId !== prospect.placeId ? 0.5 : 1}
          eventHandlers={{
            click: () => onSelectProspect?.(prospect.placeId),
          }}
        />
      ))}
    </MapContainer>
  );
}
