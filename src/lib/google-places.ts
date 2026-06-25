import type { Prospect, ProspectTier } from "@/lib/types/prospect";
import { scoreProspect } from "@/lib/prospect-score";
import {
  normalizeWebsiteUrl,
  resolveProspectWebsite,
  runWithConcurrency,
  type WebsiteSource,
} from "@/lib/website-resolver";

export { normalizeWebsiteUrl } from "@/lib/website-resolver";
export type { Prospect, ProspectTier };

export interface PlaceDetails {
  placeId: string;
  name: string;
  formattedAddress: string;
  phone: string | null;
  website: string | null;
  mapsUrl: string;
  city: string;
  state: string;
  zipCode: string | null;
  rating: number | null;
  reviewCount: number | null;
  photos: string[];
  openingHours: string[] | null;
  types: string[];
  reviews: Array<{ text: string; rating: number; author: string }>;
}

const PLACE_ID_PATTERNS = [
  /place_id[=:]([A-Za-z0-9_-]+)/,
  /!1s(0x[a-f0-9]+:0x[a-f0-9]+)/i,
  /\/place\/[^/]+\/data=![^!]*!1s([^!]+)/,
  /ChIJ[A-Za-z0-9_-]{20,}/,
];

export async function extractPlaceIdFromUrl(mapsUrl: string): Promise<string | null> {
  try {
    const url = new URL(mapsUrl);

    const placeIdParam = url.searchParams.get("place_id");
    if (placeIdParam) return placeIdParam;

    const qParam = url.searchParams.get("q");
    if (qParam?.startsWith("place_id:")) {
      return qParam.replace("place_id:", "");
    }

    for (const pattern of PLACE_ID_PATTERNS) {
      const match = mapsUrl.match(pattern);
      if (match?.[1]) return match[1];
    }

    const cidMatch = mapsUrl.match(/0x[a-f0-9]+:0x[a-f0-9]+/i);
    if (cidMatch) return cidMatch[0];

    const response = await fetch(mapsUrl, {
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const finalUrl = response.url;

    for (const pattern of PLACE_ID_PATTERNS) {
      const match = finalUrl.match(pattern);
      if (match?.[1]) return match[1];
    }

    const chijMatch = finalUrl.match(/(ChIJ[A-Za-z0-9_-]{20,})/);
    if (chijMatch) return chijMatch[1];

    return null;
  } catch {
    return null;
  }
}

function parseAddressComponents(
  components: Array<{ long_name: string; short_name: string; types: string[] }>
) {
  let city = "";
  let state = "";
  let zipCode = "";

  for (const component of components) {
    if (component.types.includes("administrative_area_level_2")) {
      city = component.long_name;
    }
    if (component.types.includes("administrative_area_level_1")) {
      state = component.short_name;
    }
    if (component.types.includes("postal_code")) {
      zipCode = component.long_name;
    }
  }

  return { city, state, zipCode };
}

export async function fetchPlaceDetails(
  mapsUrl: string
): Promise<PlaceDetails> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_PLACES_API_KEY não configurada");
  }

  const placeId = await extractPlaceIdFromUrl(mapsUrl);
  if (!placeId) {
    throw new Error(
      "Não foi possível extrair o Place ID do link do Google Maps"
    );
  }

  const fields = [
    "place_id",
    "name",
    "formatted_address",
    "formatted_phone_number",
    "website",
    "rating",
    "user_ratings_total",
    "photos",
    "opening_hours",
    "types",
    "reviews",
    "address_components",
    "url",
  ].join(",");

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=${fields}&language=pt-BR&key=${apiKey}`
  );

  if (!response.ok) {
    throw new Error("Falha ao consultar Google Places API");
  }

  const data = await response.json();

  if (data.status !== "OK" || !data.result) {
    throw new Error(
      data.error_message ?? `Google Places retornou status: ${data.status}`
    );
  }

  const result = data.result;
  const { city, state, zipCode } = parseAddressComponents(
    result.address_components ?? []
  );

  const photos: string[] = (result.photos ?? [])
    .slice(0, 8)
    .map(
      (photo: { photo_reference: string }) =>
        `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1200&photo_reference=${photo.photo_reference}&key=${apiKey}`
    );

  return {
    placeId: result.place_id,
    name: result.name,
    formattedAddress: result.formatted_address,
    phone: result.formatted_phone_number ?? null,
    website: result.website ?? null,
    mapsUrl: result.url ?? mapsUrl,
    city,
    state,
    zipCode,
    rating: result.rating ?? null,
    reviewCount: result.user_ratings_total ?? null,
    photos,
    openingHours: result.opening_hours?.weekday_text ?? null,
    types: result.types ?? [],
    reviews: (result.reviews ?? []).slice(0, 5).map(
      (r: { text: string; rating: number; author_name: string }) => ({
        text: r.text,
        rating: r.rating,
        author: r.author_name,
      })
    ),
  };
}

export function parseOpeningHours(
  weekdayText: string[] | null
): Record<string, string> {
  const dayMap: Record<string, string> = {
    segunda: "monday",
    "segunda-feira": "monday",
    terça: "tuesday",
    "terça-feira": "tuesday",
    quarta: "wednesday",
    "quarta-feira": "wednesday",
    quinta: "thursday",
    "quinta-feira": "thursday",
    sexta: "friday",
    "sexta-feira": "friday",
    sábado: "saturday",
    domingo: "sunday",
  };

  const hours = {
    monday: "09:00 - 18:00",
    tuesday: "09:00 - 18:00",
    wednesday: "09:00 - 18:00",
    thursday: "09:00 - 18:00",
    friday: "09:00 - 18:00",
    saturday: "09:00 - 14:00",
    sunday: "Fechado",
  };

  if (!weekdayText) return hours;

  for (const line of weekdayText) {
    const [dayPart, ...timeParts] = line.split(":");
    const dayKey = dayMap[dayPart.trim().toLowerCase()];
    if (dayKey) {
      hours[dayKey as keyof typeof hours] = timeParts.join(":").trim() || "Fechado";
    }
  }

  return hours;
}

const PROSPECT_INCLUDED_TYPES = [
  "restaurant",
  "cafe",
  "bar",
  "bakery",
  "gas_station",
  "beauty_salon",
  "hair_care",
  "dentist",
  "gym",
  "store",
  "clothing_store",
  "pharmacy",
  "veterinary_care",
  "car_repair",
  "plumber",
  "electrician",
  "lawyer",
  "accounting",
  "real_estate_agency",
  "insurance_agency",
  "travel_agency",
  "pet_store",
  "florist",
  "laundry",
  "spa",
  "physiotherapist",
  "chiropractor",
  "meal_delivery",
  "meal_takeaway",
  "night_club",
  "liquor_store",
  "furniture_store",
  "home_goods_store",
  "hardware_store",
  "jewelry_store",
  "shoe_store",
  "book_store",
  "bicycle_store",
  "auto_repair_shop",
] as const;

const PLACES_NEW_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.rating",
  "places.userRatingCount",
  "places.websiteUri",
  "places.nationalPhoneNumber",
  "places.types",
  "places.googleMapsUri",
  "places.primaryType",
  "places.primaryTypeDisplayName",
  "places.regularOpeningHours",
  "places.currentOpeningHours",
  "places.businessStatus",
  "places.addressComponents",
].join(",");

interface PlacesNewAddressComponent {
  longText?: string;
  shortText?: string;
  types?: string[];
}

interface PlacesNewNearbyPlace {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  rating?: number;
  userRatingCount?: number;
  websiteUri?: string;
  nationalPhoneNumber?: string;
  types?: string[];
  googleMapsUri?: string;
  primaryType?: string;
  primaryTypeDisplayName?: { text?: string };
  regularOpeningHours?: { weekdayDescriptions?: string[] };
  currentOpeningHours?: { openNow?: boolean };
  businessStatus?: string;
  addressComponents?: PlacesNewAddressComponent[];
}

function parseNewApiAddressComponents(
  components: PlacesNewAddressComponent[] | undefined
) {
  let city = "";
  let state = "";

  for (const component of components ?? []) {
    if (component.types?.includes("administrative_area_level_2")) {
      city = component.longText ?? "";
    }
    if (component.types?.includes("administrative_area_level_1")) {
      state = component.shortText ?? "";
    }
  }

  return { city, state };
}

function extractPlaceIdFromNewApi(id: string | undefined): string | null {
  if (!id) return null;
  return id.startsWith("places/") ? id.slice("places/".length) : id;
}

function mapNewApiPlaceToProspect(place: PlacesNewNearbyPlace): Prospect | null {
  const placeId = extractPlaceIdFromNewApi(place.id);
  if (!placeId || !place.location?.latitude || !place.location?.longitude) {
    return null;
  }

  const website = normalizeWebsiteUrl(place.websiteUri);
  const openingHours = place.regularOpeningHours?.weekdayDescriptions ?? null;
  const { city, state } = parseNewApiAddressComponents(place.addressComponents);
  const { heatScore, tier } = scoreProspect({
    rating: place.rating ?? null,
    reviewCount: place.userRatingCount ?? null,
    website,
    phone: place.nationalPhoneNumber ?? null,
    openingHours,
  });

  return {
    placeId,
    name: place.displayName?.text ?? "Estabelecimento",
    address: place.formattedAddress ?? "",
    lat: place.location.latitude,
    lng: place.location.longitude,
    rating: place.rating ?? null,
    reviewCount: place.userRatingCount ?? null,
    website,
    phone: place.nationalPhoneNumber ?? null,
    mapsUrl:
      place.googleMapsUri ?? `https://maps.google.com/?q=place_id:${placeId}`,
    types: place.types ?? [],
    heatScore,
    tier,
    city: city || undefined,
    state: state || undefined,
    openingHours,
    primaryTypeLabel: place.primaryTypeDisplayName?.text ?? undefined,
    openNow: place.currentOpeningHours?.openNow ?? null,
    businessStatus: place.businessStatus ?? null,
  };
}

async function searchNearbyProspectsNew(
  apiKey: string,
  params: { lat: number; lng: number; radiusMeters: number }
): Promise<Prospect[] | null> {
  const radius = Math.min(Math.max(params.radiusMeters, 1000), 50000);

  const response = await fetch(
    "https://places.googleapis.com/v1/places:searchNearby",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": PLACES_NEW_FIELD_MASK,
      },
      body: JSON.stringify({
        includedTypes: [...PROSPECT_INCLUDED_TYPES],
        maxResultCount: 20,
        languageCode: "pt-BR",
        locationRestriction: {
          circle: {
            center: {
              latitude: params.lat,
              longitude: params.lng,
            },
            radius,
          },
        },
      }),
    }
  );

  if (response.status === 403) {
    return null;
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Falha ao consultar Places API (New): ${response.status} ${errorText}`
    );
  }

  const data = (await response.json()) as { places?: PlacesNewNearbyPlace[] };

  return (data.places ?? [])
    .map(mapNewApiPlaceToProspect)
    .filter((p): p is Prospect => p !== null);
}

const LEGACY_NEARBY_TYPES = [
  "restaurant",
  "cafe",
  "bar",
  "bakery",
  "beauty_salon",
  "hair_care",
  "dentist",
  "gym",
  "store",
  "pharmacy",
  "lawyer",
  "spa",
  "gas_station",
] as const;

interface LegacyNearbyResult {
  place_id: string;
  name: string;
  geometry?: { location?: { lat?: number; lng?: number } };
  vicinity?: string;
  rating?: number;
  user_ratings_total?: number;
  types?: string[];
}

interface LegacyPlaceDetails {
  place_id?: string;
  website?: string;
  formatted_phone_number?: string;
  formatted_address?: string;
  url?: string;
  opening_hours?: {
    open_now?: boolean;
    weekday_text?: string[];
  };
  address_components?: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
  types?: string[];
  business_status?: string;
}

async function legacyNearbySearch(
  apiKey: string,
  lat: number,
  lng: number,
  radius: number,
  type: string
): Promise<LegacyNearbyResult[]> {
  const url = new URL(
    "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
  );
  url.searchParams.set("location", `${lat},${lng}`);
  url.searchParams.set("radius", String(radius));
  url.searchParams.set("type", type);
  url.searchParams.set("language", "pt-BR");
  url.searchParams.set("key", apiKey);

  const response = await fetch(url.toString());
  const data = await response.json();

  if (data.status === "REQUEST_DENIED") {
    throw new Error(
      data.error_message ??
        "Places API negou a requisição. Verifique se a Places API está habilitada e a chave tem permissão."
    );
  }

  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    return [];
  }

  return data.results ?? [];
}

function rescoreProspect(
  prospect: Prospect,
  website: string | null,
  websiteSource?: WebsiteSource
): Prospect {
  const { heatScore, tier } = scoreProspect({
    rating: prospect.rating,
    reviewCount: prospect.reviewCount,
    website,
    phone: prospect.phone,
    openingHours: prospect.openingHours ?? null,
  });

  return {
    ...prospect,
    website,
    websiteSource: website ? websiteSource : undefined,
    heatScore,
    tier,
  };
}

const ENRICH_CONCURRENCY = 8;

export interface EnrichProspectWebsitesOptions {
  onProgress?: (done: number, total: number, prospect: Prospect) => void;
}

export async function enrichProspectWebsites(
  apiKey: string,
  prospects: Prospect[],
  options?: EnrichProspectWebsitesOptions
): Promise<Prospect[]> {
  const needsEnrich = prospects.filter(
    (p) => !p.website && !p.placeId.startsWith("osm:")
  );

  if (needsEnrich.length === 0) return prospects;

  const resolutionByPlaceId = new Map<
    string,
    { website: string | null; source?: WebsiteSource }
  >();
  let done = 0;

  await runWithConcurrency(
    needsEnrich,
    ENRICH_CONCURRENCY,
    async (prospect) => {
      const resolution = await resolveProspectWebsite(apiKey, prospect);

      if (!resolution.website && process.env.NODE_ENV === "development") {
        console.warn(
          `[prospector] website não encontrado para ${prospect.placeId} (${prospect.name})`
        );
      }

      resolutionByPlaceId.set(prospect.placeId, {
        website: resolution.website,
        source: resolution.source,
      });

      done += 1;
      const website = resolution.website;
      const websiteSource = website ? resolution.source : undefined;
      const updated =
        website === prospect.website && websiteSource === prospect.websiteSource
          ? prospect
          : rescoreProspect(prospect, website, websiteSource);

      options?.onProgress?.(done, needsEnrich.length, updated);
    }
  );

  return prospects.map((prospect) => {
    const resolution = resolutionByPlaceId.get(prospect.placeId);
    const website = prospect.website ?? resolution?.website ?? null;
    const websiteSource = prospect.website
      ? prospect.websiteSource
      : resolution?.source;

    if (website === prospect.website && websiteSource === prospect.websiteSource) {
      return prospect;
    }

    return rescoreProspect(prospect, website, websiteSource);
  });
}

async function legacyPlaceDetails(
  apiKey: string,
  placeId: string
): Promise<LegacyPlaceDetails | null> {
  const fields = [
    "place_id",
    "website",
    "formatted_phone_number",
    "formatted_address",
    "url",
    "opening_hours",
    "address_components",
    "types",
    "business_status",
  ].join(",");

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=${fields}&language=pt-BR&key=${apiKey}`
  );

  const data = await response.json();
  if (data.status !== "OK" || !data.result) return null;
  return data.result;
}

async function searchNearbyProspectsLegacy(
  apiKey: string,
  params: { lat: number; lng: number; radiusMeters: number }
): Promise<Prospect[]> {
  const radius = Math.min(Math.max(params.radiusMeters, 1000), 50000);

  const searchResults = await Promise.all(
    LEGACY_NEARBY_TYPES.map((type) =>
      legacyNearbySearch(apiKey, params.lat, params.lng, radius, type)
    )
  );

  const byPlaceId = new Map<string, LegacyNearbyResult>();
  for (const results of searchResults) {
    for (const place of results) {
      if (!byPlaceId.has(place.place_id)) {
        byPlaceId.set(place.place_id, place);
      }
    }
  }

  const candidates = [...byPlaceId.values()]
    .filter((p) => p.geometry?.location?.lat && p.geometry?.location?.lng)
    .sort(
      (a, b) => (b.user_ratings_total ?? 0) - (a.user_ratings_total ?? 0)
    )
    .slice(0, 20);

  const prospects = await Promise.all(
    candidates.map(async (place) => {
      const details = await legacyPlaceDetails(apiKey, place.place_id);
      const website = normalizeWebsiteUrl(details?.website);
      const openingHours = details?.opening_hours?.weekday_text ?? null;
      const { city, state } = parseAddressComponents(
        details?.address_components ?? []
      );
      const types = details?.types ?? place.types ?? [];
      const { heatScore, tier } = scoreProspect({
        rating: place.rating ?? null,
        reviewCount: place.user_ratings_total ?? null,
        website,
        phone: details?.formatted_phone_number ?? null,
        openingHours,
      });

      return {
        placeId: place.place_id,
        name: place.name,
        address:
          details?.formatted_address ?? place.vicinity ?? "",
        lat: place.geometry!.location!.lat!,
        lng: place.geometry!.location!.lng!,
        rating: place.rating ?? null,
        reviewCount: place.user_ratings_total ?? null,
        website,
        phone: details?.formatted_phone_number ?? null,
        mapsUrl:
          details?.url ??
          `https://maps.google.com/?q=place_id:${place.place_id}`,
        types,
        heatScore,
        tier,
        city: city || undefined,
        state: state || undefined,
        openingHours,
        openNow: details?.opening_hours?.open_now ?? null,
        businessStatus: details?.business_status ?? null,
      } satisfies Prospect;
    })
  );

  prospects.sort((a, b) => b.heatScore - a.heatScore);
  return prospects;
}

export async function searchNearbyProspects(
  params: {
    lat: number;
    lng: number;
    radiusMeters: number;
  },
  options?: { enrich?: boolean }
): Promise<Prospect[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_PLACES_API_KEY não configurada");
  }

  const shouldEnrich = options?.enrich !== false;

  const fromNewApi = await searchNearbyProspectsNew(apiKey, params);
  if (fromNewApi !== null) {
    const results = shouldEnrich
      ? await enrichProspectWebsites(apiKey, fromNewApi)
      : fromNewApi;
    results.sort((a, b) => b.heatScore - a.heatScore);
    return results;
  }

  const fromLegacy = await searchNearbyProspectsLegacy(apiKey, params);
  const results = shouldEnrich
    ? await enrichProspectWebsites(apiKey, fromLegacy)
    : fromLegacy;
  results.sort((a, b) => b.heatScore - a.heatScore);
  return results;
}
