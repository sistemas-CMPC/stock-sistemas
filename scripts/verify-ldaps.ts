import { createHash } from "node:crypto";
import { connect } from "node:tls";
import {
  assertSecureLdapConfig,
  describeLdapTlsFailure,
  ldapCaFilePath,
  readMandatoryLdapCa,
  validateLdapsUrl,
} from "../src/lib/ldap-policy";

type CertReport = {
  url: string;
  cn: string;
  thumbprintSha1: string;
  fingerprintSha256: string;
  validFrom: string;
  validTo: string;
};

function inspectLdaps(url: string, ca: Buffer): Promise<CertReport> {
  const parsed = validateLdapsUrl(url);
  const host = parsed.hostname;
  const port = Number(parsed.port || "636");

  return new Promise((resolve, reject) => {
    const socket = connect(
      {
        host,
        port,
        servername: host,
        ca: [ca],
        rejectUnauthorized: true,
        minVersion: "TLSv1.2",
      },
      () => {
        try {
          const cert = socket.getPeerCertificate(true);
          socket.end();
          if (!cert || !cert.raw) {
            reject(new Error(`El DC ${host} no envió certificado`));
            return;
          }
          const cn = cert.subject?.CN;
          resolve({
            url,
            cn: Array.isArray(cn) ? cn.join(", ") : (cn ?? "(sin CN)"),
            thumbprintSha1: createHash("sha1")
              .update(cert.raw)
              .digest("hex")
              .toUpperCase(),
            fingerprintSha256: createHash("sha256")
              .update(cert.raw)
              .digest("hex")
              .toUpperCase(),
            validFrom: cert.valid_from,
            validTo: cert.valid_to,
          });
        } catch (error) {
          socket.destroy();
          reject(error);
        }
      },
    );
    socket.on("error", reject);
  });
}

async function main() {
  const urls = assertSecureLdapConfig();
  if (urls.length === 0) {
    console.error("LDAP_URL no está configurado; no hay DC para verificar.");
    process.exit(1);
  }

  const ca = readMandatoryLdapCa();
  const pem = ldapCaFilePath();
  console.log(`PEM de confianza: ${pem}`);
  console.log("");

  let failed = 0;
  for (const url of urls) {
    try {
      const report = await inspectLdaps(url, ca);
      console.log(`OK  ${report.url}`);
      console.log(`    CN: ${report.cn}`);
      console.log(`    Thumbprint (SHA-1): ${report.thumbprintSha1}`);
      console.log(`    SHA-256: ${report.fingerprintSha256}`);
      console.log(`    Válido desde: ${report.validFrom}`);
      console.log(`    Vence: ${report.validTo}`);
    } catch (error) {
      failed += 1;
      console.error(`FAIL  ${url}`);
      console.error(`    ${describeLdapTlsFailure(error)}`);
    }
    console.log("");
  }

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(describeLdapTlsFailure(error));
  process.exit(1);
});
