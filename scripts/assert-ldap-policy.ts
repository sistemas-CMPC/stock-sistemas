import { assertSecureLdapConfig } from "../src/lib/ldap-policy";

const urls = assertSecureLdapConfig();
if (urls.length === 0) {
  console.log("Política LDAPS OK (LDAP_URL no configurado; solo válido fuera de producción).");
} else {
  console.log(`Política LDAPS OK (${urls.length} URL${urls.length === 1 ? "" : "s"}).`);
}
