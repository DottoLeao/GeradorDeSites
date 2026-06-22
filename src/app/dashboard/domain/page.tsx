import Link from "next/link";
import { Card, Input, Label, Button } from "@/components/ui";

export default function DomainPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <h1 className="text-lg font-bold">Meu Domínio</h1>
          <Link href="/dashboard" className="text-sm text-blue-600">
            ← Voltar
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-8 sm:px-6">
        <Card className="space-y-4">
          <div>
            <Label>Seu domínio</Label>
            <Input placeholder="meunegocio.com.br" className="mt-1" disabled />
          </div>

          <div className="rounded-lg bg-slate-50 p-4">
            <h3 className="font-semibold">Instruções DNS</h3>
            <p className="mt-2 text-sm text-slate-600">
              Após comprar seu domínio, configure os registros DNS:
            </p>
            <div className="mt-4 space-y-3 font-mono text-sm">
              <div className="flex items-center justify-between rounded border bg-white p-3">
                <div>
                  <span className="text-slate-500">Tipo:</span> A<br />
                  <span className="text-slate-500">Nome:</span> @<br />
                  <span className="text-slate-500">Valor:</span> 76.76.21.21
                </div>
                <Button size="sm" variant="outline" disabled>
                  Copiar
                </Button>
              </div>
              <div className="flex items-center justify-between rounded border bg-white p-3">
                <div>
                  <span className="text-slate-500">Tipo:</span> CNAME<br />
                  <span className="text-slate-500">Nome:</span> www<br />
                  <span className="text-slate-500">Valor:</span> cname.vercel-dns.com
                </div>
                <Button size="sm" variant="outline" disabled>
                  Copiar
                </Button>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-400">
            Integração com Vercel Domains API — Fase 4
          </p>
        </Card>
      </main>
    </div>
  );
}
