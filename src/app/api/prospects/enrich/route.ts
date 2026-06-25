import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { enrichProspectsWithProgress } from "@/lib/places-provider";
import { prospectSchema } from "@/lib/schemas/prospect";
import type { Prospect } from "@/lib/types/prospect";

const enrichSchema = z.object({
  prospects: z.array(prospectSchema).max(50),
});

function countNeedsEnrich(prospects: Prospect[]): number {
  return prospects.filter(
    (p) => !p.website && !p.placeId.startsWith("osm:")
  ).length;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return Response.json({ error: "Acesso negado" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = enrichSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Parâmetros inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { prospects } = parsed.data;
    const total = countNeedsEnrich(prospects);
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const write = (event: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        };

        try {
          write({ type: "start", total });

          const enriched = await enrichProspectsWithProgress(
            prospects,
            (done, progressTotal, prospect) => {
              write({ type: "progress", done, total: progressTotal, prospect });
            }
          );

          write({ type: "complete", prospects: enriched });
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Erro interno ao enriquecer prospects";
          write({ type: "error", error: message });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Erro interno ao enriquecer prospects";
    return Response.json({ error: message }, { status: 500 });
  }
}
