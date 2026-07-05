"use client";

import { useEffect } from "react";
import Link from "next/link";
import { latLngBounds } from "leaflet";
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, useMap } from "react-leaflet";
import { MapPin, ArrowRight } from "lucide-react";
import "leaflet/dist/leaflet.css";
import type { ShrineMapPoint } from "@/components/map/ShrineMapView";

// Keyless Esri "World Light Gray Canvas" basemap — labels render in English
// worldwide (unlike OSM-sourced tiles, which use each place's local-script
// name), matching the project's no-API-key stance (see lib/maps.ts). Esri
// splits the style into a base layer plus a labels "reference" layer drawn
// on top; note the {z}/{y}/{x} order, which is reversed from OSM's {z}/{x}/{y}.
const BASE_TILE_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}";
const LABEL_TILE_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}";
const TILE_ATTRIBUTION = "Tiles &copy; Esri — Esri, HERE, Garmin, © OpenStreetMap contributors, and the GIS user community";

// Center of Japan; used until markers exist to fit against.
const DEFAULT_CENTER: [number, number] = [36.5, 137.8];
const DEFAULT_ZOOM = 5;

// Re-fits the viewport whenever the filtered marker set changes.
function FitToPoints({ points }: { points: ShrineMapPoint[] }) {
  const map = useMap();
  const signature = points.map((p) => p.slug).join("|");
  useEffect(() => {
    if (points.length === 0) return;
    const bounds = latLngBounds(points.map((p) => [p.coordinates.lat, p.coordinates.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 11 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, map]);
  return null;
}

export default function ShrineLeafletMap({ points }: { points: ShrineMapPoint[] }) {
  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      scrollWheelZoom
      // absolute inset-0: the wrapper is a flex-1 item whose height is indefinite,
      // so a percentage height resolves to 0 — inset sizing sidesteps that.
      className="absolute inset-0"
    >
      <TileLayer url={BASE_TILE_URL} attribution={TILE_ATTRIBUTION} />
      <TileLayer url={LABEL_TILE_URL} />
      <FitToPoints points={points} />
      {points.map((p) => (
        <CircleMarker
          key={p.slug}
          center={[p.coordinates.lat, p.coordinates.lng]}
          radius={7}
          pathOptions={{ color: "#fbf9f4", weight: 1.5, fillColor: "#c94b32", fillOpacity: 0.9 }}
        >
          <Tooltip direction="top" offset={[0, -6]}>
            <span className="font-bold">{p.name_en}</span>
          </Tooltip>
          <Popup className="shrine-popup" minWidth={220} maxWidth={260}>
            <div className="font-sans">
              {p.highest_rank && (
                <span className="inline-flex items-center gap-1.5 text-[9px] font-mono font-bold uppercase tracking-widest text-moss-light mb-1.5">
                  <span className="w-1 h-1 rounded-full bg-torii" />
                  {p.highest_rank.name_en}
                </span>
              )}
              <p className="text-sm font-serif font-bold text-stone leading-tight m-0">{p.name_en}</p>
              {p.name_ja && <p className="text-xs text-stone/60 mt-0.5 mb-0">{p.name_ja}</p>}

              <p className="flex items-center gap-1 text-[11px] text-moss mt-2 mb-0">
                <MapPin size={11} className="shrink-0 text-torii/70" />
                {[p.city, p.prefecture].filter(Boolean).join(", ")}
              </p>

              {p.primary_deity && (
                <p className="text-[11px] text-stone/70 italic mt-1.5 mb-0 pt-1.5 border-t border-moss/10">
                  Enshrines {p.primary_deity.name_en}
                  {p.primary_deity.name_ja ? ` · ${p.primary_deity.name_ja}` : ""}
                </p>
              )}

              <Link
                href={`/shrines/${p.slug}`}
                className="mt-2.5 pt-2 border-t border-moss/10 flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-widest !text-torii hover:!text-torii-dark transition-colors"
              >
                View shrine
                <ArrowRight size={12} />
              </Link>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
