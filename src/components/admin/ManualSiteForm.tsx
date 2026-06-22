"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button, Input, Label, Select, Textarea, Card } from "@/components/ui";

interface ManualSiteFormProps {
  templateId: string;
  onSuccess: (data: {
    siteId: string;
    slug: string;
    siteUrl: string;
    magicLink?: string;
  }) => void;
  onCancel: () => void;
}

export function ManualSiteForm({
  templateId: initialTemplate,
  onSuccess,
  onCancel,
}: ManualSiteFormProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    businessName: "",
    templateId: initialTemplate,
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    description: "",
  });

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/sites/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "manual", ...form }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error ?? "Erro ao criar site");
        return;
      }

      toast.success("Site criado manualmente com sucesso!");
      onSuccess(data);
    } catch {
      toast.error("Erro de conexão");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <h3 className="font-semibold">Criação Manual</h3>
      <p className="mt-1 text-sm text-slate-600">
        Preencha os dados básicos da loja
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <div>
          <Label>Nome do Negócio</Label>
          <Input
            value={form.businessName}
            onChange={(e) => updateField("businessName", e.target.value)}
            required
            className="mt-1"
          />
        </div>

        <div>
          <Label>Template</Label>
          <Select
            value={form.templateId}
            onChange={(e) => updateField("templateId", e.target.value)}
            className="mt-1"
          >
            <option value="universal">Universal</option>
            <option value="restaurant">Restaurante</option>
            <option value="clinic">Clínica</option>
          </Select>
        </div>

        <div>
          <Label>Email do Cliente</Label>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => updateField("email", e.target.value)}
            required
            className="mt-1"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Telefone</Label>
            <Input
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label>Estado</Label>
            <Input
              value={form.state}
              onChange={(e) => updateField("state", e.target.value)}
              required
              className="mt-1"
            />
          </div>
        </div>

        <div>
          <Label>Endereço</Label>
          <Input
            value={form.address}
            onChange={(e) => updateField("address", e.target.value)}
            required
            className="mt-1"
          />
        </div>

        <div>
          <Label>Cidade</Label>
          <Input
            value={form.city}
            onChange={(e) => updateField("city", e.target.value)}
            required
            className="mt-1"
          />
        </div>

        <div>
          <Label>Descrição (opcional)</Label>
          <Textarea
            value={form.description}
            onChange={(e) => updateField("description", e.target.value)}
            className="mt-1"
            rows={3}
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? "Criando..." : "Forçar Criação"}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Voltar
          </Button>
        </div>
      </form>
    </Card>
  );
}
