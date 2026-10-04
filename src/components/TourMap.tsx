"use client";

import * as maplibregl from "maplibre-gl";
import { useEffect, useRef } from "react";
import type { MarketCity, Stop } from "@/lib/agent/types";
import type { QHeatPoint } from "@/lib/qloo/types";

const STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

interface Props {
  center: [number, number];
  zoom: number;
  heatPoints?: QHeatPoint[];
  cities?: MarketCity[];
  stops?: Array<Stop | undefined>;
  route?: Array<{ name: string; lat: number; lon: number }>;
  className?: string;
}

type FC = GeoJSON.FeatureCollection;
const empty: FC = { type: "FeatureCollection", features: [] };

function heatFC(points: QHeatPoint[] = [], cities: MarketCity[] = []): FC {
  // Venue-affinity fallback has no raw points — paint the scored cities instead.
  const src = points.length
    ? points.map((p) => ({ lon: p.lon, lat: p.lat, w: p.affinity }))
    : cities.filter((c) => c.heat > 0).map((c) => ({ lon: c.lon, lat: c.lat, w: c.heat / 100 }));
  return {
    type: "FeatureCollection",
    features: src.map((p) => ({ type: "Feature", properties: { w: p.w }, geometry: { type: "Point", coordinates: [p.lon, p.lat] } })),
  };
}

function citiesFC(cities: MarketCity[] = []): FC {
  return {
    type: "FeatureCollection",
    features: cities.map((c) => ({
      type: "Feature",
      properties: { name: c.name, heat: c.heat },
      geometry: { type: "Point", coordinates: [c.lon, c.lat] },
    })),
  };
}

function routeFC(route: Array<{ lat: number; lon: number }> = []): FC {
  if (route.length < 2) return empty;
  return {
    type: "FeatureCollection",
    features: [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: route.map((s) => [s.lon, s.lat]) } }],
  };
}

export default function TourMap({ center, zoom, heatPoints, cities, stops, route, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const readyRef = useRef(false);
  const latest = useRef({ heatPoints, cities, stops, route });
  latest.current = { heatPoints, cities, stops, route };

  // init once
  useEffect(() => {
    if (!ref.current) return;
    maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
    const map = new maplibregl.Map({
      container: ref.current,
      style: STYLE,
      center,
      zoom,
      attributionControl: { compact: true },
      dragRotate: false,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;

    map.on("load", () => {
      map.addSource("heat", { type: "geojson", data: empty });
      map.addSource("cities", { type: "geojson", data: empty });
      map.addSource("route", { type: "geojson", data: empty });

      map.addLayer({
        id: "heat",
        type: "heatmap",
        source: "heat",
        paint: {
          "heatmap-weight": ["interpolate", ["linear"], ["get", "w"], 0, 0, 1, 1],
          "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 2, 0.9, 7, 2],
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 2, 18, 6, 45],
          "heatmap-opacity": 0.85,
          "heatmap-color": [
            "interpolate",
            ["linear"],
            ["heatmap-density"],
            0, "rgba(0,0,0,0)",
            0.15, "rgba(90,40,160,0.45)",
            0.35, "#a12bd6",
            0.55, "#ff4d8d",
            0.75, "#ffb547",
            1, "#c8ff3d",
          ],
        },
      });
      map.addLayer({
        id: "cities",
        type: "circle",
        source: "cities",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["get", "heat"], 0, 2, 100, 6],
          "circle-color": ["interpolate", ["linear"], ["get", "heat"], 0, "#3a3a46", 50, "#ff4d8d", 100, "#c8ff3d"],
          "circle-opacity": 0.75,
          "circle-stroke-width": 1,
          "circle-stroke-color": "#08080a",
        },
      });
      map.addLayer({
        id: "route-glow",
        type: "line",
        source: "route",
        paint: { "line-color": "#c8ff3d", "line-width": 8, "line-opacity": 0.15, "line-blur": 4 },
      });
      map.addLayer({
        id: "route",
        type: "line",
        source: "route",
        paint: { "line-color": "#c8ff3d", "line-width": 2, "line-dasharray": [2, 1.5] },
      });

      const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 8 });
      map.on("mouseenter", "cities", (e: maplibregl.MapLayerMouseEvent) => {
        const f = e.features?.[0];
        if (!f) return;
        map.getCanvas().style.cursor = "pointer";
        const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number];
        popup.setLngLat(coords).setHTML(`<strong>${f.properties?.name}</strong><br/>fan heat ${f.properties?.heat}/100`).addTo(map);
      });
      map.on("mouseleave", "cities", () => {
        map.getCanvas().style.cursor = "";
        popup.remove();
      });

      readyRef.current = true;
      sync();
    });

    return () => {
      readyRef.current = false;
      markersRef.current.forEach((m) => m.remove());
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function sync() {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    const { heatPoints: hp, cities: cs, stops: st, route: rt } = latest.current;
    (map.getSource("heat") as maplibregl.GeoJSONSource)?.setData(heatFC(hp, cs));
    (map.getSource("cities") as maplibregl.GeoJSONSource)?.setData(citiesFC(cs));
    const path = rt ?? (st?.filter(Boolean) as Stop[] | undefined)?.map((s) => ({ name: s.city, lat: s.lat, lon: s.lon })) ?? [];
    (map.getSource("route") as maplibregl.GeoJSONSource)?.setData(routeFC(path));

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = path.map((s, i) => {
      const el = document.createElement("div");
      el.className =
        "grid h-6 w-6 place-items-center rounded-full bg-[#c8ff3d] text-[11px] font-bold text-[#08080a] shadow-[0_0_0_3px_rgba(8,8,10,0.9)]";
      el.textContent = String(i + 1);
      el.title = s.name;
      return new maplibregl.Marker({ element: el }).setLngLat([s.lon, s.lat]).addTo(map);
    });

    if (path.length >= 2) {
      const b = new maplibregl.LngLatBounds();
      path.forEach((s) => b.extend([s.lon, s.lat]));
      map.fitBounds(b, { padding: 60, maxZoom: 6, duration: 900 });
    }
  }

  useEffect(() => {
    sync();
  }, [heatPoints, cities, stops, route]);

  const [lng, lat] = center;
  useEffect(() => {
    mapRef.current?.easeTo({ center: [lng, lat], zoom, duration: 600 });
  }, [lng, lat, zoom]);

  return <div ref={ref} className={className} aria-label="Fan affinity heatmap and tour route" role="img" />;
}
