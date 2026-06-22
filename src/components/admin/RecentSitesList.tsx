"use client";

import { toast } from "sonner";
import { Badge, Button, Card } from "@/components/ui";
import { getSiteUrl } from "@/lib/utils";

interface SiteRecord {
  id: string;
  slug: string;
  template_id: string;
  status: string;
  business_name: string;
  created_at: string;
  profiles?: { email: string; full_name: string | null } | { email: string; full_name: string | null }[] | null;
}

interface RecentSitesListProps {
  sites: SiteRecord[];
}

const statusVariant: Record<string, "success" | "warning" | "error" | "default"> = {
  active: "success",
  building: "warning",
  suspended: "error",
  error: "error",
};

const statusLabel: Record<string, string> = {
  active: "Ativo",
  building: "Criando",
  suspended: "Suspenso",
  error: "Erro",
};

function getProfileEmail(
  profiles: SiteRecord["profiles"]
): string {
  if (!profiles) return "Sem email";
  if (Array.isArray(profiles)) return profiles[0]?.email ?? "Sem email";
  return profiles.email;
}

export function RecentSitesList({ sites }: RecentSitesListProps) {
  if (sites.length === 0) {
    return (
      <Card>
        <p className="text-center text-sm text-slate-500">
          Nenhum site criado ainda
        </p>
      </Card>
    );
  }

  function copyLink(slug: string) {
    navigator.clipboard.writeText(getSiteUrl(slug));
    toast.success("Link copiado!");
  }

  return (
    <div className="space-y-3">
      {sites.map((site) => (
        <Card key={site.id} className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-slate-900 truncate">
                  {site.business_name}
                </h3>
                <Badge variant={statusVariant[site.status] ?? "default"}>
                  {statusLabel[site.status] ?? site.status}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {site.template_id} · {getProfileEmail(site.profiles)}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {new Date(site.created_at).toLocaleString("pt-BR")}
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyLink(site.slug)}
              >
                Copiar
              </Button>
              <a
                href={getSiteUrl(site.slug)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 items-center justify-center rounded-lg px-3 text-sm font-medium hover:bg-slate-100"
              >
                Abrir
              </a>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
