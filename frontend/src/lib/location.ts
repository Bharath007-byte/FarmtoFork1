export type Coords = { lat: number; lng: number };

export function reverseGeocode(lat: number, lng: number): Promise<string> {
  return fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
    { headers: { Accept: "application/json" } }
  )
    .then(async (res) => {
      if (!res.ok) throw new Error("lookup failed");
      const data = (await res.json()) as {
        address?: {
          suburb?: string;
          neighbourhood?: string;
          city?: string;
          town?: string;
          village?: string;
          state?: string;
        };
        display_name?: string;
      };
      const a = data.address;
      const place =
        a?.suburb || a?.neighbourhood || a?.city || a?.town || a?.village;
      if (place && a?.state) return `${place}, ${a.state}`;
      if (data.display_name)
        return data.display_name.split(",").slice(0, 3).join(",").trim();
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    })
    .catch(() => `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
}

export function getCurrentCoords(): Promise<Coords> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Location is not available on this device."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      reject,
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}

export function watchLiveLocation(
  onTick: (coords: Coords) => void,
  onError?: (err: GeolocationPositionError) => void
): number {
  if (!navigator.geolocation) return -1;
  return navigator.geolocation.watchPosition(
    (pos) =>
      onTick({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      }),
    (err) => onError?.(err),
    { enableHighAccuracy: true, maximumAge: 4000, timeout: 20000 }
  );
}

export async function detectAddress(): Promise<string> {
  const { lat, lng } = await getCurrentCoords();
  return reverseGeocode(lat, lng);
}
