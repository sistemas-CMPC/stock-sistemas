export async function register() {
  // Solo en Node (no Edge). En Vercel las PASS_* suelen estar en Runtime.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  try {
    const { syncOperatorPasswordsFromEnv } = await import(
      "@/lib/sync-passwords"
    );
    const updated = await syncOperatorPasswordsFromEnv();
    if (updated.length) {
      console.log(
        `[sync-passwords] claves actualizadas: ${updated.join(", ")}`,
      );
    } else {
      console.warn(
        "[sync-passwords] no hay PASS_* / ADMIN_PASSWORD en el entorno",
      );
    }
  } catch (error) {
    console.error("[sync-passwords] falló:", error);
  }
}
