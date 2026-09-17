import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Suspense
        fallback={
          <div className="card w-full max-w-md text-sm text-muted">Cargando…</div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
