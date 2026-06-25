import { afterEach, describe, expect, it, vi } from "vitest";
import { scoreProspect } from "@/lib/prospect-score";
import type { Prospect } from "@/lib/types/prospect";
import { enrichProspectWebsites } from "@/lib/google-places";
import { normalizeWebsiteUrl } from "@/lib/website-resolver";

function makeProspect(overrides: Partial<Prospect> = {}): Prospect {
  const base: Prospect = {
    placeId: "ChIJTestPlaceId123",
    name: "Ampol Foodary",
    address: "152 Brisbane Rd, Labrador QLD",
    lat: -27.935,
    lng: 153.391,
    rating: 4.2,
    reviewCount: 120,
    website: null,
    phone: "+61712345678",
    mapsUrl: "https://maps.google.com/?q=place_id:ChIJTestPlaceId123",
    types: ["gas_station"],
    heatScore: 70,
    tier: "hot",
    openingHours: ["Monday: 6:00 AM – 10:00 PM"],
  };

  return { ...base, ...overrides };
}

function mockEmptyApiResponses() {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);

    if (url.includes("places.googleapis.com/v1/places/")) {
      return new Response(JSON.stringify({}), { status: 200 });
    }

    if (url.includes("maps.googleapis.com/maps/api/place/details")) {
      return new Response(
        JSON.stringify({ status: "OK", result: {} }),
        { status: 200 }
      );
    }

    if (url.includes("places:searchText")) {
      return new Response(JSON.stringify({ places: [] }), { status: 200 });
    }

    return new Response(JSON.stringify({ status: "OK" }), { status: 200 });
  });
}

describe("scoreProspect with website", () => {
  it("caps score at 25 when website is present", () => {
    const { heatScore, tier } = scoreProspect({
      reviewCount: 200,
      rating: 4.5,
      website: "https://www.ampol.com.au/",
      phone: "+61712345678",
      openingHours: ["Monday: 6:00 AM – 10:00 PM"],
    });

    expect(heatScore).toBeLessThanOrEqual(25);
    expect(tier).toBe("cold");
  });
});

describe("enrichProspectWebsites", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fills website from Place Details (New) and recalculates tier", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("places.googleapis.com/v1/places/")) {
        return new Response(
          JSON.stringify({ websiteUri: "https://www.localshop.com.au/" }),
          { status: 200 }
        );
      }

      return new Response(JSON.stringify({ status: "OK" }), { status: 200 });
    });

    vi.stubGlobal("fetch", fetchMock);

    const prospects = [
      makeProspect({ name: "Local Shop", types: ["store"] }),
    ];
    const enriched = await enrichProspectWebsites("test-api-key", prospects);

    expect(enriched[0].website).toBe("https://www.localshop.com.au/");
    expect(enriched[0].websiteSource).toBe("api");
    expect(enriched[0].heatScore).toBeLessThanOrEqual(25);
    expect(enriched[0].tier).toBe("cold");
    expect(fetchMock).toHaveBeenCalled();
  });

  it("falls back to legacy Place Details when New API returns no website", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("places.googleapis.com/v1/places/")) {
        return new Response(JSON.stringify({}), { status: 200 });
      }

      if (url.includes("maps.googleapis.com/maps/api/place/details")) {
        return new Response(
          JSON.stringify({
            status: "OK",
            result: { website: "https://www.localshop.com.au/" },
          }),
          { status: 200 }
        );
      }

      return new Response(JSON.stringify({ status: "OK" }), { status: 200 });
    });

    vi.stubGlobal("fetch", fetchMock);

    const prospects = [
      makeProspect({ name: "Local Shop", types: ["store"] }),
    ];
    const enriched = await enrichProspectWebsites("test-api-key", prospects);

    expect(enriched[0].website).toBe("https://www.localshop.com.au/");
    expect(enriched[0].websiteSource).toBe("api");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("uses chain inference when all API layers return empty", async () => {
    vi.stubGlobal("fetch", mockEmptyApiResponses());

    const prospects = [makeProspect({ name: "Ampol", reviewCount: null, rating: null })];
    const enriched = await enrichProspectWebsites("test-api-key", prospects);

    expect(enriched[0].website).toBe("https://www.ampol.com.au/");
    expect(enriched[0].websiteSource).toBe("chain");
    expect(enriched[0].heatScore).toBeLessThanOrEqual(25);
    expect(enriched[0].tier).toBe("cold");
  });

  it("calls onProgress for each enriched prospect", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("places.googleapis.com/v1/places/")) {
          return new Response(
            JSON.stringify({ websiteUri: "https://www.localshop.com.au/" }),
            { status: 200 }
          );
        }
        return new Response(JSON.stringify({ status: "OK" }), { status: 200 });
      })
    );

    const prospects = [
      makeProspect({ placeId: "ChIJ1", name: "Shop A", types: ["store"] }),
      makeProspect({ placeId: "ChIJ2", name: "Shop B", types: ["store"] }),
    ];
    const progressEvents: Array<{ done: number; total: number }> = [];

    await enrichProspectWebsites("test-api-key", prospects, {
      onProgress: (done, total) => {
        progressEvents.push({ done, total });
      },
    });

    expect(progressEvents).toEqual([
      { done: 1, total: 2 },
      { done: 2, total: 2 },
    ]);
  });

  it("does not call API when prospect already has website", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const prospects = [
      makeProspect({
        website: "https://www.ampol.com.au/",
        websiteSource: "api",
        heatScore: 20,
        tier: "cold",
      }),
    ];

    const enriched = await enrichProspectWebsites("test-api-key", prospects);

    expect(enriched[0].website).toBe("https://www.ampol.com.au/");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("skips OSM prospects", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const prospects = [
      makeProspect({ placeId: "osm:node/123", website: null }),
    ];

    const enriched = await enrichProspectWebsites("test-api-key", prospects);

    expect(enriched[0].website).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("normalizeWebsiteUrl re-export", () => {
  it("is available from website-resolver", () => {
    expect(normalizeWebsiteUrl("https://www.ampol.com.au/")).toBe(
      "https://www.ampol.com.au/"
    );
  });
});
