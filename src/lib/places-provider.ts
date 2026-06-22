import type { Prospect } from "@/lib/types/prospect";

export async function searchProspects(params: {
  lat: number;
  lng: number;
  radiusMeters: number;
}): Promise<Prospect[]> {
  const provider = process.env.PLACES_PROVIDER ?? "google";

  if (provider === "google") {
    if (!process.env.GOOGLE_PLACES_API_KEY) {
      throw new Error(
        "GOOGLE_PLACES_API_KEY não configurada. Necessária para prospecção via Google Places."
      );
    }
    const { searchNearbyProspects } = await import("@/lib/google-places");
    return searchNearbyProspects(params);
  }

  const { searchNearbyProspectsOSM } = await import("@/lib/osm-places");
  return searchNearbyProspectsOSM(params);
}

export function isGoogleProspect(prospect: Prospect): boolean {
  return !prospect.placeId.startsWith("osm:");
}
