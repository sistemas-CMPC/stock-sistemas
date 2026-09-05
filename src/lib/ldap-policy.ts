import { readFileSync } from "node:fs";
import { isIP } from "node:net";
import { resolve } from "node:path";

export class LdapPolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LdapPolicyError";
  }
}

const TRUTHY = /^(true|1|yes|on)$/i;

export function isTruthyEnv(value: string | undefined): boolean {
  return TRUTHY.test(value?.trim() ?? "");
}

export function ldapCaFilePath(): string {
  const caFile = process.env.LDAP_TLS_CA_FILE?.trim();
  if (!caFile) {
    throw new LdapPolicyError(
      "Falta LDAP_TLS_CA_FILE. Es obligatorio para validar los certificados de los DC.",
    );
  }
  return resolve(caFile);
}

let cachedCa: Buffer | undefined;

export function readMandatoryLdapCa(): Buffer {
  if (cachedCa) return cachedCa;
  const resolved = ldapCaFilePath();
  try {
    cachedCa = readFileSync(resolved);
  } catch {
    throw new LdapPolicyError(
      `No se pudo leer el PEM de LDAPS en ${resolved}. Verificá LDAP_TLS_CA_FILE y que el archivo exista y sea legible.`,
    );
  }
  return cachedCa;
}

export function parseLdapUrlList(raw: string): string[] {
  return raw
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);
}

export function validateLdapsUrl(url: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new LdapPolicyError(
      `URL LDAP inválida: ${url}. Debe ser ldaps://<FQDN>:636`,
    );
  }

  if (parsed.protocol !== "ldaps:") {
    throw new LdapPolicyError(
      `URL LDAP insegura: ${url}. Solo se permite ldaps:// (recibido: ${parsed.protocol}//).`,
    );
  }

  const port = parsed.port || "636";
  if (port !== "636") {
    throw new LdapPolicyError(
      `URL LDAP con puerto no permitido: ${url}. LDAPS debe usar el puerto 636, no ${port}.`,
    );
  }

  const host = parsed.hostname.replace(/\.$/, "");
  if (!host) {
    throw new LdapPolicyError(
      `URL LDAP sin host: ${url}. Debe incluir el FQDN del DC.`,
    );
  }
  if (isIP(host) !== 0) {
    throw new LdapPolicyError(
      `URL LDAP usa IP en lugar de FQDN: ${url}. Usá el FQDN del DC (p. ej. SRV-DC01.cmpc.local), no ${host}.`,
    );
  }
  if (!host.includes(".")) {
    throw new LdapPolicyError(
      `URL LDAP sin FQDN: ${url}. El host "${host}" no es un FQDN.`,
    );
  }
  if (parsed.username || parsed.password) {
    throw new LdapPolicyError(
      `URL LDAP no debe incluir credenciales: ${url}.`,
    );
  }
  if (parsed.pathname && parsed.pathname !== "/") {
    throw new LdapPolicyError(
      `URL LDAP no debe incluir path: ${url}.`,
    );
  }

  return parsed;
}

function walkErrorChain(error: unknown): unknown[] {
  const out: unknown[] = [];
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (current && !seen.has(current)) {
    seen.add(current);
    out.push(current);
    if (current instanceof Error && current.cause) {
      current = current.cause;
      continue;
    }
    break;
  }
  return out;
}

function errorBlob(error: unknown): string {
  if (!error || typeof error !== "object") return String(error ?? "");
  const rec = error as { code?: string; reason?: string; message?: string };
  return `${rec.code ?? ""} ${rec.reason ?? ""} ${rec.message ?? ""}`;
}

export function isCertExpiredError(error: unknown): boolean {
  return walkErrorChain(error).some((err) => {
    const blob = errorBlob(err).toLowerCase();
    const rec = err && typeof err === "object" ? (err as { code?: string }) : {};
    return (
      rec.code === "CERT_HAS_EXPIRED" ||
      blob.includes("certificate has expired") ||
      blob.includes("cert has expired")
    );
  });
}

export function describeLdapTlsFailure(error: unknown): string {
  const pem = process.env.LDAP_TLS_CA_FILE
    ? ldapCaFilePath()
    : "(LDAP_TLS_CA_FILE no definido)";

  if (isCertExpiredError(error)) {
    return `El certificado del DC venció. Reemplazá el archivo PEM ${pem} con los certificados actuales de SRV-DC01.cmpc.local y SRV-DC02.cmpc.local.`;
  }

  const message = error instanceof Error ? error.message : String(error);
  if (
    /unable to verify|self-signed|unable to get local issuer|ERR_TLS|UNABLE_TO_VERIFY|DEPTH_ZERO_SELF_SIGNED/i.test(
      `${errorBlob(error)} ${message}`,
    )
  ) {
    return `Falló el handshake TLS contra el DC. Revisá que el PEM ${pem} corresponda a los certificados actuales de los DC.`;
  }

  return message;
}

export function enforceSecureLdapConfig(): string[] {
  if (isTruthyEnv(process.env.LDAP_TLS_INSECURE)) {
    throw new LdapPolicyError(
      "LDAP_TLS_INSECURE está activo. Esta aplicación no permite relajar la validación TLS. Eliminá la variable del entorno.",
    );
  }
  if (isTruthyEnv(process.env.LDAP_START_TLS)) {
    throw new LdapPolicyError(
      "LDAP_START_TLS está activo. StartTLS no está permitido; usá solo ldaps:// en el puerto 636. Eliminá la variable del entorno.",
    );
  }
  if (
    process.env.NODE_ENV === "production" &&
    isTruthyEnv(process.env.AUTH_ALLOW_LOCAL)
  ) {
    throw new LdapPolicyError(
      "AUTH_ALLOW_LOCAL no está permitido en producción. El login debe ir contra Active Directory.",
    );
  }

  const ldapUrl = process.env.LDAP_URL?.trim();
  if (!ldapUrl) {
    if (process.env.NODE_ENV === "production") {
      throw new LdapPolicyError(
        "Falta LDAP_URL. En producción es obligatorio ldaps://<FQDN>:636.",
      );
    }
    return [];
  }

  const urls = parseLdapUrlList(ldapUrl);
  if (urls.length === 0) {
    throw new LdapPolicyError(
      "LDAP_URL no contiene ninguna URL. Debe ser ldaps://<FQDN>:636[,ldaps://...]",
    );
  }
  for (const url of urls) {
    validateLdapsUrl(url);
  }

  readMandatoryLdapCa();
  return urls;
}

/** Valida la política LDAPS y aborta el proceso si no se cumple. */
export function assertSecureLdapConfig(): string[] {
  try {
    return enforceSecureLdapConfig();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  }
}
