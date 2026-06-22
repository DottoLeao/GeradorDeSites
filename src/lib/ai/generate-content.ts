import OpenAI from "openai";
import { z } from "zod";
import type { PlaceDetails } from "@/lib/google-places";
import { parseOpeningHours } from "@/lib/google-places";
import {
  createDefaultContent,
  defaultTheme,
  getContentSchema,
  seoSchema,
  type SiteSeoContent,
  type UniversalContent,
} from "@/lib/schemas/templates";

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

const aiContentResponseSchema = z.object({
  tagline: z.string(),
  description: z.string(),
  services: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
    })
  ),
  about: z.object({
    title: z.string(),
    content: z.string(),
  }),
  cta: z.object({
    title: z.string(),
    subtitle: z.string(),
    buttonText: z.string(),
  }),
  seo: seoSchema,
  theme: z
    .object({
      primaryColor: z.string(),
      secondaryColor: z.string(),
      accentColor: z.string(),
    })
    .optional(),
  menu: z
    .array(
      z.object({
        category: z.string(),
        items: z.array(
          z.object({
            name: z.string(),
            description: z.string(),
            price: z.string(),
          })
        ),
      })
    )
    .optional(),
  cuisine: z.string().optional(),
});

export async function generateSiteContentWithAI(
  place: PlaceDetails,
  templateId: string
): Promise<{ content: UniversalContent; seo: SiteSeoContent }> {
  const baseContent = createDefaultContent(templateId, place.name);
  const openai = getOpenAIClient();

  if (!openai) {
    const fallbackContent = buildFallbackContent(place, templateId, baseContent);
    const fallbackSeo = buildFallbackSeo(place);
    return { content: fallbackContent, seo: fallbackSeo };
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Você é um copywriter especializado em sites para negócios locais brasileiros.
Gere conteúdo persuasivo, profissional e otimizado para SEO em português do Brasil.
Retorne APENAS JSON válido com a estrutura solicitada.
Template: ${templateId}`,
        },
        {
          role: "user",
          content: JSON.stringify({
            business: {
              name: place.name,
              address: place.formattedAddress,
              phone: place.phone,
              rating: place.rating,
              reviewCount: place.reviewCount,
              types: place.types,
              reviews: place.reviews.map((r) => r.text).slice(0, 3),
              openingHours: place.openingHours,
            },
            requiredFields: {
              tagline: "string - frase de impacto curta",
              description: "string - parágrafo sobre o negócio",
              services: "array de 3-4 serviços com title e description",
              about: { title: "string", content: "string - 2 parágrafos" },
              cta: { title: "string", subtitle: "string", buttonText: "string" },
              seo: {
                title: "string 10-70 chars",
                description: "string 50-160 chars",
                keywords: "array de 5-10 palavras-chave",
                schemaMarkup: "objeto JSON-LD LocalBusiness completo",
              },
              theme: {
                primaryColor: "#hex",
                secondaryColor: "#hex",
                accentColor: "#hex",
              },
              ...(templateId === "restaurant"
                ? {
                    menu: "array de categorias com items (name, description, price)",
                    cuisine: "string",
                  }
                : {}),
            },
          }),
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) throw new Error("Resposta vazia da IA");

    const parsed = aiContentResponseSchema.parse(JSON.parse(raw));
    const contentSchema = getContentSchema(templateId);

    const merged = {
      ...baseContent,
      tagline: parsed.tagline,
      description: parsed.description,
      heroImage: place.photos[0] ?? "",
      logoUrl: "",
      theme: parsed.theme ?? defaultTheme,
      contact: {
        phone: place.phone ?? "",
        email: "",
        address: place.formattedAddress,
        city: place.city,
        state: place.state,
        zipCode: place.zipCode ?? "",
        mapsUrl: place.mapsUrl,
      },
      hours: parseHoursFromPlace(place),
      services: parsed.services,
      gallery: place.photos.slice(1, 6),
      about: {
        ...parsed.about,
        image: place.photos[1] ?? "",
      },
      cta: parsed.cta,
      ...(templateId === "restaurant"
        ? {
            menu: parsed.menu ?? [],
            cuisine: parsed.cuisine ?? "Culinária variada",
          }
        : {}),
    };

    const content = contentSchema.parse(merged);
    const seo = seoSchema.parse(parsed.seo);

    return { content, seo };
  } catch (error) {
    console.error("AI generation failed, using fallback:", error);
    return {
      content: buildFallbackContent(place, templateId, baseContent),
      seo: buildFallbackSeo(place),
    };
  }
}

function parseHoursFromPlace(place: PlaceDetails) {
  return parseOpeningHours(place.openingHours);
}

function buildFallbackContent(
  place: PlaceDetails,
  templateId: string,
  base: UniversalContent
): UniversalContent {
  const content = {
    ...base,
    heroImage: place.photos[0] ?? "",
    contact: {
      phone: place.phone ?? "",
      email: "",
      address: place.formattedAddress,
      city: place.city,
      state: place.state,
      zipCode: place.zipCode ?? "",
      mapsUrl: place.mapsUrl,
    },
    gallery: place.photos.slice(1, 6),
    about: {
      ...base.about,
      content: `${place.name} está localizado em ${place.formattedAddress}. Venha nos visitar!`,
      image: place.photos[1] ?? "",
    },
  };

  return getContentSchema(templateId).parse(content) as UniversalContent;
}

function buildFallbackSeo(place: PlaceDetails): SiteSeoContent {
  const title = `${place.name} | ${place.city}, ${place.state}`;
  const description = `Conheça ${place.name} em ${place.city}. ${place.formattedAddress}. Entre em contato: ${place.phone ?? "veja no site"}.`;

  return seoSchema.parse({
    title: title.slice(0, 70),
    description: description.slice(0, 160),
    keywords: [
      place.name,
      place.city,
      place.state,
      ...(place.types ?? []).slice(0, 3),
      "negócio local",
    ],
    schemaMarkup: {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: place.name,
      address: {
        "@type": "PostalAddress",
        streetAddress: place.formattedAddress,
        addressLocality: place.city,
        addressRegion: place.state,
        postalCode: place.zipCode,
        addressCountry: "BR",
      },
      telephone: place.phone,
      url: place.website ?? place.mapsUrl,
      aggregateRating: place.rating
        ? {
            "@type": "AggregateRating",
            ratingValue: place.rating,
            reviewCount: place.reviewCount,
          }
        : undefined,
    },
  });
}

export async function generateContentFromManualInput(
  input: {
    businessName: string;
    templateId: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    description?: string;
  }
): Promise<{ content: UniversalContent; seo: SiteSeoContent }> {
  const base = createDefaultContent(input.templateId, input.businessName);
  const contentSchema = getContentSchema(input.templateId);

  const content = contentSchema.parse({
    ...base,
    description: input.description ?? base.description,
    contact: {
      ...base.contact,
      phone: input.phone,
      address: input.address,
      city: input.city,
      state: input.state,
    },
  });

  const seo = seoSchema.parse({
    title: `${input.businessName} | ${input.city}, ${input.state}`,
    description: `${input.businessName} — ${input.description ?? "Seu negócio local de confiança"}. Localizado em ${input.city}, ${input.state}.`,
    keywords: [input.businessName, input.city, input.state, "negócio local"],
    schemaMarkup: {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: input.businessName,
      telephone: input.phone,
      address: {
        "@type": "PostalAddress",
        streetAddress: input.address,
        addressLocality: input.city,
        addressRegion: input.state,
        addressCountry: "BR",
      },
    },
  });

  return { content, seo };
}
