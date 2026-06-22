"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Button,
  Input,
  Label,
  Textarea,
  Card,
} from "@/components/ui";
import { ImageUploader } from "./ImageUploader";
import { getSiteUrl } from "@/lib/utils";

interface SiteEditorProps {
  siteId: string;
  siteSlug: string;
  templateId: string;
  initialContent: Record<string, unknown>;
}

export function SiteEditor({
  siteId,
  siteSlug,
  templateId,
  initialContent,
}: SiteEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"content" | "design" | "contact">(
    "content"
  );

  function updateField(path: string, value: unknown) {
    setContent((prev) => {
      const keys = path.split(".");
      const updated = { ...prev };
      let current: Record<string, unknown> = updated;

      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...(current[keys[i]] as Record<string, unknown>) };
        current = current[keys[i]] as Record<string, unknown>;
      }

      current[keys[keys.length - 1]] = value;
      return updated;
    });
  }

  async function handleSave() {
    setSaving(true);

    try {
      const response = await fetch("/api/sites/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, content }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error ?? "Erro ao salvar");
        return;
      }

      toast.success("Alterações publicadas com sucesso!");
    } catch {
      toast.error("Erro de conexão ao salvar");
    } finally {
      setSaving(false);
    }
  }

  const theme = content.theme as Record<string, string> | undefined;
  const contact = content.contact as Record<string, string> | undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Editar Site</h2>
          <a
            href={getSiteUrl(siteSlug)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline"
          >
            Ver site ao vivo →
          </a>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Publicando..." : "Publicar Alterações"}
        </Button>
      </div>

      <div className="flex gap-2 overflow-x-auto border-b pb-2">
        {(["content", "design", "contact"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab
                ? "bg-blue-100 text-blue-700"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {tab === "content"
              ? "Conteúdo"
              : tab === "design"
                ? "Design"
                : "Contato"}
          </button>
        ))}
      </div>

      {activeTab === "content" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="space-y-4">
            <h3 className="font-semibold">Textos Principais</h3>
            <div>
              <Label>Nome do Negócio</Label>
              <Input
                value={(content.businessName as string) ?? ""}
                onChange={(e) => updateField("businessName", e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Tagline</Label>
              <Input
                value={(content.tagline as string) ?? ""}
                onChange={(e) => updateField("tagline", e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={(content.description as string) ?? ""}
                onChange={(e) => updateField("description", e.target.value)}
                className="mt-1"
                rows={4}
              />
            </div>
            <div>
              <Label>Sobre — Título</Label>
              <Input
                value={((content.about as Record<string, string>)?.title) ?? ""}
                onChange={(e) => updateField("about.title", e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Sobre — Conteúdo</Label>
              <Textarea
                value={
                  ((content.about as Record<string, string>)?.content) ?? ""
                }
                onChange={(e) => updateField("about.content", e.target.value)}
                className="mt-1"
                rows={4}
              />
            </div>
          </Card>

          <Card className="space-y-4">
            <h3 className="font-semibold">Imagens</h3>
            <ImageUploader
              siteId={siteId}
              label="Imagem Hero"
              currentUrl={(content.heroImage as string) ?? ""}
              onUpload={(url) => updateField("heroImage", url)}
            />
            <ImageUploader
              siteId={siteId}
              label="Imagem Sobre"
              currentUrl={
                ((content.about as Record<string, string>)?.image) ?? ""
              }
              onUpload={(url) => updateField("about.image", url)}
            />
          </Card>
        </div>
      )}

      {activeTab === "design" && (
        <Card className="space-y-4">
          <h3 className="font-semibold">Cores do Site</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            {(["primaryColor", "secondaryColor", "accentColor"] as const).map(
              (colorKey) => (
                <div key={colorKey}>
                  <Label>
                    {colorKey === "primaryColor"
                      ? "Cor Principal"
                      : colorKey === "secondaryColor"
                        ? "Cor Secundária"
                        : "Cor de Destaque"}
                  </Label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="color"
                      value={theme?.[colorKey] ?? "#1e40af"}
                      onChange={(e) =>
                        updateField(`theme.${colorKey}`, e.target.value)
                      }
                      className="h-10 w-10 cursor-pointer rounded border"
                    />
                    <Input
                      value={theme?.[colorKey] ?? ""}
                      onChange={(e) =>
                        updateField(`theme.${colorKey}`, e.target.value)
                      }
                    />
                  </div>
                </div>
              )
            )}
          </div>
        </Card>
      )}

      {activeTab === "contact" && (
        <Card className="space-y-4">
          <h3 className="font-semibold">Informações de Contato</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Telefone</Label>
              <Input
                value={contact?.phone ?? ""}
                onChange={(e) => updateField("contact.phone", e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={contact?.email ?? ""}
                onChange={(e) => updateField("contact.email", e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Endereço</Label>
              <Input
                value={contact?.address ?? ""}
                onChange={(e) => updateField("contact.address", e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Cidade</Label>
              <Input
                value={contact?.city ?? ""}
                onChange={(e) => updateField("contact.city", e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Estado</Label>
              <Input
                value={contact?.state ?? ""}
                onChange={(e) => updateField("contact.state", e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
