import type { Prospect } from "@/lib/types/prospect";

export type WebsiteSource = "api" | "chain";

export interface WebsiteResolution {
  website: string | null;
  source?: WebsiteSource;
}

const MAPS_HOST_PATTERNS = [
  /^https?:\/\/(www\.)?(google\.[a-z.]+\/maps|maps\.google\.com)/i,
  /^https?:\/\/goo\.gl\/maps/i,
];

const CHAIN_ELIGIBLE_TYPES = new Set([
  "gas_station",
  "convenience_store",
  "store",
]);

const CHAIN_BRANDS: { pattern: RegExp; url: string }[] = [
  { pattern: /\bampol\b/i, url: "https://www.ampol.com.au/" },
  { pattern: /\bcaltex\b/i, url: "https://www.caltex.com.au/" },
  { pattern: /\bshell\b/i, url: "https://www.shell.com.au/" },
  { pattern: /\bbp\b/i, url: "https://www.bp.com/en_au/" },
  { pattern: /\b7[\s-]?eleven\b/i, url: "https://www.7eleven.com.au/" },
  { pattern: /\bcoles\s+express\b/i, url: "https://www.coles.com.au/" },
  { pattern: /\bwoolworths\b/i, url: "https://www.woolworths.com.au/" },
  {
    pattern: /\bmetro\s+(petrol|fuel|service)\b/i,
    url: "https://www.woolworths.com.au/",
  },
];

export function normalizeWebsiteUrl(
  uri: string | null | undefined
): string | null {
  if (!uri?.trim()) return null;

  const trimmed = uri.trim();
  try {
    const url = new URL(
      trimmed.startsWith("http") ? trimmed : `https://${trimmed}`
    );
    if (!["http:", "https:"].includes(url.protocol)) return null;

    const href = url.href;
    for (const pattern of MAPS_HOST_PATTERNS) {
      if (pattern.test(href)) return null;
    }
    return href;
  } catch {
    return null;
  }
}

export function inferChainWebsite(
  name: string,
  types: string[]
): string | null {
  if (!types.some((type) => CHAIN_ELIGIBLE_TYPES.has(type))) {
    return null;
  }

  const lower = name.toLowerCase();
  for (const { pattern, url } of CHAIN_BRANDS) {
    if (pattern.test(lower)) return url;
  }

  return null;
}

function extractPlaceIdFromNewApi(id: string | undefined): string | null {
  if (!id) return null;
  return id.startsWith("places/") ? id.slice("places/".length) : id;
}

async function fetchWebsiteFromNewApi(
  apiKey: string,
  placeId: string
): Promise<string | null> {
  const response = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
    {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "websiteUri",
      },
    }
  );

  if (!response.ok) return null;

  const data = (await response.json()) as { websiteUri?: string };
  return normalizeWebsiteUrl(data.websiteUri);
}

async function fetchWebsiteFromLegacyApi(
  apiKey: string,
  placeId: string
): Promise<string | null> {
  const response = await fetch(
    `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=website&language=pt-BR&key=${apiKey}`
  );

  const data = (await response.json()) as {
    status?: string;
    result?: { website?: string };
  };

  if (data.status !== "OK" || !data.result) return null;
  return normalizeWebsiteUrl(data.result.website);
}

async function fetchWebsiteViaTextSearch(
  apiKey: string,
  prospect: Prospect
): Promise<string | null> {
  const textQuery = [prospect.name, prospect.address].filter(Boolean).join(" ").trim();
  if (!textQuery) return null;

  const response = await fetch(
    "https://places.googleapis.com/v1/places:searchText",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.id,places.websiteUri",
      },
      body: JSON.stringify({
        textQuery,
        languageCode: "pt-BR",
        locationBias: {
          circle: {
            center: {
              latitude: prospect.lat,
              longitude: prospect.lng,
            },
            radius: 500,
          },
        },
      }),
    }
  );

  if (!response.ok) return null;

  const data = (await response.json()) as {
    places?: Array<{ id?: string; websiteUri?: string }>;
  };

  const places = data.places ?? [];

  const exactMatch = places.find((place) => {
    const id = extractPlaceIdFromNewApi(place.id);
    return id === prospect.placeId && normalizeWebsiteUrl(place.websiteUri);
  });
  if (exactMatch?.websiteUri) {
    return normalizeWebsiteUrl(exactMatch.websiteUri);
  }

  for (const place of places) {
    const website = normalizeWebsiteUrl(place.websiteUri);
    if (website) return website;
  }

  return null;
}

async function fetchWebsiteFromApis(
  apiKey: string,
  placeId: string
): Promise<string | null> {
  const [fromNew, fromLegacy] = await Promise.all([
    fetchWebsiteFromNewApi(apiKey, placeId),
    fetchWebsiteFromLegacyApi(apiKey, placeId),
  ]);

  return fromNew ?? fromLegacy;
}

export async function resolveProspectWebsite(
  apiKey: string,
  prospect: Prospect
): Promise<WebsiteResolution> {
  const fromChain = inferChainWebsite(prospect.name, prospect.types);
  if (fromChain) return { website: fromChain, source: "chain" };

  const fromApis = await fetchWebsiteFromApis(apiKey, prospect.placeId);
  if (fromApis) return { website: fromApis, source: "api" };

  const fromTextSearch = await fetchWebsiteViaTextSearch(apiKey, prospect);
  if (fromTextSearch) return { website: fromTextSearch, source: "api" };

  return { website: null };
}

export async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += limit) {
    const batch = items.slice(i, i + limit);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }

  return results;
}
