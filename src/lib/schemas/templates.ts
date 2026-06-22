import { z } from "zod";

export const themeSchema = z.object({
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});

export const contactSchema = z.object({
  phone: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  zipCode: z.string().optional(),
  mapsUrl: z.string().url().optional().or(z.literal("")),
});

export const hoursSchema = z.object({
  monday: z.string(),
  tuesday: z.string(),
  wednesday: z.string(),
  thursday: z.string(),
  friday: z.string(),
  saturday: z.string(),
  sunday: z.string(),
});

export const universalContentSchema = z.object({
  businessName: z.string().min(1),
  tagline: z.string().min(1),
  description: z.string().min(1),
  heroImage: z.string().url().optional().or(z.literal("")),
  logoUrl: z.string().url().optional().or(z.literal("")),
  theme: themeSchema,
  contact: contactSchema,
  hours: hoursSchema,
  services: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      icon: z.string().optional(),
    })
  ),
  gallery: z.array(z.string().url()).default([]),
  about: z.object({
    title: z.string(),
    content: z.string(),
    image: z.string().url().optional().or(z.literal("")),
  }),
  cta: z.object({
    title: z.string(),
    subtitle: z.string(),
    buttonText: z.string(),
  }),
});

export const restaurantContentSchema = universalContentSchema.extend({
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
    .default([]),
  cuisine: z.string().optional(),
});

export const seoSchema = z.object({
  title: z.string().min(10).max(70),
  description: z.string().min(50).max(160),
  keywords: z.array(z.string()).min(3).max(15),
  schemaMarkup: z.record(z.string(), z.unknown()),
});

export const manualSiteInputSchema = z.object({
  businessName: z.string().min(2),
  templateId: z.enum(["universal", "restaurant", "clinic"]),
  email: z.string().email(),
  phone: z.string().min(8),
  address: z.string().min(5),
  city: z.string().min(2),
  state: z.string().min(2),
  description: z.string().optional(),
});

export type UniversalContent = z.infer<typeof universalContentSchema>;
export type RestaurantContent = z.infer<typeof restaurantContentSchema>;
export type SiteSeoContent = z.infer<typeof seoSchema>;
export type ManualSiteInput = z.infer<typeof manualSiteInputSchema>;

export function getContentSchema(templateId: string) {
  switch (templateId) {
    case "restaurant":
      return restaurantContentSchema;
    case "clinic":
      return universalContentSchema;
    default:
      return universalContentSchema;
  }
}

export const defaultTheme = {
  primaryColor: "#1e40af",
  secondaryColor: "#3b82f6",
  accentColor: "#f59e0b",
};

export const defaultHours = {
  monday: "09:00 - 18:00",
  tuesday: "09:00 - 18:00",
  wednesday: "09:00 - 18:00",
  thursday: "09:00 - 18:00",
  friday: "09:00 - 18:00",
  saturday: "09:00 - 14:00",
  sunday: "Fechado",
};

export function createDefaultContent(
  templateId: string,
  businessName: string
): UniversalContent | RestaurantContent {
  const base: UniversalContent = {
    businessName,
    tagline: `Bem-vindo à ${businessName}`,
    description: `${businessName} — qualidade e atendimento que você merece.`,
    heroImage: "",
    logoUrl: "",
    theme: defaultTheme,
    contact: {
      phone: "",
      email: "",
      address: "",
      city: "",
      state: "",
      mapsUrl: "",
    },
    hours: defaultHours,
    services: [
      {
        title: "Atendimento Premium",
        description: "Serviço de excelência para nossos clientes.",
      },
      {
        title: "Qualidade Garantida",
        description: "Compromisso com a melhor experiência.",
      },
      {
        title: "Equipe Especializada",
        description: "Profissionais prontos para atender você.",
      },
    ],
    gallery: [],
    about: {
      title: "Sobre Nós",
      content: `${businessName} nasceu com a missão de oferecer o melhor para nossos clientes.`,
      image: "",
    },
    cta: {
      title: "Entre em Contato",
      subtitle: "Estamos prontos para atender você.",
      buttonText: "Fale Conosco",
    },
  };

  if (templateId === "restaurant") {
    return {
      ...base,
      cuisine: "Culinária variada",
      menu: [],
    };
  }

  return base;
}
