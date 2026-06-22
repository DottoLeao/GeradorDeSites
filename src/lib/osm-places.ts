import { scoreProspect } from "@/lib/prospect-score";
import { getGoogleMapsUrl } from "@/lib/prospect-maps-url";
import { formatProspectCategory } from "@/lib/prospect-labels";
import type { Prospect } from "@/lib/types/prospect";

const USER_AGENT =
  process.env.OVERPASS_USER_AGENT ?? "GeradorDeSites/1.0 (prospecting)";

const OVERPASS_ENDPOINTS = [
  process.env.OVERPASS_API_URL,
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.fr/api/interpreter",
  "https://overpass-api.de/api/interpreter",
].filter((url): url is string => Boolean(url));

const CACHE_TTL_MS = 10 * 60 * 1000;

const EXCLUDED_AMENITIES = new Set([
  "toilets",
  "bench",
  "waste_basket",
  "parking",
  "parking_space",
  "post_box",
  "drinking_water",
  "fountain",
  "atm",
  "telephone",
  "shelter",
  "bicycle_parking",
  "motorcycle_parking",
  "charging_station",
  "vending_machine",
  "recycling",
  "waste_disposal",
  "clock",
  "grit_bin",
  "give_box",
  "parcel_locker",
]);

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements?: OverpassElement[];
}

interface CacheEntry {
  expires: number;
  prospects: Prospect[];
}

const searchCache = new Map<string, CacheEntry>();

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getCacheKey(lat: number, lng: number, radius: number) {
  return `${lat.toFixed(3)}:${lng.toFixed(3)}:${Math.round(radius / 500) * 500}`;
}

function getOverpassEndpoints(): string[] {
  return [...new Set(OVERPASS_ENDPOINTS)];
}

function buildOverpassQuery(lat: number, lng: number, radius: number): string {
  const r = Math.min(radius, 25000);
  return `
[out:json][timeout:20];
(
  nwr(around:${r},${lat},${lng})["name"]["shop"];
  nwr(around:${r},${lat},${lng})["name"]["amenity"];
  nwr(around:${r},${lat},${lng})["name"]["craft"];
  nwr(around:${r},${lat},${lng})["name"]["office"];
  nwr(around:${r},${lat},${lng})["name"]["leisure"~"^(fitness_centre|sports_centre|spa)$"];
);
out center tags 40;
`.trim();
}

async function fetchOverpass(query: string): Promise<OverpassResponse> {
  const endpoints = getOverpassEndpoints();
  let lastStatus = 0;

  for (const endpoint of endpoints) {
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0) await sleep(2500);

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": USER_AGENT,
          },
          body: new URLSearchParams({ data: query }),
        });

        if (response.ok) {
          return (await response.json()) as OverpassResponse;
        }

        lastStatus = response.status;

        if (response.status === 429 || response.status === 503 || response.status === 504) {
          break;
        }

        const errorText = await response.text();
        throw new Error(
          `Overpass retornou ${response.status}: ${errorText.slice(0, 150)}`
        );
      } catch (error) {
        if (error instanceof Error && error.message.startsWith("Overpass retornou")) {
          throw error;
        }
        lastStatus = 503;
      }
    }
  }

  if (lastStatus === 429) {
    throw new Error(
      "Servidores Overpass ocupados (limite de requisições). Aguarde 1–2 minutos e tente novamente."
    );
  }

  throw new Error(
    "Não foi possível consultar o OpenStreetMap no momento. Tente novamente em instantes."
  );
}

function getTag(tags: Record<string, string>, keys: string[]): string | null {
  for (const key of keys) {
    const value = tags[key]?.trim();
    if (value) return value;
  }
  return null;
}

function parseAddress(tags: Record<string, string>): string {
  const street = getTag(tags, ["addr:street"]);
  const housenumber = getTag(tags, ["addr:housenumber"]);
  const suburb = getTag(tags, ["addr:suburb", "addr:neighbourhood"]);
  const city = getTag(tags, ["addr:city", "addr:town", "addr:village"]);

  const parts: string[] = [];
  if (street) {
    parts.push(housenumber ? `${street}, ${housenumber}` : street);
  }
  if (suburb) parts.push(suburb);
  if (city) parts.push(city);

  if (parts.length > 0) return parts.join(" - ");

  return getTag(tags, ["addr:full"]) ?? "";
}

function parseOpeningHours(raw: string | null): string[] | null {
  if (!raw) return null;
  return [raw];
}

function extractTypes(tags: Record<string, string>): string[] {
  const types: string[] = [];
  for (const key of ["shop", "amenity", "craft", "office", "leisure"]) {
    if (tags[key]) types.push(tags[key]);
  }
  return types;
}

function isBusinessElement(tags: Record<string, string>): boolean {
  const amenity = tags.amenity;
  if (amenity && EXCLUDED_AMENITIES.has(amenity)) return false;
  return Boolean(tags.shop || tags.amenity || tags.craft || tags.office || tags.leisure);
}

function getCoordinates(element: OverpassElement): { lat: number; lng: number } | null {
  if (element.lat != null && element.lon != null) {
    return { lat: element.lat, lng: element.lon };
  }
  if (element.center?.lat != null && element.center?.lon != null) {
    return { lat: element.center.lat, lng: element.center.lon };
  }
  return null;
}

function mapElementToProspect(element: OverpassElement): Prospect | null {
  const tags = element.tags ?? {};
  if (!isBusinessElement(tags)) return null;

  const name = tags.name?.trim();
  if (!name) return null;

  const coords = getCoordinates(element);
  if (!coords) return null;

  const website = getTag(tags, ["website", "contact:website"]);
  const phone = getTag(tags, ["phone", "contact:phone", "contact:mobile"]);
  const openingHoursRaw = getTag(tags, ["opening_hours"]);
  const openingHours = parseOpeningHours(openingHoursRaw);
  const city = getTag(tags, ["addr:city", "addr:town", "addr:village"]) ?? undefined;
  const state = getTag(tags, ["addr:state"]) ?? undefined;
  const address = parseAddress(tags);

  const types = extractTypes(tags);
  const primaryTypeLabel =
    formatProspectCategory(types) ?? undefined;

  const { heatScore, tier } = scoreProspect({
    website,
    phone,
    openingHours,
    rating: null,
    reviewCount: null,
  });

  const osmType = element.type;
  const placeId = `osm:${osmType}/${element.id}`;

  const prospectBase = {
    placeId,
    name,
    address,
    lat: coords.lat,
    lng: coords.lng,
    rating: null,
    reviewCount: null,
    website,
    phone,
    types,
    heatScore,
    tier,
    city,
    state,
    openingHours,
    primaryTypeLabel,
  } satisfies Omit<Prospect, "mapsUrl">;

  return {
    ...prospectBase,
    mapsUrl: getGoogleMapsUrl({ ...prospectBase, mapsUrl: "" }),
  };
}

function parseOverpassElements(elements: OverpassElement[]): Prospect[] {
  const byPlaceId = new Map<string, Prospect>();

  for (const element of elements) {
    const prospect = mapElementToProspect(element);
    if (prospect && !byPlaceId.has(prospect.placeId)) {
      byPlaceId.set(prospect.placeId, prospect);
    }
  }

  return [...byPlaceId.values()]
    .sort((a, b) => b.heatScore - a.heatScore)
    .slice(0, 20);
}

export async function searchNearbyProspectsOSM(params: {
  lat: number;
  lng: number;
  radiusMeters: number;
}): Promise<Prospect[]> {
  const radius = Math.min(Math.max(Math.round(params.radiusMeters), 1000), 50000);
  const cacheKey = getCacheKey(params.lat, params.lng, radius);

  const cached = searchCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return cached.prospects;
  }

  const query = buildOverpassQuery(params.lat, params.lng, radius);
  const data = await fetchOverpass(query);
  const prospects = parseOverpassElements(data.elements ?? []);

  searchCache.set(cacheKey, {
    expires: Date.now() + CACHE_TTL_MS,
    prospects,
  });

  return prospects;
}
