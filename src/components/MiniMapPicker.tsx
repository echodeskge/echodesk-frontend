"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2, MapPin } from "lucide-react";

// Tbilisi by default — every Georgian tenant ships from somewhere here. Other
// tenants can drag the marker the first time they configure pickup.
const DEFAULT_CENTER: [number, number] = [41.7151, 44.8271];
const DEFAULT_ZOOM = 12;

// Leaflet pulls in `window` at import time, so we have to dynamic-import the
// react-leaflet bits with `ssr: false`. Doing it once at module scope keeps the
// chunk lazy + memo'd across re-renders.
const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false },
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false },
);
const Marker = dynamic(
  () => import("react-leaflet").then((m) => m.Marker),
  { ssr: false },
);

// react-leaflet 5's `useMapEvents` is a hook, not a component, so we wrap it
// in a tiny client component that registers click + drag handlers and emits
// changes upward.
const MapEventLayer = dynamic(
  () =>
    import("react-leaflet").then(({ useMapEvents }) => {
      function Inner({ onPick }: { onPick: (lat: number, lng: number) => void }) {
        useMapEvents({
          click(e) {
            onPick(e.latlng.lat, e.latlng.lng);
          },
        });
        return null;
      }
      return Inner;
    }),
  { ssr: false },
);

type Props = {
  /** Current pinned latitude. ``null`` when no pin yet. */
  latitude: number | null;
  /** Current pinned longitude. ``null`` when no pin yet. */
  longitude: number | null;
  /** Called whenever the user clicks the map or drags the marker. */
  onChange: (lat: number, lng: number) => void;
  /** Optional label inside the helper bar above the map. */
  label?: string;
  /** Optional fallback centre when no pin is set yet. Defaults to Tbilisi. */
  defaultCenter?: [number, number];
  /** Map height. Defaults to 280px so a Card section doesn't grow too tall. */
  heightPx?: number;
};

/**
 * Lightweight Leaflet + OpenStreetMap pin picker for capturing a single
 * (lat, lng) coordinate. Used by the ecommerce admin Delivery section to
 * persist the tenant's pickup address, and re-usable on the storefront
 * checkout for delivery addresses.
 *
 * No API key required — uses the standard OSM tile servers via
 * `https://tile.openstreetmap.org/{z}/{x}/{y}.png`.
 */
export function MiniMapPicker({
  latitude,
  longitude,
  onChange,
  label,
  defaultCenter = DEFAULT_CENTER,
  heightPx = 280,
}: Props) {
  const center = useMemo<[number, number]>(() => {
    if (typeof latitude === "number" && typeof longitude === "number") {
      return [latitude, longitude];
    }
    return defaultCenter;
  }, [latitude, longitude, defaultCenter]);

  // Leaflet's default marker icon URLs assume Webpack's old asset pipeline
  // (`marker-icon.png` / etc. relative to the bundle), and Next.js doesn't
  // resolve them. We lazy-load the icon module client-side and patch the
  // default-icon URLs to the unpkg CDN so a marker actually renders.
  const [iconReady, setIconReady] = useState(false);
  const markerRef = useRef<unknown>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      // @ts-expect-error - private API but it's the only known fix
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });
      if (!cancelled) setIconReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const hasPin = typeof latitude === "number" && typeof longitude === "number";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5" />
          {label ||
            (hasPin
              ? "Click or drag to update the pin"
              : "Click on the map to drop a pin")}
        </span>
        {hasPin && (
          <span className="font-mono">
            {latitude!.toFixed(6)}, {longitude!.toFixed(6)}
          </span>
        )}
      </div>
      <div
        className="overflow-hidden rounded-md border"
        style={{ height: `${heightPx}px` }}
      >
        {!iconReady ? (
          <div className="flex h-full w-full items-center justify-center bg-muted/40 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading map…
          </div>
        ) : (
          <MapContainer
            center={center}
            zoom={hasPin ? 14 : DEFAULT_ZOOM}
            style={{ height: "100%", width: "100%" }}
            scrollWheelZoom
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapEventLayer onPick={onChange} />
            {hasPin && (
              <Marker
                position={[latitude!, longitude!]}
                draggable
                eventHandlers={{
                  dragend(e) {
                    const m = e.target as { getLatLng: () => { lat: number; lng: number } };
                    const { lat, lng } = m.getLatLng();
                    onChange(lat, lng);
                  },
                }}
                ref={(el) => {
                  markerRef.current = el;
                }}
              />
            )}
          </MapContainer>
        )}
      </div>
    </div>
  );
}
