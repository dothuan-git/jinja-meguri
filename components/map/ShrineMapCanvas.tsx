"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Map, Marker, Popup, type MapRef } from "react-map-gl/maplibre";
import type { Map as MaplibreMap } from "maplibre-gl";
import { MapPin, ArrowRight, PartyPopper } from "lucide-react";
import "maplibre-gl/dist/maplibre-gl.css";
import type { ShrineMapPoint } from "@/components/map/ShrineMapView";

// OpenFreeMap's "liberty" vector style — free, keyless, unrestricted (no
// session cap or commercial-use carve-out, unlike MapTiler's free tier).
// Label language is re-applied at runtime (see applyLabelLanguage) instead of
// being baked into a raster image, which is what caused labels to flip to
// Japanese on zoom with the earlier CARTO/Esri raster basemaps: those render
// international names for large regions at low zoom but the raw local-script
// `name` tag for street/POI detail at high zoom, with no way to override that
// per viewer.
const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

// ISO 639-1 code. Placeholder default until the site has its own i18n locale
// to pass in here instead — swap the prop below for that locale once it exists.
const DEFAULT_LANGUAGE = "en";

// Center of Japan; used until markers exist to fit against.
const DEFAULT_VIEW = { longitude: 137.8, latitude: 36.5, zoom: 5 };

// OpenMapTiles-schema layers tag name fields as `name`, `name:en`, `name:ja`,
// etc. Every symbol layer whose text-field references one of those is
// rewritten to prefer the requested language, falling back to English then
// the raw (local-script) name.
function applyLabelLanguage(map: MaplibreMap, language: string) {
  const layers = map.getStyle()?.layers;
  if (!layers) return;
  for (const layer of layers) {
    if (layer.type !== "symbol") continue;
    const textField = map.getLayoutProperty(layer.id, "text-field");
    if (!textField || !JSON.stringify(textField).includes('"name')) continue;
    map.setLayoutProperty(layer.id, "text-field", [
      "coalesce",
      ["get", `name:${language}`],
      ["get", "name:en"],
      ["get", "name"],
    ]);
  }
}

// "liberty"'s road/bridge/tunnel line layers (each a casing + fill pair) read
// as thick/bold on this square, mostly-zoomed-out canvas. Scale every
// line-width value (plain number or ["interpolate", ...] zoom expression) down
// by ROAD_WIDTH_SCALE, keeping the casing/fill proportions intact.
const ROAD_LAYER_PREFIX = /^(road|bridge|tunnel)_/;
const ROAD_WIDTH_SCALE = 0.6;

function scaleLineWidth(expr: unknown, scale: number): unknown {
  if (typeof expr === "number") return expr * scale;
  if (Array.isArray(expr) && expr[0] === "interpolate") {
    // ["interpolate", interpolation, input, stop1, value1, stop2, value2, ...] — scale the values, not the stops.
    return expr.map((item, i) => (i >= 4 && i % 2 === 0 ? (item as number) * scale : item));
  }
  return expr;
}

function applyRoadWidths(map: MaplibreMap) {
  const layers = map.getStyle()?.layers;
  if (!layers) return;
  for (const layer of layers) {
    if (layer.type !== "line" || !ROAD_LAYER_PREFIX.test(layer.id)) continue;
    const width = map.getPaintProperty(layer.id, "line-width");
    if (width === undefined) continue;
    map.setPaintProperty(layer.id, "line-width", scaleLineWidth(width, ROAD_WIDTH_SCALE));
  }
}

export default function ShrineMapCanvas({
  points,
  showFestivals = false,
  language = DEFAULT_LANGUAGE,
}: {
  points: ShrineMapPoint[];
  showFestivals?: boolean;
  language?: string;
}) {
  const mapRef = useRef<MapRef | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const signature = points.map((p) => p.slug).join("|");

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    if (map.isStyleLoaded()) applyLabelLanguage(map, language);
    else map.once("load", () => applyLabelLanguage(map, language));
  }, [language]);

  // Waits on `mapReady` because the underlying MapLibre map is created
  // asynchronously — on first mount `mapRef.current` is still null when this
  // effect first runs, so fitBounds would silently no-op and the map would be
  // stuck at the default Japan-wide view. Re-running once `onLoad` flips
  // `mapReady` (and again whenever the filtered `points` change) covers both
  // the initial fit and re-fitting after a filter change.
  useEffect(() => {
    if (!mapReady || points.length === 0) return;
    const lngs = points.map((p) => p.coordinates.lng);
    const lats = points.map((p) => p.coordinates.lat);
    mapRef.current?.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      { padding: 48, maxZoom: 11, duration: 0 },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, mapReady]);

  const hovered = useMemo(
    () =>
      !interacting && hoveredSlug && hoveredSlug !== selectedSlug
        ? points.find((p) => p.slug === hoveredSlug)
        : undefined,
    [points, hoveredSlug, selectedSlug, interacting],
  );
  const selected = useMemo(() => points.find((p) => p.slug === selectedSlug), [points, selectedSlug]);

  return (
    <Map
      ref={mapRef}
      initialViewState={DEFAULT_VIEW}
      mapStyle={STYLE_URL}
      style={{ position: "absolute", inset: 0 }}
      onLoad={(e) => {
        applyLabelLanguage(e.target, language);
        applyRoadWidths(e.target);
        // The map often mounts (next/dynamic) while its panel is still
        // mid-entrance and the aspect-ratio height is settling, so MapLibre can
        // latch a stale viewport size. A stale size makes project() drift
        // progressively as you zoom, which desyncs the DOM overlay (markers +
        // popups) from the canvas. Force a re-measure once the style is loaded.
        e.target.resize();
        setMapReady(true);
      }}
      onMoveStart={() => {
        setInteracting(true);
        setHoveredSlug(null);
      }}
      onMoveEnd={() => setInteracting(false)}
    >
      {points.map((p) => (
        <Marker
          key={p.slug}
          longitude={p.coordinates.lng}
          latitude={p.coordinates.lat}
          onClick={(e) => {
            e.originalEvent.stopPropagation();
            setSelectedSlug(p.slug);
          }}
        >
          <div
            onMouseEnter={() => setHoveredSlug(p.slug)}
            onMouseLeave={() => setHoveredSlug((s) => (s === p.slug ? null : s))}
            className="w-3.5 h-3.5 rounded-full border-[1.5px] cursor-pointer"
            style={{ background: "#c94b32", borderColor: "#fbf9f4" }}
          />
        </Marker>
      ))}

      {hovered && (
        <Popup
          longitude={hovered.coordinates.lng}
          latitude={hovered.coordinates.lat}
          closeButton={false}
          closeOnClick={false}
          closeOnMove={false}
          anchor="bottom"
          offset={12}
          className="shrine-tooltip"
        >
          <span className="font-bold text-xs">{hovered.name_en}</span>
        </Popup>
      )}

      {selected && (
        <Popup
          longitude={selected.coordinates.lng}
          latitude={selected.coordinates.lat}
          onClose={() => setSelectedSlug(null)}
          anchor="bottom"
          offset={12}
          className="shrine-popup"
          maxWidth="260px"
        >
          <div className="font-sans">
            {selected.highest_rank && (
              <span className="inline-flex items-center gap-1.5 text-[9px] font-mono font-bold uppercase tracking-widest text-moss-light mb-1.5">
                <span className="w-1 h-1 rounded-full bg-torii" />
                {selected.highest_rank.name_en}
              </span>
            )}
            <p className="text-sm font-serif font-bold text-stone leading-tight m-0">{selected.name_en}</p>
            {selected.name_ja && <p className="text-xs text-stone/60 mt-0.5 mb-0">{selected.name_ja}</p>}

            <p className="flex items-center gap-1 text-[11px] text-moss mt-2 mb-0">
              <MapPin size={11} className="shrink-0 text-torii/70" />
              {[selected.city, selected.prefecture].filter(Boolean).join(", ")}
            </p>

            {selected.primary_deity && (
              <p className="text-[11px] text-stone/70 italic mt-1.5 mb-0 pt-1.5 border-t border-moss/10">
                Enshrines {selected.primary_deity.name_en}
                {selected.primary_deity.name_ja ? ` · ${selected.primary_deity.name_ja}` : ""}
              </p>
            )}

            {showFestivals && (
              <div className="mt-2 pt-2 border-t border-moss/10">
                <p className="flex items-center gap-1 text-[9px] font-mono font-bold uppercase tracking-widest text-moss-light m-0">
                  <PartyPopper size={10} className="shrink-0 text-torii/70" />
                  Festivals
                </p>
                {selected.festivals_brief.length === 0 ? (
                  <p className="text-[11px] text-stone/50 italic mt-1 mb-0">No festivals recorded.</p>
                ) : (
                  <ul className="list-none p-0 mt-1 mb-0 space-y-1.5">
                    {selected.festivals_brief.map((f, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-[11px] leading-tight">
                        <span className="mt-1 w-1 h-1 rounded-full bg-torii/60 shrink-0" />
                        <span className="flex flex-col">
                          <span className="text-stone font-semibold">{f.name_en}</span>
                          {f.when && <span className="text-moss">{f.when}</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <Link
              href={`/shrines/${selected.slug}`}
              className="mt-2.5 pt-2 border-t border-moss/10 flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-widest !text-torii hover:!text-torii-dark transition-colors"
            >
              View shrine
              <ArrowRight size={12} />
            </Link>
          </div>
        </Popup>
      )}
    </Map>
  );
}
