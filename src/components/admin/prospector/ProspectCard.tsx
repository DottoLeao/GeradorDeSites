"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button, Input, Label, Select, Badge, Card } from "@/components/ui";
import type { Prospect, ProspectTier } from "@/lib/types/prospect";
import { isGoogleProspect } from "@/lib/places-provider";
import { getGoogleMapsUrl } from "@/lib/prospect-maps-url";
import {
  formatProspectCategory,
  formatTodayHours,
  formatDistanceMeters,
  formatBusinessStatus,
  haversineDistance,
} from "@/lib/prospect-labels";

interface CreateResult {
  siteId: string;
  slug: string;
  siteUrl: string;
  magicLink?: string;
}

const TIER_LABELS: Record<ProspectTier, string> = {
  hot: "Quente",
  warm: "Morno",
  cold: "Frio",
};

const TIER_BADGE_VARIANT: Record<
  ProspectTier,
  "error" | "warning" | "default"
> = {
  hot: "error",
  warm: "warning",
  cold: "default",
};

interface ProspectCardProps {
  prospect: Prospect;
  searchCenter?: { lat: number; lng: number } | null;
  isSelected?: boolean;
  onSelect?: () => void;
}

export function ProspectCard({
  prospect,
  searchCenter,
  isSelected,
  onSelect,
}: ProspectCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [clientEmail, setClientEmail] = useState("");
  const [templateId, setTemplateId] = useState("universal");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CreateResult | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const body = isGoogleProspect(prospect)
        ? {
            mapsUrl: getGoogleMapsUrl(prospect),
            templateId,
            clientEmail,
          }
        : {
            mode: "prospect" as const,
            prospect,
            templateId,
            clientEmail,
          };

      const response = await fetch("/api/sites/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error ?? "Erro ao criar site");
        return;
      }

      setResult(data);
      toast.success(`Site criado para ${prospect.name}!`);
      setClientEmail("");
    } catch {
      toast.error("Erro de conexão");
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  }

  const category = formatProspectCategory(
    prospect.types,
    prospect.primaryTypeLabel
  );
  const todayHours = formatTodayHours(prospect.openingHours);
  const businessStatusLabel = formatBusinessStatus(prospect.businessStatus);

  const locationParts: string[] = [];
  if (prospect.city) {
    locationParts.push(
      prospect.state ? `${prospect.city}, ${prospect.state}` : prospect.city
    );
  }
  if (searchCenter) {
    const distance = haversineDistance(
      searchCenter.lat,
      searchCenter.lng,
      prospect.lat,
      prospect.lng
    );
    locationParts.push(formatDistanceMeters(distance));
  }
  const locationLine =
    locationParts.length > 0 ? locationParts.join(" · ") : null;

  return (
    <div
      className={onSelect ? "cursor-pointer" : undefined}
      onClick={onSelect}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={
        onSelect
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect();
              }
            }
          : undefined
      }
    >
      <Card
        className={`p-4 transition-shadow ${isSelected ? "ring-2 ring-blue-500" : ""}`}
      >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-slate-900">{prospect.name}</h3>
            <Badge variant={TIER_BADGE_VARIANT[prospect.tier]}>
              {TIER_LABELS[prospect.tier]} · {prospect.heatScore}
            </Badge>
            {!prospect.website && (
              <Badge variant="error">Sem site</Badge>
            )}
          </div>

          {(category || prospect.openNow != null || businessStatusLabel) && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {category && <Badge variant="default">{category}</Badge>}
              {prospect.openNow === true && (
                <Badge variant="success">Aberto agora</Badge>
              )}
              {prospect.openNow === false && (
                <Badge variant="error">Fechado</Badge>
              )}
              {businessStatusLabel && (
                <Badge variant="warning">{businessStatusLabel}</Badge>
              )}
            </div>
          )}

          {prospect.address && (
            <p className="mt-1 text-sm text-slate-600 line-clamp-2">
              {prospect.address}
            </p>
          )}
          {locationLine && (
            <p className="mt-0.5 text-xs text-slate-500">{locationLine}</p>
          )}

          <div className="mt-2 space-y-1 text-xs text-slate-500">
            <p>
              {prospect.rating != null ? (
                <>
                  ★ {prospect.rating.toFixed(1)}
                  {prospect.reviewCount != null &&
                    ` (${prospect.reviewCount} avaliações)`}
                </>
              ) : (
                <span className="text-slate-400">Sem avaliações no Google</span>
              )}
            </p>
            {prospect.phone ? (
              <p>
                <a
                  href={`tel:${prospect.phone.replace(/\s/g, "")}`}
                  className="text-blue-600 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {prospect.phone}
                </a>
              </p>
            ) : (
              <p className="text-slate-400">Telefone não informado</p>
            )}
            {todayHours && <p>🕐 Hoje: {todayHours}</p>}
            {prospect.website && (
              <p>
                <a
                  href={prospect.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  Site existente
                </a>
              </p>
            )}
          </div>
        </div>
        <a
          href={getGoogleMapsUrl(prospect)}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-xs text-blue-600 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          Maps
        </a>
      </div>

      {result ? (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3">
          <p className="text-sm font-medium text-green-800">Site criado!</p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <a
              href={result.siteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate text-sm text-blue-600 hover:underline"
            >
              {result.siteUrl}
            </a>
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyToClipboard(result.siteUrl, "Link do site")}
            >
              Copiar
            </Button>
          </div>
          {result.magicLink && (
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-sm text-green-700">Magic Link gerado</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  copyToClipboard(result.magicLink!, "Magic Link")
                }
              >
                Copiar Acesso
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-4">
          {!expanded ? (
            <Button
              size="sm"
              className="w-full"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(true);
              }}
            >
              Criar site
            </Button>
          ) : (
            <form
              onSubmit={handleCreate}
              className="space-y-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div>
                <Label htmlFor={`template-${prospect.placeId}`}>Template</Label>
                <Select
                  id={`template-${prospect.placeId}`}
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                  className="mt-1"
                >
                  <option value="universal">Universal</option>
                  <option value="restaurant">Restaurante</option>
                  <option value="clinic">Clínica</option>
                </Select>
              </div>
              <div>
                <Label htmlFor={`email-${prospect.placeId}`}>
                  Email do Cliente
                </Label>
                <Input
                  id={`email-${prospect.placeId}`}
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="cliente@email.com"
                  required
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setExpanded(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="flex-1"
                  disabled={loading}
                >
                  {loading ? "Criando..." : "Confirmar"}
                </Button>
              </div>
            </form>
          )}
        </div>
      )}
      </Card>
    </div>
  );
}
