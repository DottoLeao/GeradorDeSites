import type { Prospect } from "@/lib/types/prospect";

const GOOGLE_MAPS_HOST =
  /(^https?:\/\/)?(www\.)?(google\.[a-z.]+\/maps|maps\.google\.com)/i;

export function getGoogleMapsUrl(prospect: Prospect): string {
  if (GOOGLE_MAPS_HOST.test(prospect.mapsUrl)) {
    return prospect.mapsUrl;
  }

  const { placeId, lat, lng, name, address } = prospect;

  if (placeId && !placeId.startsWith("osm:")) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`place_id:${placeId}`)}&query_place_id=${encodeURIComponent(placeId)}`;
  }

  const query = address.trim() ? `${name}, ${address}` : `${lat},${lng}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
