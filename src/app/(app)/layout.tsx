import { AppNav } from "@/components/app-nav";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="min-h-screen">
      <AppNav userName={user.name ?? user.email ?? "Operador"} />
      <div className="lg:pl-60">
        <main className="mx-auto w-full max-w-6xl px-3 py-5 sm:px-4 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
