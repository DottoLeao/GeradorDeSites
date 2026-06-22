import { Suspense } from "react";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-slate-500">Carregando...</p>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
