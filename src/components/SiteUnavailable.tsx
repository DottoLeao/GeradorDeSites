export function SiteUnavailable() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-6">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-200">
          <svg
            className="h-10 w-10 text-slate-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Site Indisponível</h1>
        <p className="mt-4 text-slate-600">
          Este site está temporariamente fora do ar. Entre em contato com o
          proprietário para mais informações.
        </p>
      </div>
    </div>
  );
}
