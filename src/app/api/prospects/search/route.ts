import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { searchProspects } from "@/lib/places-provider";

const searchSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radiusMeters: z.number().min(1000).max(50000),
});

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
    const parsed = searchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Parâmetros inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const prospects = await searchProspects(parsed.data);

    return NextResponse.json({ prospects });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Erro interno ao buscar prospects";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
