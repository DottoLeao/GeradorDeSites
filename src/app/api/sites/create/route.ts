import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createSiteFromManualInput,
  createSiteFromMapsUrl,
  createSiteFromProspect,
} from "@/lib/services/sites";
import { createFromProspectSchema } from "@/lib/schemas/prospect";
import type { TemplateId } from "@/lib/types/database";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const body = await request.json();
    const { mode } = body;

    if (mode === "manual") {
      const result = await createSiteFromManualInput(body);
      return NextResponse.json(result);
    }

    if (mode === "prospect") {
      const parsed = createFromProspectSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Dados do prospect inválidos", details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const result = await createSiteFromProspect(
        parsed.data.prospect,
        parsed.data.templateId,
        parsed.data.clientEmail
      );
      return NextResponse.json(result);
    }

    const { mapsUrl, templateId, clientEmail } = body;

    if (!mapsUrl || !templateId || !clientEmail) {
      return NextResponse.json(
        { error: "mapsUrl, templateId e clientEmail são obrigatórios" },
        { status: 400 }
      );
    }

    const result = await createSiteFromMapsUrl(
      mapsUrl,
      templateId as TemplateId,
      clientEmail
    );

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro interno ao criar site";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
