import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

/**
 * Devuelve el usuario de la DB (id real).
 * Si el JWT quedó con un id viejo (p.ej. tras restaurar Neon), intenta
 * resolver por email/username; si no, fuerza re-login.
 */
export async function requireUser() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const sessionId = session.user.id?.trim();
  const sessionEmail = session.user.email?.trim() || null;
  const sessionName = session.user.name?.trim() || null;

  if (sessionId) {
    const byId = await prisma.user.findUnique({
      where: { id: sessionId },
      select: { id: true, name: true, email: true, username: true },
    });
    if (byId) {
      return {
        id: byId.id,
        name: byId.name,
        email: byId.email ?? byId.username,
      };
    }
  }

  if (sessionEmail) {
    const byLogin = await prisma.user.findFirst({
      where: {
        OR: [{ email: sessionEmail }, { username: sessionEmail }],
      },
      select: { id: true, name: true, email: true, username: true },
    });
    if (byLogin) {
      return {
        id: byLogin.id,
        name: byLogin.name,
        email: byLogin.email ?? byLogin.username,
      };
    }
  }

  // Sesión huérfana: el id del JWT no existe en User
  console.error("[requireUser] Sesión con userId inexistente en DB", {
    sessionId,
    sessionEmail,
    sessionName,
  });
  redirect("/login?error=session");
}
