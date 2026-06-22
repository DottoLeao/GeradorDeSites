import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PlaceDetails } from "@/lib/google-places";
import type { Prospect } from "@/lib/types/prospect";

export interface CreateSiteResult {
  siteId: string;
  slug: string;
  siteUrl: string;
  magicLink?: string;
  error?: string;
}

async function generateUniqueSlug(baseName: string): Promise<string> {
  const admin = createAdminClient();
  let slug = baseName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  let counter = 0;

  while (true) {
    const candidate = counter === 0 ? slug : `${slug}-${counter}`;
    const { data } = await admin
      .from("sites")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

    if (!data) return candidate;
    counter++;
  }
}

async function createSiteOwner(email: string, businessName: string) {
  const admin = createAdminClient();

  const { data: existingUsers } = await admin.auth.admin.listUsers();
  const existing = existingUsers?.users?.find((u) => u.email === email);

  if (existing) {
    return existing.id;
  }

  const { data: newUser, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    app_metadata: { role: "client" },
    user_metadata: { full_name: businessName },
  });

  if (error || !newUser.user) {
    throw new Error(error?.message ?? "Falha ao criar usuário cliente");
  }

  return newUser.user.id;
}

async function generateMagicLink(email: string): Promise<string | undefined> {
  try {
    const admin = createAdminClient();
    const platformHost = process.env.NEXT_PUBLIC_PLATFORM_HOST ?? "localhost:3000";
    const protocol = platformHost.includes("localhost") ? "http" : "https";

    const { data, error } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: {
        redirectTo: `${protocol}://${platformHost}/auth/callback?next=/dashboard`,
      },
    });

    if (error || !data.properties?.action_link) {
      console.error("Magic link generation failed:", error);
      return undefined;
    }

    return data.properties.action_link;
  } catch (error) {
    console.error("Magic link error:", error);
    return undefined;
  }
}

export async function createSiteFromMapsUrl(
  mapsUrl: string,
  templateId: string,
  clientEmail: string
): Promise<CreateSiteResult> {
  const { fetchPlaceDetails } = await import("@/lib/google-places");
  const { generateSiteContentWithAI } = await import("@/lib/ai/generate-content");
  const admin = createAdminClient();

  const place = await fetchPlaceDetails(mapsUrl);
  const { content, seo } = await generateSiteContentWithAI(place, templateId);
  const slug = await generateUniqueSlug(place.name);
  const ownerId = await createSiteOwner(clientEmail, place.name);

  const { data: site, error: siteError } = await admin
    .from("sites")
    .insert({
      slug,
      template_id: templateId,
      status: "active",
      owner_id: ownerId,
      business_name: place.name,
    })
    .select()
    .single();

  if (siteError || !site) {
    throw new Error(siteError?.message ?? "Falha ao criar site");
  }

  await Promise.all([
    admin.from("site_content").insert({
      site_id: site.id,
      content,
      version: 1,
    }),
    admin.from("site_seo").insert({
      site_id: site.id,
      title: seo.title,
      description: seo.description,
      keywords: seo.keywords,
      schema_markup: seo.schemaMarkup,
    }),
    admin.from("subscriptions").insert({
      site_id: site.id,
      status: "trialing",
    }),
    admin.from("site_health").insert({
      site_id: site.id,
      status: "up",
    }),
  ]);

  const platformHost = process.env.NEXT_PUBLIC_PLATFORM_HOST ?? "localhost:3000";
  const protocol = platformHost.includes("localhost") ? "http" : "https";
  const siteUrl = `${protocol}://${slug}.${platformHost.replace(/^app\./, "")}`;
  const magicLink = await generateMagicLink(clientEmail);

  return { siteId: site.id, slug, siteUrl, magicLink };
}

function prospectToPlaceDetails(prospect: Prospect): PlaceDetails {
  return {
    placeId: prospect.placeId,
    name: prospect.name,
    formattedAddress: prospect.address,
    phone: prospect.phone,
    website: prospect.website,
    mapsUrl: prospect.mapsUrl,
    city: prospect.city ?? "",
    state: prospect.state ?? "",
    zipCode: null,
    rating: prospect.rating,
    reviewCount: prospect.reviewCount,
    photos: [],
    openingHours: prospect.openingHours ?? null,
    types: prospect.types,
    reviews: [],
  };
}

export async function createSiteFromProspect(
  prospect: Prospect,
  templateId: string,
  clientEmail: string
): Promise<CreateSiteResult> {
  const { generateSiteContentWithAI } = await import("@/lib/ai/generate-content");
  const admin = createAdminClient();

  const place = prospectToPlaceDetails(prospect);
  const { content, seo } = await generateSiteContentWithAI(place, templateId);
  const slug = await generateUniqueSlug(prospect.name);
  const ownerId = await createSiteOwner(clientEmail, prospect.name);

  const { data: site, error: siteError } = await admin
    .from("sites")
    .insert({
      slug,
      template_id: templateId,
      status: "active",
      owner_id: ownerId,
      business_name: prospect.name,
    })
    .select()
    .single();

  if (siteError || !site) {
    throw new Error(siteError?.message ?? "Falha ao criar site");
  }

  await Promise.all([
    admin.from("site_content").insert({
      site_id: site.id,
      content,
      version: 1,
    }),
    admin.from("site_seo").insert({
      site_id: site.id,
      title: seo.title,
      description: seo.description,
      keywords: seo.keywords,
      schema_markup: seo.schemaMarkup,
    }),
    admin.from("subscriptions").insert({
      site_id: site.id,
      status: "trialing",
    }),
    admin.from("site_health").insert({
      site_id: site.id,
      status: "up",
    }),
  ]);

  const platformHost = process.env.NEXT_PUBLIC_PLATFORM_HOST ?? "localhost:3000";
  const protocol = platformHost.includes("localhost") ? "http" : "https";
  const siteUrl = `${protocol}://${slug}.${platformHost.replace(/^app\./, "")}`;
  const magicLink = await generateMagicLink(clientEmail);

  return { siteId: site.id, slug, siteUrl, magicLink };
}

export async function createSiteFromManualInput(
  input: unknown
): Promise<CreateSiteResult> {
  const { manualSiteInputSchema } = await import("@/lib/schemas/templates");
  const { generateContentFromManualInput } = await import("@/lib/ai/generate-content");
  const parsed = manualSiteInputSchema.parse(input);
  const admin = createAdminClient();

  const { content, seo } = await generateContentFromManualInput(parsed);
  const slug = await generateUniqueSlug(parsed.businessName);
  const ownerId = await createSiteOwner(parsed.email, parsed.businessName);

  const { data: site, error: siteError } = await admin
    .from("sites")
    .insert({
      slug,
      template_id: parsed.templateId,
      status: "active",
      owner_id: ownerId,
      business_name: parsed.businessName,
    })
    .select()
    .single();

  if (siteError || !site) {
    throw new Error(siteError?.message ?? "Falha ao criar site");
  }

  await Promise.all([
    admin.from("site_content").insert({
      site_id: site.id,
      content,
      version: 1,
    }),
    admin.from("site_seo").insert({
      site_id: site.id,
      title: seo.title,
      description: seo.description,
      keywords: seo.keywords,
      schema_markup: seo.schemaMarkup,
    }),
    admin.from("subscriptions").insert({
      site_id: site.id,
      status: "trialing",
    }),
    admin.from("site_health").insert({
      site_id: site.id,
      status: "up",
    }),
  ]);

  const platformHost = process.env.NEXT_PUBLIC_PLATFORM_HOST ?? "localhost:3000";
  const protocol = platformHost.includes("localhost") ? "http" : "https";
  const siteUrl = `${protocol}://${slug}.${platformHost.replace(/^app\./, "")}`;
  const magicLink = await generateMagicLink(parsed.email);

  return { siteId: site.id, slug, siteUrl, magicLink };
}

export async function getRecentSites(limit = 20) {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("sites")
    .select(
      `
      id,
      slug,
      template_id,
      status,
      business_name,
      created_at,
      owner_id,
      profiles:owner_id (email, full_name)
    `
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getSiteBySlug(slug: string) {
  const admin = createAdminClient();

  const { data: site } = await admin
    .from("sites")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!site) {
    const { data: byDomain } = await admin
      .from("sites")
      .select("*")
      .eq("custom_domain", slug)
      .maybeSingle();
    return byDomain;
  }

  return site;
}

async function fetchSiteWithContent(slug: string) {
  const site = await getSiteBySlug(slug);
  if (!site) return null;

  const admin = createAdminClient();

  const [contentRes, seoRes, subRes] = await Promise.all([
    admin.from("site_content").select("*").eq("site_id", site.id).single(),
    admin.from("site_seo").select("*").eq("site_id", site.id).single(),
    admin
      .from("subscriptions")
      .select("*")
      .eq("site_id", site.id)
      .maybeSingle(),
  ]);

  return {
    site,
    content: contentRes.data?.content ?? null,
    seo: seoRes.data ?? null,
    subscription: subRes.data ?? null,
  };
}

export async function getSiteWithContent(slug: string) {
  return unstable_cache(
    () => fetchSiteWithContent(slug),
    [`site-content-${slug}`],
    {
      tags: [`site:${slug}`],
      revalidate: 60,
    }
  )();
}

export async function getClientSite(userId: string) {
  const admin = createAdminClient();

  const { data: site } = await admin
    .from("sites")
    .select("*")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!site) return null;

  const [contentRes, seoRes, subRes] = await Promise.all([
    admin.from("site_content").select("*").eq("site_id", site.id).single(),
    admin.from("site_seo").select("*").eq("site_id", site.id).single(),
    admin
      .from("subscriptions")
      .select("*")
      .eq("site_id", site.id)
      .maybeSingle(),
  ]);

  return {
    site,
    content: contentRes.data?.content ?? null,
    seo: seoRes.data ?? null,
    subscription: subRes.data ?? null,
  };
}
