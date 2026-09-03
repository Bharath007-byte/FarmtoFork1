import { useEffect } from "react";
import { CircleMarker, MapContainer, TileLayer, useMap } from "react-leaflet";
import type { Coords } from "../lib/location";

function FollowPin({ coords }: { coords: Coords }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([coords.lat, coords.lng], 15, { duration: 0.7 });
  }, [coords.lat, coords.lng, map]);
  return null;
}

export function LiveMap({ coords }: { coords: Coords | null }) {
  const center: [number, number] = coords
    ? [coords.lat, coords.lng]
    : [17.385, 78.4864];

  return (
    <div className="h-64 w-full overflow-hidden rounded-2xl">
      <MapContainer
        key={coords ? "live" : "idle"}
        center={center}
        zoom={coords ? 15 : 11}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {coords && (
          <>
            <FollowPin coords={coords} />
            <CircleMarker
              center={[coords.lat, coords.lng]}
              radius={11}
              pathOptions={{
                color: "#2f7a4a",
                fillColor: "#e8b84a",
                fillOpacity: 0.95,
                weight: 3,
              }}
            />
          </>
        )}
      </MapContainer>
    </div>
  );
}
