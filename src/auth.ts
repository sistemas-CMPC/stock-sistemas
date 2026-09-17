import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { z } from "zod";
import { authConfig } from "@/auth.config";
import {
  authenticateWithAd,
  isLdapConfigured,
  normalizeAdUsername,
} from "@/lib/ldap";
import { prisma } from "@/lib/prisma";

const credentialsSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

class AdSignInError extends CredentialsSignin {
  code: string;
  constructor(code: string) {
    super();
    this.code = code;
  }
}

function authMode(): "local" | "ldap" {
  const mode = process.env.AUTH_MODE?.trim()
    .replace(/^["']|["']$/g, "")
    .toLowerCase();
  if (mode === "local") return "local";
  if (mode === "ldap") return "ldap";
  // Por defecto: local si no hay LDAP; ldap si hay LDAP_URL
  return isLdapConfigured() ? "ldap" : "local";
}

async function authorizeWithLdap(username: string, password: string) {
  const result = await authenticateWithAd(username, password);
  if (!result.ok) {
    throw new AdSignInError(result.reason);
  }

  const adUser = result.user;

  try {
    const user = await prisma.user.upsert({
      where: { username: adUser.username },
      update: {
        name: adUser.name,
        email: adUser.email,
        passwordHash: null,
      },
      create: {
        username: adUser.username,
        name: adUser.name,
        email: adUser.email,
        passwordHash: null,
      },
    });

    return {
      id: user.id,
      email: user.email ?? user.username,
      name: user.name,
    };
  } catch (error) {
    console.error("[auth] Upsert usuario AD falló, reintento sin email:", error);
    const user = await prisma.user.upsert({
      where: { username: adUser.username },
      update: {
        name: adUser.name,
        passwordHash: null,
      },
      create: {
        username: adUser.username,
        name: adUser.name,
        email: null,
        passwordHash: null,
      },
    });

    return {
      id: user.id,
      email: user.email ?? user.username,
      name: user.name,
    };
  }
}

async function authorizeLocal(username: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { username },
  });
  if (!user?.passwordHash) return null;

  const valid = await compare(password, user.passwordHash);
  if (!valid) return null;

  return {
    id: user.id,
    email: user.email ?? user.username,
    name: user.name,
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        username: { label: "Usuario", type: "text" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const username = normalizeAdUsername(parsed.data.username);
        const { password } = parsed.data;
        const mode = authMode();

        if (mode === "local") {
          return authorizeLocal(username, password);
        }

        // Modo LDAP: opcionalmente permitir fallback local (AUTH_ALLOW_LOCAL=true)
        try {
          return await authorizeWithLdap(username, password);
        } catch (error) {
          if (process.env.AUTH_ALLOW_LOCAL === "true") {
            const local = await authorizeLocal(username, password);
            if (local) return local;
          }
          if (error instanceof AdSignInError) throw error;
          console.error("[auth] Error LDAP:", error);
          throw new AdSignInError("unavailable");
        }
      },
    }),
  ],
});
