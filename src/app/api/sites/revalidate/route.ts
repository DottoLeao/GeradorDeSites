import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { siteId, slug } = await request.json();

    if (!siteId && !slug) {
      return NextResponse.json(
        { error: "siteId ou slug é obrigatório" },
        { status: 400 }
      );
    }

    const tag = siteId ? `site:${siteId}` : `site:${slug}`;
    revalidateTag(tag, "max");

    if (slug) revalidateTag(`site:${slug}`, "max");

    return NextResponse.json({ revalidated: true, tag });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao revalidar";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
