"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button, Input, Label, Select, Card } from "@/components/ui";
import { ManualSiteForm } from "./ManualSiteForm";

interface CreateResult {
  siteId: string;
  slug: string;
  siteUrl: string;
  magicLink?: string;
}

export function CreateSiteForm() {
  const [mapsUrl, setMapsUrl] = useState("");
  const [templateId, setTemplateId] = useState("universal");
  const [clientEmail, setClientEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const [fallbackError, setFallbackError] = useState("");
  const [result, setResult] = useState<CreateResult | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setFallbackError("");
    setResult(null);

    try {
      const response = await fetch("/api/sites/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mapsUrl, templateId, clientEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        setFallbackError(data.error ?? "Erro ao criar site");
        setShowFallback(true);
        toast.error("Falha na extração — use o formulário manual");
        return;
      }

      setResult(data);
      toast.success("Site criado com sucesso!");
      setMapsUrl("");
      setClientEmail("");
    } catch {
      setFallbackError("Erro de conexão. Tente novamente ou use o formulário manual.");
      setShowFallback(true);
      toast.error("Erro de conexão");
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  }

  if (showFallback) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-800">
            Extração automática falhou
          </p>
          <p className="mt-1 text-sm text-amber-700">{fallbackError}</p>
        </div>
        <ManualSiteForm
          templateId={templateId}
          onSuccess={(data) => {
            setResult(data);
            setShowFallback(false);
          }}
          onCancel={() => setShowFallback(false)}
        />
      </div>
    );
  }

  return (
    <Card>
      <form onSubmit={handleCreate} className="space-y-4">
        <div>
          <Label htmlFor="template">Template</Label>
          <Select
            id="template"
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
          <Label htmlFor="mapsUrl">Link do Google Maps</Label>
          <Input
            id="mapsUrl"
            type="url"
            value={mapsUrl}
            onChange={(e) => setMapsUrl(e.target.value)}
            placeholder="https://maps.google.com/..."
            required
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="clientEmail">Email do Cliente</Label>
          <Input
            id="clientEmail"
            type="email"
            value={clientEmail}
            onChange={(e) => setClientEmail(e.target.value)}
            placeholder="cliente@email.com"
            required
            className="mt-1"
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Criando site..." : "Criar Site"}
        </Button>
      </form>

      {result && (
        <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="font-medium text-green-800">Site criado!</p>
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <a
                href={result.siteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline truncate"
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
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-green-700 truncate">
                  Magic Link gerado
                </span>
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
        </div>
      )}
    </Card>
  );
}
