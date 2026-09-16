"use server";

import { AuthError, CredentialsSignin } from "next-auth";
import { signIn } from "@/auth";

function messageForAuthError(error: AuthError): string {
  const code =
    error instanceof CredentialsSignin
      ? error.code
      : "code" in error
        ? String((error as { code?: string }).code ?? "")
        : "";

  switch (code) {
    case "not_in_group":
      return "Tu usuario no pertenece al grupo autorizado";
    case "unavailable":
      return "No se pudo validar el acceso. Revisá la configuración de autenticación.";
    case "invalid_credentials":
    case "credentials":
    default:
      return "Credenciales inválidas";
  }
}

export async function loginAction(
  _prev: { error?: string } | undefined,
  formData: FormData,
) {
  try {
    await signIn("credentials", {
      username: formData.get("username"),
      password: formData.get("password"),
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: messageForAuthError(error) };
    }
    throw error;
  }
}
