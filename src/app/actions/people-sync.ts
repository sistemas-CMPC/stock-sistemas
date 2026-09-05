"use server";

import { revalidatePath } from "next/cache";
import { listAdPeople, isLdapBindConfigured, isLdapConfigured } from "@/lib/ldap";
import { describeLdapTlsFailure } from "@/lib/ldap-policy";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export type SyncPeopleState =
  | {
      error?: string;
      created?: number;
      updated?: number;
      total?: number;
    }
  | undefined;

export async function syncPeopleFromAd(
  _prev: SyncPeopleState,
  _formData: FormData,
): Promise<SyncPeopleState> {
  await requireUser();

  if (!isLdapConfigured()) {
    return { error: "LDAP_URL no está configurado" };
  }
  if (!isLdapBindConfigured()) {
    return {
      error:
        "Faltan LDAP_BIND_USER y LDAP_BIND_PASSWORD en el entorno del servidor",
    };
  }

  try {
    const adPeople = await listAdPeople();
    let created = 0;
    let updated = 0;

    for (const person of adPeople) {
      const existing = await prisma.person.findUnique({
        where: { username: person.username },
        select: { id: true },
      });

      await prisma.person.upsert({
        where: { username: person.username },
        create: {
          username: person.username,
          name: person.name,
          area: person.area,
          active: person.active,
        },
        update: {
          name: person.name,
          area: person.area,
          active: person.active,
        },
      });

      if (existing) updated += 1;
      else created += 1;
    }

    revalidatePath("/people");
    revalidatePath("/scan");
    revalidatePath("/workstations");

    return {
      created,
      updated,
      total: adPeople.length,
    };
  } catch (error) {
    console.error("[syncPeopleFromAd]", describeLdapTlsFailure(error));
    return {
      error:
        "No se pudo sincronizar desde Active Directory. Revisá los logs del servidor.",
    };
  }
}
