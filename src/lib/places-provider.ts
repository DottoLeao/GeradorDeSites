import type { Prospect } from "@/lib/types/prospect";

export async function searchProspects(params: {
  lat: number;
  lng: number;
  radiusMeters: number;
  enrich?: boolean;
}): Promise<Prospect[]> {
  const provider = process.env.PLACES_PROVIDER ?? "google";

  if (provider === "google") {
    if (!process.env.GOOGLE_PLACES_API_KEY) {
      throw new Error(
        "GOOGLE_PLACES_API_KEY não configurada. Necessária para prospecção via Google Places."
      );
    }
    const { searchNearbyProspects } = await import("@/lib/google-places");
    return searchNearbyProspects(params, { enrich: params.enrich });
  }

  const { searchNearbyProspectsOSM } = await import("@/lib/osm-places");
  return searchNearbyProspectsOSM(params);
}

export async function enrichProspects(
  prospects: Prospect[]
): Promise<Prospect[]> {
  if (!process.env.GOOGLE_PLACES_API_KEY) {
    throw new Error("GOOGLE_PLACES_API_KEY não configurada");
  }

  const { enrichProspectWebsites } = await import("@/lib/google-places");
  const enriched = await enrichProspectWebsites(
    process.env.GOOGLE_PLACES_API_KEY,
    prospects
  );
  enriched.sort((a, b) => b.heatScore - a.heatScore);
  return enriched;
}

export async function enrichProspectsWithProgress(
  prospects: Prospect[],
  onProgress: (done: number, total: number, prospect: Prospect) => void
): Promise<Prospect[]> {
  if (!process.env.GOOGLE_PLACES_API_KEY) {
    throw new Error("GOOGLE_PLACES_API_KEY não configurada");
  }

  const { enrichProspectWebsites } = await import("@/lib/google-places");
  const enriched = await enrichProspectWebsites(
    process.env.GOOGLE_PLACES_API_KEY,
    prospects,
    { onProgress }
  );
  enriched.sort((a, b) => b.heatScore - a.heatScore);
  return enriched;
}

export function isGoogleProspect(prospect: Prospect): boolean {
  return !prospect.placeId.startsWith("osm:");
}
