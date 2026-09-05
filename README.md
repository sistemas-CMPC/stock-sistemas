# Stock Sistemas

Control de stock y préstamos de material técnico para el área de sistemas.

## Stack

- Next.js 15 (App Router) + TypeScript
- PostgreSQL + Prisma
- Auth.js (una cuenta operador)
- pnpm
- Docker Compose

## Funciones

- Activos únicos con código de barras (Code128) o QR
- Alta con código existente (fabricante) o generación + impresión de etiqueta
- Personas / compañeros
- Estaciones de trabajo (nombre, IP, responsable) con componentes asociados por escaneo
- Préstamos con devolución y asignaciones
- Escaneo por pistola (modo teclado) en `/scan`
- Discos de backup: descripción libre + fecha del último backup
- Historial de movimientos

## Desarrollo local

1. Copiá variables de entorno:

```bash
cp .env.example .env
```

2. Levantá Postgres (o usá solo el servicio `db` de Compose):

```bash
docker compose up -d db
```

> Por defecto el Postgres del compose se publica en el host como **5433** (para no chocar con otros Postgres locales). Dentro de la red Docker el servicio `db` sigue en el 5432.

3. Instalá dependencias, migrá y sembrá:

```bash
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm dev
```

4. Abrí [http://localhost:3000](http://localhost:3000)

Credenciales de la oficina (seed):

| Usuario | Contraseña |
|---------|------------|
| `nsosa` | `nsosa**` |
| `nwei` | `kukita**` |
| `ebellon` | `ebellon**` |
| `rpardo` | `rpardo**` |

También queda `admin` / `admin123` **solo si** `AUTH_ALLOW_LOCAL=true` en desarrollo. En producción esa variable aborta el arranque.

## Docker (producción / servidor local)

```bash
cp .env.example .env
# Obligatorio: AUTH_SECRET, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB,
# DC01_IP, DC02_IP, LDAP_BIND_USER, LDAP_BIND_PASSWORD
docker compose up -d --build
```

La app queda publicada en **APP_PORT** (default 3001). Al arrancar valida la política LDAPS, aplica migraciones y siembra categorías.

Verificación de certificados de los DC:

```bash
pnpm ldap:verify
# o, con Compose:
docker compose exec app pnpm ldap:verify
```

## Scripts útiles

| Script | Descripción |
|--------|-------------|
| `pnpm dev` | Desarrollo |
| `pnpm build` | Build |
| `pnpm db:migrate` | Migración en desarrollo |
| `pnpm db:seed` | Seed categorías + admin |
| `pnpm db:studio` | Prisma Studio |
| `pnpm ldap:assert` | Valida política LDAPS (abortar si hay ldap://, IP o TLS inseguro) |
| `pnpm ldap:verify` | Abre LDAPS a cada DC y reporta CN, thumbprint y vencimiento |

## Notas de uso con pistola

La pantalla **Escanear** mantiene un input enfocado. Las pistolas USB en modo HID escriben el código y envían Enter: con eso se busca el activo y se puede registrar préstamo, asignación o devolución.
