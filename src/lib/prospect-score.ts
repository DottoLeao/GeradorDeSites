import type { ProspectTier } from "@/lib/types/prospect";

export interface ProspectScoreInput {
  rating?: number | null;
  reviewCount?: number | null;
  website?: string | null;
  phone?: string | null;
  openingHours?: string[] | null;
}

export function scoreProspect(
  input: ProspectScoreInput
): { heatScore: number; tier: ProspectTier } {
  const reviews = input.reviewCount ?? 0;
  const hasWebsite = Boolean(input.website);
  let score = 0;

  if (!hasWebsite) score += 60;
  score += (Math.min(reviews, 300) / 300) * 30;
  if ((input.rating ?? 0) >= 4) score += 10;

  if (!hasWebsite && input.phone) score += 10;
  if (!hasWebsite && input.openingHours && input.openingHours.length > 0) {
    score += 5;
  }

  if (hasWebsite) score = Math.min(score, 25);

  const tier: ProspectTier =
    score >= 60 ? "hot" : score >= 35 ? "warm" : "cold";

  return { heatScore: Math.round(score), tier };
}
