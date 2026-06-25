import { z } from "zod";

export const prospectSchema = z.object({
  placeId: z.string().min(1),
  name: z.string().min(1),
  address: z.string(),
  lat: z.number(),
  lng: z.number(),
  rating: z.number().nullable(),
  reviewCount: z.number().nullable(),
  website: z.string().nullable(),
  websiteSource: z.enum(["api", "chain"]).optional(),
  phone: z.string().nullable(),
  mapsUrl: z.string().url(),
  types: z.array(z.string()),
  heatScore: z.number(),
  tier: z.enum(["hot", "warm", "cold"]),
  city: z.string().optional(),
  state: z.string().optional(),
  openingHours: z.array(z.string()).nullable().optional(),
  primaryTypeLabel: z.string().optional(),
  openNow: z.boolean().nullable().optional(),
  businessStatus: z.string().nullable().optional(),
});

export const createFromProspectSchema = z.object({
  mode: z.literal("prospect"),
  prospect: prospectSchema,
  templateId: z.enum(["universal", "restaurant", "clinic"]),
  clientEmail: z.string().email(),
});

export type ProspectInput = z.infer<typeof prospectSchema>;
