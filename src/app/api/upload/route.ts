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

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const siteId = formData.get("siteId") as string | null;

    if (!file || !siteId) {
      return NextResponse.json(
        { error: "file e siteId são obrigatórios" },
        { status: 400 }
      );
    }

    const { data: site } = await supabase
      .from("sites")
      .select("owner_id")
      .eq("id", siteId)
      .single();

    if (!site || site.owner_id !== user.id) {
      return NextResponse.json({ error: "Site não encontrado" }, { status: 404 });
    }

    const ext = file.name.split(".").pop() ?? "webp";
    const fileName = `${siteId}/${Date.now()}.${ext}`;

    const { data, error } = await supabase.storage
      .from("site-images")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("site-images").getPublicUrl(data.path);

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro no upload";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
