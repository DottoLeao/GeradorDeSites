import Link from "next/link";
import { Card, Button } from "@/components/ui";

export default function SubscriptionPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <h1 className="text-lg font-bold">Assinatura</h1>
          <Link href="/dashboard" className="text-sm text-blue-600">
            ← Voltar
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-8 sm:px-6">
        <Card className="text-center">
          <h2 className="text-2xl font-bold">Plano Mensal</h2>
          <p className="mt-2 text-4xl font-bold text-blue-600">
            $100<span className="text-lg text-slate-500">/mês</span>
          </p>
          <ul className="mt-6 space-y-2 text-left text-sm text-slate-600">
            <li>✓ Site personalizado e responsivo</li>
            <li>✓ Dashboard de edição completo</li>
            <li>✓ SEO automático</li>
            <li>✓ Suporte prioritário</li>
          </ul>
          <Button className="mt-8 w-full" disabled>
            Integração Stripe — Fase 3
          </Button>
          <p className="mt-2 text-xs text-slate-400">
            O pagamento via Stripe será habilitado na próxima fase
          </p>
        </Card>
      </main>
    </div>
  );
}
