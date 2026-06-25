import { afterEach, describe, expect, it, vi } from "vitest";
import type { Prospect } from "@/lib/types/prospect";
import {
  inferChainWebsite,
  normalizeWebsiteUrl,
  resolveProspectWebsite,
} from "@/lib/website-resolver";

function makeProspect(overrides: Partial<Prospect> = {}): Prospect {
  return {
    placeId: "ChIJTestPlaceId123",
    name: "Ampol",
    address: "Brisbane Road, 152 - Labrador",
    lat: -27.935,
    lng: 153.391,
    rating: null,
    reviewCount: null,
    website: null,
    phone: "+61755371744",
    mapsUrl: "https://maps.google.com/?q=place_id:ChIJTestPlaceId123",
    types: ["gas_station"],
    heatScore: 75,
    tier: "hot",
    openingHours: ["Monday: Open 24 hours"],
    ...overrides,
  };
}

describe("normalizeWebsiteUrl", () => {
  it("returns null for empty values", () => {
    expect(normalizeWebsiteUrl(null)).toBeNull();
    expect(normalizeWebsiteUrl("")).toBeNull();
  });

  it("accepts valid business websites", () => {
    expect(normalizeWebsiteUrl("https://www.ampol.com.au/")).toBe(
      "https://www.ampol.com.au/"
    );
  });

  it("rejects Google Maps redirect URLs", () => {
    expect(
      normalizeWebsiteUrl("https://maps.google.com/?cid=123456789")
    ).toBeNull();
  });
});

describe("inferChainWebsite", () => {
  it("detects Ampol gas stations", () => {
    expect(inferChainWebsite("Ampol", ["gas_station"])).toBe(
      "https://www.ampol.com.au/"
    );
  });

  it("detects Caltex gas stations", () => {
    expect(inferChainWebsite("Caltex Miami", ["gas_station"])).toBe(
      "https://www.caltex.com.au/"
    );
  });

  it("returns null for independent restaurants", () => {
    expect(inferChainWebsite("Restaurante do Zé", ["restaurant"])).toBeNull();
  });

  it("returns null when brand name appears but type is not eligible", () => {
    expect(inferChainWebsite("Ampol Consulting", ["lawyer"])).toBeNull();
  });
});

describe("resolveProspectWebsite", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns website from Place Details (New)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("places.googleapis.com/v1/places/")) {
          return new Response(
            JSON.stringify({ websiteUri: "https://www.example.com/" }),
            { status: 200 }
          );
        }
        return new Response("{}", { status: 404 });
      })
    );

    const result = await resolveProspectWebsite(
      "key",
      makeProspect({ name: "Local Shop", types: ["store"] })
    );
    expect(result).toEqual({
      website: "https://www.example.com/",
      source: "api",
    });
  });

  it("uses chain inference before calling APIs", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await resolveProspectWebsite("key", makeProspect());
    expect(result).toEqual({
      website: "https://www.ampol.com.au/",
      source: "chain",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns null when chain and APIs find no website", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("places.googleapis.com")) {
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
        return new Response("{}", { status: 404 });
      })
    );

    const result = await resolveProspectWebsite(
      "key",
      makeProspect({ name: "Independent Fuel", types: ["gas_station"] })
    );
    expect(result).toEqual({ website: null });
  });

  it("uses Text Search when details APIs are empty", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
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
          return new Response(
            JSON.stringify({
              places: [
                {
                  id: "places/ChIJTestPlaceId123",
                  websiteUri: "https://www.localshop.com.au/",
                },
              ],
            }),
            { status: 200 }
          );
        }
        return new Response("{}", { status: 404 });
      })
    );

    const result = await resolveProspectWebsite(
      "key",
      makeProspect({ name: "Local Shop", types: ["store"] })
    );
    expect(result).toEqual({
      website: "https://www.localshop.com.au/",
      source: "api",
    });
  });
});
