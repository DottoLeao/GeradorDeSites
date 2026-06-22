export type ProspectTier = "hot" | "warm" | "cold";

export interface Prospect {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating: number | null;
  reviewCount: number | null;
  website: string | null;
  phone: string | null;
  mapsUrl: string;
  types: string[];
  heatScore: number;
  tier: ProspectTier;
  city?: string;
  state?: string;
  openingHours?: string[] | null;
  primaryTypeLabel?: string;
  openNow?: boolean | null;
  businessStatus?: string | null;
}
