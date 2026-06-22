import { Card } from "@/components/ui";

interface PendingInvoiceProps {
  siteName: string;
}

export function PendingInvoice({ siteName }: PendingInvoiceProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-6">
      <Card className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
          <svg
            className="h-8 w-8 text-amber-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold">Fatura Pendente</h1>
        <p className="mt-4 text-slate-600">
          A assinatura do site <strong>{siteName}</strong> está inativa ou em
          atraso. Regularize o pagamento para continuar editando seu site.
        </p>
        <a
          href="/dashboard/subscription"
          className="mt-6 inline-flex h-10 w-full items-center justify-center rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700"
        >
          Regularizar Pagamento
        </a>
      </Card>
    </div>
  );
}
