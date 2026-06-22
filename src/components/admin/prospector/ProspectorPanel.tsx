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

export function ProspectorPanel() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");
  const [showManualLocation, setShowManualLocation] = useState(false);
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(true);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const searchProspects = useCallback(
    async (lat: number, lng: number, radius: number) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      try {
        const response = await fetch("/api/prospects/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lat,
            lng,
            radiusMeters: radius * 1000,
          }),
          signal: controller.signal,
        });

        const data = await response.json();

        if (!response.ok) {
          toast.error(data.error ?? "Erro ao buscar estabelecimentos");
          setProspects([]);
          return;
        }

        setProspects(data.prospects ?? []);
        if ((data.prospects ?? []).length === 0) {
          toast.info("Nenhum estabelecimento encontrado neste raio");
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        toast.error("Erro de conexão ao buscar estabelecimentos");
        setProspects([]);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    },
    []
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
            disabled={!location}
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
          disabled={!location || loading}
        >
          {loading ? "Buscando..." : "Buscar estabelecimentos"}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowManualLocation((v) => !v)}
        >
          {showManualLocation ? "Ocultar coordenadas" : "Alterar localização"}
        </Button>
      </div>

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
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/60 text-sm font-medium text-slate-700">
                Buscando estabelecimentos...
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
              {prospects.length === 0 && !loading ? (
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
