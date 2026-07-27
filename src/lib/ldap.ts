import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  Client,
  escapeFilter,
  InvalidCredentialsError,
  type Entry,
} from "ldapts";

export type AdUser = {
  username: string;
  name: string;
  email: string | null;
};

export type LdapAuthFailureReason =
  | "invalid_credentials"
  | "not_in_group"
  | "unavailable";

export type LdapAuthResult =
  | { ok: true; user: AdUser }
  | { ok: false; reason: LdapAuthFailureReason; detail?: string };

const LDAP_MATCHING_RULE_IN_CHAIN = "1.2.840.113556.1.4.1941";

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}`);
  }
  return value;
}

function ldapUrls(): string[] {
  return requiredEnv("LDAP_URL")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);
}

function netbiosDomain(dnsDomain: string): string {
  const configured = process.env.LDAP_NETBIOS?.trim();
  if (configured) return configured;
  return (dnsDomain.split(".")[0] ?? dnsDomain).toUpperCase();
}

function loadTlsOptions(): {
  ca?: Buffer[];
  rejectUnauthorized: boolean;
  minVersion: "TLSv1.2";
} {
  const insecure = process.env.LDAP_TLS_INSECURE === "true";
  const caFile = process.env.LDAP_TLS_CA_FILE?.trim();
  const resolved = caFile ? resolve(caFile) : null;

  if (resolved && existsSync(resolved)) {
    return {
      ca: [readFileSync(resolved)],
      rejectUnauthorized: !insecure,
      minVersion: "TLSv1.2",
    };
  }

  if (caFile) {
    console.warn(`[ldap] No se encontró el certificado en ${resolved}`);
  }

  return {
    rejectUnauthorized: !insecure,
    minVersion: "TLSv1.2",
  };
}

function firstAttr(entry: Entry, name: string): string | undefined {
  const value = entry[name];
  if (value == null) return undefined;
  if (Array.isArray(value)) {
    const first = value[0];
    if (first == null) return undefined;
    return Buffer.isBuffer(first) ? first.toString("utf8") : String(first);
  }
  return Buffer.isBuffer(value) ? value.toString("utf8") : String(value);
}

function allAttrs(entry: Entry, name: string): string[] {
  const value = entry[name];
  if (value == null) return [];
  const list = Array.isArray(value) ? value : [value];
  return list.map((item) =>
    Buffer.isBuffer(item) ? item.toString("utf8") : String(item),
  );
}

function entryToAdUser(entry: Entry, fallbackUsername: string): AdUser {
  const sam = firstAttr(entry, "sAMAccountName") ?? fallbackUsername;
  const name =
    firstAttr(entry, "displayName") || firstAttr(entry, "cn") || sam;
  const email =
    firstAttr(entry, "mail") || firstAttr(entry, "userPrincipalName") || null;

  return {
    username: sam.toLowerCase(),
    name,
    email,
  };
}

export function normalizeAdUsername(raw: string): string {
  let username = raw.trim();
  if (username.includes("\\")) {
    username = username.split("\\").pop() ?? username;
  }
  if (username.includes("@")) {
    username = username.split("@")[0] ?? username;
  }
  return username.toLowerCase();
}

export function isLdapConfigured(): boolean {
  return Boolean(process.env.LDAP_URL?.trim());
}

function isInvalidCredentialsError(error: unknown): boolean {
  if (error instanceof InvalidCredentialsError) return true;
  const message = error instanceof Error ? error.message : String(error);
  return /invalid credentials|data 52e|data 532|data 533|data 775|data 49/i.test(
    message,
  );
}

async function resolveGroupDn(
  client: Client,
  baseDn: string,
  groupName: string,
  configuredDn?: string,
): Promise<string | null> {
  if (configuredDn) return configuredDn;

  const { searchEntries } = await client.search(baseDn, {
    scope: "sub",
    filter: escapeFilter`(&(objectClass=group)(cn=${groupName}))`,
    attributes: ["dn", "cn"],
    sizeLimit: 5,
  });

  return searchEntries[0]?.dn ?? null;
}

async function isMemberOfGroup(
  client: Client,
  baseDn: string,
  userDn: string,
  groupDn: string,
  groupName: string,
  memberOf: string[],
): Promise<boolean> {
  if (
    memberOf.some((dn) => dn.toLowerCase() === groupDn.toLowerCase()) ||
    memberOf.some((dn) =>
      dn.toLowerCase().startsWith(`cn=${groupName.toLowerCase()},`),
    )
  ) {
    return true;
  }

  // Membresía anidada: ¿el grupo contiene al usuario (directa o indirecta)?
  try {
    const { searchEntries } = await client.search(groupDn, {
      scope: "base",
      filter: escapeFilter`(member:${LDAP_MATCHING_RULE_IN_CHAIN}:=${userDn})`,
      attributes: ["dn"],
      sizeLimit: 1,
    });
    if (searchEntries.length > 0) return true;
  } catch (error) {
    console.warn("[ldap] Falló chequeo member IN_CHAIN sobre el grupo:", error);
  }

  // Alternativa: filtro sobre el usuario
  try {
    const { searchEntries } = await client.search(baseDn, {
      scope: "sub",
      filter: escapeFilter`(&(distinguishedName=${userDn})(memberOf:${LDAP_MATCHING_RULE_IN_CHAIN}:=${groupDn}))`,
      attributes: ["dn"],
      sizeLimit: 1,
    });
    if (searchEntries.length > 0) return true;
  } catch (error) {
    console.warn("[ldap] Falló chequeo memberOf IN_CHAIN sobre el usuario:", error);
  }

  return false;
}

async function bindWithFallbacks(
  client: Client,
  username: string,
  password: string,
  domain: string,
): Promise<void> {
  const netbios = netbiosDomain(domain);
  const candidates = [
    `${username}@${domain}`,
    `${netbios}\\${username}`,
  ];

  let lastError: unknown;
  for (const dn of candidates) {
    try {
      await client.bind(dn, password);
      return;
    } catch (error) {
      lastError = error;
      if (!isInvalidCredentialsError(error)) throw error;
    }
  }
  throw lastError;
}

async function authenticateAgainstUrl(
  url: string,
  username: string,
  password: string,
): Promise<LdapAuthResult> {
  const baseDn = requiredEnv("LDAP_BASE_DN");
  const domain = requiredEnv("LDAP_DOMAIN");
  const groupName = process.env.LDAP_GROUP?.trim() || "GG_Sistemas";
  const configuredGroupDn = process.env.LDAP_GROUP_DN?.trim();

  const client = new Client({
    url,
    timeout: 15_000,
    connectTimeout: 10_000,
    tlsOptions: loadTlsOptions(),
  });

  try {
    await bindWithFallbacks(client, username, password, domain);

    const { searchEntries: users } = await client.search(baseDn, {
      scope: "sub",
      filter: escapeFilter`(&(objectCategory=person)(objectClass=user)(sAMAccountName=${username}))`,
      attributes: [
        "dn",
        "sAMAccountName",
        "displayName",
        "cn",
        "mail",
        "userPrincipalName",
        "memberOf",
      ],
      sizeLimit: 1,
    });

    const entry = users[0];
    if (!entry) {
      console.error(`[ldap] Bind OK pero no se encontró sAMAccountName=${username}`);
      return { ok: false, reason: "invalid_credentials" };
    }

    const groupDn = await resolveGroupDn(
      client,
      baseDn,
      groupName,
      configuredGroupDn,
    );
    if (!groupDn) {
      console.error(`[ldap] No se encontró el grupo ${groupName}`);
      return {
        ok: false,
        reason: "unavailable",
        detail: `No se encontró el grupo ${groupName}`,
      };
    }

    const memberOf = allAttrs(entry, "memberOf");
    const allowed = await isMemberOfGroup(
      client,
      baseDn,
      entry.dn,
      groupDn,
      groupName,
      memberOf,
    );

    if (!allowed) {
      console.warn(
        `[ldap] Usuario ${username} autenticado pero fuera de ${groupName} (${groupDn})`,
      );
      return { ok: false, reason: "not_in_group" };
    }

    return { ok: true, user: entryToAdUser(entry, username) };
  } catch (error) {
    if (isInvalidCredentialsError(error)) {
      return { ok: false, reason: "invalid_credentials" };
    }
    const detail = error instanceof Error ? error.message : String(error);
    console.error(`[ldap] Error contra ${url}:`, detail);
    return { ok: false, reason: "unavailable", detail };
  } finally {
    try {
      await client.unbind();
    } catch {
      // ignore
    }
  }
}

/** Autentica contra AD y exige membresía en GG_Sistemas (o LDAP_GROUP). */
export async function authenticateWithAd(
  rawUsername: string,
  password: string,
): Promise<LdapAuthResult> {
  const username = normalizeAdUsername(rawUsername);
  if (!username || !password) {
    return { ok: false, reason: "invalid_credentials" };
  }

  const urls = ldapUrls();
  let lastUnavailable: LdapAuthResult | null = null;

  for (const url of urls) {
    const result = await authenticateAgainstUrl(url, username, password);
    if (result.ok) return result;
    if (result.reason === "invalid_credentials" || result.reason === "not_in_group") {
      return result;
    }
    lastUnavailable = result;
  }

  return (
    lastUnavailable ?? {
      ok: false,
      reason: "unavailable",
      detail: "No hay controladores LDAP configurados",
    }
  );
}
