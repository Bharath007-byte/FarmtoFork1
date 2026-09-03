import { CircleMarker, MapContainer, TileLayer, Tooltip } from "react-leaflet";

export interface MapMark {
  id: string;
  lat: number;
  lng: number;
  label: string;
  color: string;
  kind: "farm" | "vehicle" | "you" | "risk";
}

export function AgriMap({
  markers,
  height = "h-64",
  onSelect,
}: {
  markers: MapMark[];
  height?: string;
  onSelect?: (id: string) => void;
}) {
  const center: [number, number] = markers[0]
    ? [markers[0].lat, markers[0].lng]
    : [17.385, 78.4864];

  return (
    <div className={`${height} w-full overflow-hidden rounded-2xl`}>
      <MapContainer center={center} zoom={6} scrollWheelZoom className="h-full w-full">
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {markers.map((m) => (
          <CircleMarker
            key={m.id}
            center={[m.lat, m.lng]}
            radius={m.kind === "vehicle" ? 8 : 11}
            pathOptions={{ color: m.color, fillColor: m.color, fillOpacity: 0.85, weight: 2 }}
            eventHandlers={{
              click: () => onSelect?.(m.id),
            }}
          >
            <Tooltip>{m.label}</Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
