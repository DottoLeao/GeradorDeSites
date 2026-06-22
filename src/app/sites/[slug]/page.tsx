import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteRenderer } from "@/templates";
import { SiteUnavailable } from "@/components/SiteUnavailable";
import { getSiteWithContent } from "@/lib/services/sites";
import type { UniversalContent } from "@/lib/schemas/templates";

export const revalidate = 60;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getSiteWithContent(slug);

  if (!data?.seo) {
    return { title: "Site não encontrado" };
  }

  return {
    title: data.seo.title,
    description: data.seo.description,
    keywords: data.seo.keywords,
    openGraph: {
      title: data.seo.title,
      description: data.seo.description,
      type: "website",
    },
  };
}

export default async function PublicSitePage({ params }: PageProps) {
  const { slug } = await params;
  const data = await getSiteWithContent(slug);

  if (!data) notFound();

  const { site, content, seo, subscription } = data;

  const isSuspended =
    site.status === "suspended" ||
    (subscription &&
      !["active", "trialing"].includes(subscription.status));

  if (isSuspended) {
    return <SiteUnavailable />;
  }

  if (!content) notFound();

  const schemaJson = seo?.schema_markup
    ? JSON.stringify(seo.schema_markup)
    : null;

  return (
    <>
      {schemaJson && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: schemaJson }}
        />
      )}
      <SiteRenderer
        templateId={site.template_id}
        content={content as UniversalContent}
      />
    </>
  );
}
