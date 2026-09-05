import {
  Client,
  escapeFilter,
  InvalidCredentialsError,
  type Entry,
} from "ldapts";
import {
  assertSecureLdapConfig,
  describeLdapTlsFailure,
  parseLdapUrlList,
  readMandatoryLdapCa,
} from "@/lib/ldap-policy";

export type AdUser = {
  username: string;
  name: string;
  email: string | null;
};

export type AdPerson = {
  username: string;
  name: string;
  area: string | null;
  active: boolean;
};

export type LdapAuthFailureReason =
  | "invalid_credentials"
  | "not_in_group"
  | "unavailable";

export type LdapAuthResult =
  | { ok: true; user: AdUser }
  | { ok: false; reason: LdapAuthFailureReason; detail?: string };

/** Bit ADS_UF_ACCOUNTDISABLE en userAccountControl */
const AD_ACCOUNTDISABLE = 2;

const BUILTIN_EXCLUDED = new Set([
  "krbtgt",
  "guest",
  "administrator",
  "defaultaccount",
  "wdagutilityaccount",
]);

const LDAP_MATCHING_RULE_IN_CHAIN = "1.2.840.113556.1.4.1941";

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}`);
  }
  return value;
}

function ldapUrls(): string[] {
  return parseLdapUrlList(requiredEnv("LDAP_URL"));
}

function netbiosDomain(dnsDomain: string): string {
  const configured = process.env.LDAP_NETBIOS?.trim();
  if (configured) return configured;
  return (dnsDomain.split(".")[0] ?? dnsDomain).toUpperCase();
}

function hostnameFromLdapUrl(url: string): string | undefined {
  try {
    return new URL(url).hostname || undefined;
  } catch {
    return undefined;
  }
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

export function isLdapBindConfigured(): boolean {
  return Boolean(
    process.env.LDAP_BIND_USER?.trim() && process.env.LDAP_BIND_PASSWORD,
  );
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
    console.warn(
      "[ldap] Falló chequeo member IN_CHAIN sobre el grupo:",
      describeLdapTlsFailure(error),
    );
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
    console.warn(
      "[ldap] Falló chequeo memberOf IN_CHAIN sobre el usuario:",
      describeLdapTlsFailure(error),
    );
  }

  return false;
}

async function bindWithFallbacks(
  client: Client,
  username: string,
  password: string,
  domain: string,
): Promise<void> {
  const candidates: string[] = [];
  if (username.includes("@") || username.includes("\\")) {
    candidates.push(username);
  } else {
    const netbios = netbiosDomain(domain);
    candidates.push(`${username}@${domain}`, `${netbios}\\${username}`);
  }

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

function createLdapClient(url: string): Client {
  if (!url.toLowerCase().startsWith("ldaps://")) {
    throw new Error(
      `Refused unencrypted LDAP URL: ${url}. Solo se permite ldaps://:636.`,
    );
  }

  const hostname = hostnameFromLdapUrl(url);
  const ca = readMandatoryLdapCa();

  return new Client({
    url,
    timeout: 60_000,
    connectTimeout: 15_000,
    tlsOptions: {
      ca: [ca],
      rejectUnauthorized: true,
      servername: hostname,
      minVersion: "TLSv1.2",
    },
  });
}

async function prepareClient(url: string): Promise<Client> {
  return createLdapClient(url);
}

function shouldImportAdAccount(username: string): boolean {
  const lower = username.toLowerCase();
  if (BUILTIN_EXCLUDED.has(lower)) return false;
  if (lower.startsWith("svc")) return false;
  return true;
}

function entryToAdPerson(entry: Entry): AdPerson | null {
  const sam = firstAttr(entry, "sAMAccountName");
  if (!sam || !shouldImportAdAccount(sam)) return null;

  const uacRaw = firstAttr(entry, "userAccountControl");
  const uac = uacRaw ? Number.parseInt(uacRaw, 10) : 0;
  const disabled =
    Number.isFinite(uac) && (uac & AD_ACCOUNTDISABLE) === AD_ACCOUNTDISABLE;

  const name =
    firstAttr(entry, "displayName") ||
    firstAttr(entry, "cn") ||
    sam;
  const department = firstAttr(entry, "department")?.trim() || null;

  return {
    username: sam.toLowerCase(),
    name,
    area: department,
    active: !disabled,
  };
}

async function listAdPeopleAgainstUrl(url: string): Promise<AdPerson[]> {
  const baseDn =
    process.env.LDAP_USERS_BASE_DN?.trim() || requiredEnv("LDAP_BASE_DN");
  const domain = requiredEnv("LDAP_DOMAIN");
  const bindUser = requiredEnv("LDAP_BIND_USER");
  const bindPassword = process.env.LDAP_BIND_PASSWORD ?? "";

  const client = await prepareClient(url);

  try {
    const bindIdentity =
      bindUser.includes("@") || bindUser.includes("\\")
        ? bindUser
        : normalizeAdUsername(bindUser);

    await bindWithFallbacks(client, bindIdentity, bindPassword, domain);

    // Usuarios de persona; svc*/built-in se filtran en entryToAdPerson.
    // Incluye deshabilitados para poder marcar active=false en re-sync.
    const filter =
      "(&(objectCategory=person)(objectClass=user)(!(sAMAccountName=krbtgt)))";

    const people: AdPerson[] = [];
    const paginator = client.searchPaginated(baseDn, {
      scope: "sub",
      filter,
      attributes: [
        "sAMAccountName",
        "displayName",
        "cn",
        "department",
        "userAccountControl",
      ],
      paged: { pageSize: 500 },
    });

    for await (const page of paginator) {
      for (const entry of page.searchEntries) {
        const person = entryToAdPerson(entry);
        if (person) people.push(person);
      }
    }

    return people;
  } finally {
    try {
      await client.unbind();
    } catch {
      // ignore
    }
  }
}

/** Lista usuarios de AD (habilitados y deshabilitados) excluyendo cuentas svc* y built-in. */
export async function listAdPeople(): Promise<AdPerson[]> {
  assertSecureLdapConfig();
  if (!isLdapConfigured()) {
    throw new Error("LDAP_URL no está configurado");
  }
  if (!isLdapBindConfigured()) {
    throw new Error(
      "Configurá LDAP_BIND_USER y LDAP_BIND_PASSWORD para sincronizar desde AD",
    );
  }

  const urls = ldapUrls();
  let lastError: unknown;

  for (const url of urls) {
    try {
      return await listAdPeopleAgainstUrl(url);
    } catch (error) {
      lastError = error;
      console.error(
        `[ldap] listAdPeople falló en ${url}:`,
        describeLdapTlsFailure(error),
      );
    }
  }

  throw lastError instanceof Error
    ? new Error(describeLdapTlsFailure(lastError))
    : new Error("No se pudo listar usuarios de Active Directory");
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

  const client = await prepareClient(url);

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
    const detail = describeLdapTlsFailure(error);
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
  assertSecureLdapConfig();
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
