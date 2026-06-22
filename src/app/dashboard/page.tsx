export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getClientSite } from "@/lib/services/sites";
import { SiteEditor } from "@/components/dashboard/SiteEditor";
import { PendingInvoice } from "@/components/dashboard/PendingInvoice";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const data = await getClientSite(user.id);

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Nenhum site encontrado</h1>
          <p className="mt-2 text-slate-600">
            Entre em contato com o administrador para provisionar seu site.
          </p>
        </div>
      </div>
    );
  }

  const { site, content, subscription } = data;

  const isBlocked =
    site.status === "suspended" ||
    (subscription &&
      !["active", "trialing"].includes(subscription.status));

  if (isBlocked) {
    return <PendingInvoice siteName={site.business_name} />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-50 border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div>
            <h1 className="text-lg font-bold sm:text-xl">{site.business_name}</h1>
            <p className="text-xs text-slate-500 sm:text-sm">Dashboard</p>
          </div>
          <nav className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/dashboard"
              className="text-sm font-medium text-blue-600"
            >
              Editar
            </Link>
            <Link
              href="/dashboard/subscription"
              className="text-sm text-slate-600 hover:text-slate-900"
            >
              Assinatura
            </Link>
            <Link
              href="/dashboard/domain"
              className="hidden text-sm text-slate-600 hover:text-slate-900 sm:inline"
            >
              Domínio
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <SiteEditor
          siteId={site.id}
          siteSlug={site.slug}
          templateId={site.template_id}
          initialContent={content as Record<string, unknown>}
        />
      </main>
    </div>
  );
}
