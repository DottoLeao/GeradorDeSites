import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getContentSchema } from "@/lib/schemas/templates";

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { siteId, content, seo } = await request.json();

    const { data: site } = await supabase
      .from("sites")
      .select("id, template_id, owner_id, slug")
      .eq("id", siteId)
      .single();

    if (!site || site.owner_id !== user.id) {
      return NextResponse.json({ error: "Site não encontrado" }, { status: 404 });
    }

    const contentSchema = getContentSchema(site.template_id);
    const validatedContent = contentSchema.parse(content);

    const { error: contentError } = await supabase
      .from("site_content")
      .update({ content: validatedContent })
      .eq("site_id", siteId);

    if (contentError) {
      return NextResponse.json({ error: contentError.message }, { status: 500 });
    }

    if (seo) {
      await supabase
        .from("site_seo")
        .update({
          title: seo.title,
          description: seo.description,
          keywords: seo.keywords,
        })
        .eq("site_id", siteId);
    }

    await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/sites/revalidate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteId, slug: site.slug }),
    }).catch(() => {
      // Revalidation will happen on next ISR cycle
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao salvar conteúdo";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
