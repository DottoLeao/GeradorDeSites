export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CreateSiteForm } from "@/components/admin/CreateSiteForm";
import { RecentSitesList } from "@/components/admin/RecentSitesList";
import { ProspectorPanel } from "@/components/admin/prospector/ProspectorPanel";
import { getRecentSites } from "@/lib/services/sites";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  let recentSites: Awaited<ReturnType<typeof getRecentSites>> = [];
  try {
    recentSites = await getRecentSites();
  } catch {
    recentSites = [];
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <h1 className="text-xl font-bold text-slate-900">
            Gerador de Sites — Admin
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500">{user.email}</span>
            <form action="/api/auth/signout" method="post">
              <Link
                href="/login"
                className="text-sm text-slate-600 hover:text-slate-900"
              >
                Sair
              </Link>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-slate-900">
            Prospecção de Clientes
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Encontre estabelecimentos próximos que precisam de um site
          </p>
          <div className="mt-4">
            <ProspectorPanel />
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-2">
          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              Criar Novo Site
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Cole o link do Google Maps e escolha um template
            </p>
            <div className="mt-4">
              <CreateSiteForm />
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              Sites Criados Recentemente
            </h2>
            <div className="mt-4">
              <RecentSitesList sites={recentSites} />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
