"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { Button, Input, Label, Card } from "@/components/ui";
import { ProspectCard } from "./ProspectCard";
import type { Prospect } from "@/lib/types/prospect";

const ProspectMap = dynamic(
  () => import("./ProspectMap").then((mod) => mod.ProspectMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[320px] items-center justify-center rounded-lg bg-slate-100 text-sm text-slate-500">
        Carregando mapa...
      </div>
    ),
  }
);

const DEFAULT_RADIUS_KM = 15;

type SearchPhase = "idle" | "searching" | "enriching" | "done";

function formatSeconds(ms: number): string {
  const seconds = Math.max(1, Math.round(ms / 1000));
  return `${seconds}s`;
}

function mergeProspectUpdate(
  prospects: Prospect[],
  updated: Prospect
): Prospect[] {
  return [...prospects]
    .map((p) => (p.placeId === updated.placeId ? updated : p))
    .sort((a, b) => b.heatScore - a.heatScore);
}

export function ProspectorPanel() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");
  const [showManualLocation, setShowManualLocation] = useState(false);
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [searchPhase, setSearchPhase] = useState<SearchPhase>("idle");
  const [enrichProgress, setEnrichProgress] = useState({ done: 0, total: 0 });
  const [enrichStartedAt, setEnrichStartedAt] = useState<number | null>(null);
  const [geoLoading, setGeoLoading] = useState(true);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const isSearching = searchPhase === "searching";
  const isEnriching = searchPhase === "enriching";
  const isBusy = isSearching || isEnriching;

  const enrichEtaMs =
    isEnriching &&
    enrichProgress.done > 0 &&
    enrichStartedAt !== null
      ? (Date.now() - enrichStartedAt) /
        enrichProgress.done *
        (enrichProgress.total - enrichProgress.done)
      : null;

  const enrichProspectsStream = useCallback(
    async (baseProspects: Prospect[], signal: AbortSignal) => {
      setSearchPhase("enriching");
      setEnrichProgress({ done: 0, total: 0 });
      setEnrichStartedAt(Date.now());

      try {
        const response = await fetch("/api/prospects/enrich", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prospects: baseProspects }),
          signal,
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          toast.error(data.error ?? "Erro ao verificar sites dos leads");
          setSearchPhase("done");
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          toast.error("Resposta inválida ao verificar sites");
          setSearchPhase("done");
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.trim()) continue;

            const event = JSON.parse(line) as {
              type: string;
              total?: number;
              done?: number;
              prospect?: Prospect;
              prospects?: Prospect[];
              error?: string;
            };

            if (event.type === "start" && event.total !== undefined) {
              setEnrichProgress({ done: 0, total: event.total });
            } else if (
              event.type === "progress" &&
              event.prospect &&
              event.done !== undefined &&
              event.total !== undefined
            ) {
              setEnrichProgress({ done: event.done, total: event.total });
              setProspects((prev) => mergeProspectUpdate(prev, event.prospect!));
            } else if (event.type === "complete" && event.prospects) {
              setProspects(event.prospects);
            } else if (event.type === "error") {
              toast.error(event.error ?? "Erro ao verificar sites dos leads");
            }
          }
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        toast.error("Erro de conexão ao verificar sites dos leads");
      } finally {
        if (!signal.aborted) {
          setSearchPhase("done");
          setEnrichStartedAt(null);
        }
      }
    },
    []
  );

  const searchProspects = useCallback(
    async (lat: number, lng: number, radius: number) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setSearchPhase("searching");
      setEnrichProgress({ done: 0, total: 0 });
      setEnrichStartedAt(null);

      try {
        const response = await fetch("/api/prospects/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lat,
            lng,
            radiusMeters: radius * 1000,
            enrich: false,
          }),
          signal: controller.signal,
        });

        const data = await response.json();

        if (!response.ok) {
          toast.error(data.error ?? "Erro ao buscar estabelecimentos");
          setProspects([]);
          setSearchPhase("idle");
          return;
        }

        const found: Prospect[] = data.prospects ?? [];
        setProspects(found);

        if (found.length === 0) {
          toast.info("Nenhum estabelecimento encontrado neste raio");
          setSearchPhase("done");
          return;
        }

        await enrichProspectsStream(found, controller.signal);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        toast.error("Erro de conexão ao buscar estabelecimentos");
        setProspects([]);
        setSearchPhase("idle");
      }
    },
    [enrichProspectsStream]
  );

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoLoading(false);
      setShowManualLocation(true);
      toast.error("Geolocalização não disponível. Informe lat/lng manualmente.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setGeoLoading(false);
      },
      () => {
        setGeoLoading(false);
        setShowManualLocation(true);
        toast.error(
          "Não foi possível obter sua localização. Informe lat/lng manualmente."
        );
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    if (!location) return;
    searchProspects(location.lat, location.lng, radiusKm);
  }, [location, searchProspects]);

  function handleSearchClick() {
    if (!location) return;
    searchProspects(location.lat, location.lng, radiusKm);
  }

  function handleManualLocationSubmit(e: React.FormEvent) {
    e.preventDefault();
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      toast.error("Latitude e longitude inválidas");
      return;
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      toast.error("Coordenadas fora do intervalo válido");
      return;
    }

    setLocation({ lat, lng });
    setShowManualLocation(false);
  }

  function handleSelectProspect(placeId: string) {
    setSelectedPlaceId(placeId);
    const el = cardRefs.current.get(placeId);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  const center: [number, number] | null = location
    ? [location.lat, location.lng]
    : null;

  const progressPercent =
    enrichProgress.total > 0
      ? Math.round((enrichProgress.done / enrichProgress.total) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-[200px] flex-1">
          <Label htmlFor="radius">Raio de busca: {radiusKm} km</Label>
          <input
            id="radius"
            type="range"
            min={1}
            max={50}
            step={1}
            value={radiusKm}
            onChange={(e) => setRadiusKm(Number(e.target.value))}
            className="mt-2 w-full accent-blue-600"
            disabled={!location || isBusy}
          />
        </div>

        {location && (
          <div className="text-sm text-slate-500">
            {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
          </div>
        )}

        <Button
          size="sm"
          onClick={handleSearchClick}
          disabled={!location || isBusy}
        >
          {isSearching
            ? "Buscando..."
            : isEnriching
              ? "Verificando sites..."
              : "Buscar estabelecimentos"}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowManualLocation((v) => !v)}
        >
          {showManualLocation ? "Ocultar coordenadas" : "Alterar localização"}
        </Button>
      </div>

      {isEnriching && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
            <span>
              Verificando sites dos leads… classificação pode mudar
            </span>
            <span className="tabular-nums text-slate-500">
              {enrichProgress.total > 0
                ? `${enrichProgress.done}/${enrichProgress.total}`
                : "…"}
              {enrichEtaMs !== null && enrichEtaMs > 0
                ? ` · ~${formatSeconds(enrichEtaMs)} restantes`
                : ""}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-blue-600 transition-[width] duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {showManualLocation && (
        <Card className="p-4">
          <form
            onSubmit={handleManualLocationSubmit}
            className="flex flex-wrap items-end gap-4"
          >
            <div>
              <Label htmlFor="manual-lat">Latitude</Label>
              <Input
                id="manual-lat"
                type="number"
                step="any"
                value={manualLat}
                onChange={(e) => setManualLat(e.target.value)}
                placeholder="-23.55052"
                className="mt-1 w-40"
              />
            </div>
            <div>
              <Label htmlFor="manual-lng">Longitude</Label>
              <Input
                id="manual-lng"
                type="number"
                step="any"
                value={manualLng}
                onChange={(e) => setManualLng(e.target.value)}
                placeholder="-46.63331"
                className="mt-1 w-40"
              />
            </div>
            <Button type="submit" size="sm">
              Usar coordenadas
            </Button>
          </form>
        </Card>
      )}

      {geoLoading ? (
        <div className="flex h-80 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm text-slate-500">
          Obtendo sua localização...
        </div>
      ) : !center ? (
        <div className="flex h-80 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm text-slate-500">
          Informe sua localização para iniciar a prospecção
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="relative h-[400px] overflow-hidden rounded-xl border border-slate-200">
            <ProspectMap
              center={center}
              radiusMeters={radiusKm * 1000}
              prospects={prospects}
              selectedPlaceId={selectedPlaceId}
              onSelectProspect={handleSelectProspect}
            />
            {isSearching && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/60 text-sm font-medium text-slate-700">
                Buscando estabelecimentos...
              </div>
            )}
            {isEnriching && !isSearching && (
              <div className="absolute inset-x-0 bottom-0 bg-white/80 px-4 py-2 text-center text-sm font-medium text-slate-700">
                Verificando sites…{" "}
                {enrichProgress.total > 0
                  ? `${enrichProgress.done}/${enrichProgress.total}`
                  : ""}
                {enrichEtaMs !== null && enrichEtaMs > 0
                  ? ` · ~${formatSeconds(enrichEtaMs)}`
                  : ""}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">
                Leads encontrados
              </h3>
              <span className="text-sm text-slate-500">
                {prospects.length} resultado{prospects.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="max-h-[400px] space-y-3 overflow-y-auto pr-1">
              {prospects.length === 0 && !isBusy ? (
                <p className="text-sm text-slate-500">
                  Nenhum estabelecimento no raio selecionado.
                </p>
              ) : (
                prospects.map((prospect) => (
                  <div
                    key={prospect.placeId}
                    ref={(el) => {
                      if (el) cardRefs.current.set(prospect.placeId, el);
                      else cardRefs.current.delete(prospect.placeId);
                    }}
                  >
                    <ProspectCard
                      prospect={prospect}
                      searchCenter={location}
                      isSelected={selectedPlaceId === prospect.placeId}
                      isVerifyingWebsite={
                        isEnriching &&
                        !prospect.website &&
                        !prospect.placeId.startsWith("osm:")
                      }
                      onSelect={() => setSelectedPlaceId(prospect.placeId)}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-red-500" />
          Quente — sem site, negócio ativo
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-orange-500" />
          Morno
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-slate-400" />
          Frio — já possui site
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-blue-600" />
          Sua localização
        </span>
      </div>
    </div>
  );
}
