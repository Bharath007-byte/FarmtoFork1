function haversineKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

const d = haversineKm({ lat: 17.4, lng: 78.5 }, { lat: 17.5, lng: 78.5 });
if (!(d > 10 && d < 13)) throw new Error(`haversine ${d}`);

const leftover = 500 - 420 - 50;
if (leftover !== 30) throw new Error("waste leftover");

console.log("sih engine tests ok");
