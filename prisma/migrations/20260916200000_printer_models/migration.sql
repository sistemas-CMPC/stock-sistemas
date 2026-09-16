-- CreateTable
CREATE TABLE "PrinterModel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrinterModel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PrinterModel_name_key" ON "PrinterModel"("name");

-- Migrate free-text models from PrinterInfo into PrinterModel
INSERT INTO "PrinterModel" ("id", "name", "notes", "createdAt", "updatedAt")
SELECT
  md5('pi-' || lower(trim("model"))) AS "id",
  trim("model") AS "name",
  '' AS "notes",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "PrinterInfo"
WHERE "model" IS NOT NULL AND trim("model") <> ''
ON CONFLICT ("name") DO NOTHING;

-- Also migrate from old compat strings
INSERT INTO "PrinterModel" ("id", "name", "notes", "createdAt", "updatedAt")
SELECT
  md5('pc-' || lower(trim("printerModel"))) AS "id",
  trim("printerModel") AS "name",
  '' AS "notes",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "PrinterTonerCompat"
WHERE trim("printerModel") <> ''
ON CONFLICT ("name") DO NOTHING;

-- Alter PrinterInfo: add FK, drop free-text model
ALTER TABLE "PrinterInfo" ADD COLUMN "printerModelId" TEXT;

UPDATE "PrinterInfo" pi
SET "printerModelId" = pm."id"
FROM "PrinterModel" pm
WHERE pi."model" IS NOT NULL AND lower(trim(pi."model")) = lower(pm."name");

ALTER TABLE "PrinterInfo" DROP COLUMN "model";

ALTER TABLE "PrinterInfo" ADD CONSTRAINT "PrinterInfo_printerModelId_fkey"
  FOREIGN KEY ("printerModelId") REFERENCES "PrinterModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Rebuild PrinterTonerCompat with FK
ALTER TABLE "PrinterTonerCompat" ADD COLUMN "printerModelId" TEXT;

UPDATE "PrinterTonerCompat" c
SET "printerModelId" = pm."id"
FROM "PrinterModel" pm
WHERE lower(trim(c."printerModel")) = lower(pm."name");

DELETE FROM "PrinterTonerCompat" WHERE "printerModelId" IS NULL;

ALTER TABLE "PrinterTonerCompat" DROP CONSTRAINT IF EXISTS "PrinterTonerCompat_tonerSkuId_printerModel_key";
DROP INDEX IF EXISTS "PrinterTonerCompat_printerModel_idx";
ALTER TABLE "PrinterTonerCompat" DROP COLUMN "printerModel";

ALTER TABLE "PrinterTonerCompat" ALTER COLUMN "printerModelId" SET NOT NULL;

CREATE UNIQUE INDEX "PrinterTonerCompat_tonerSkuId_printerModelId_key"
  ON "PrinterTonerCompat"("tonerSkuId", "printerModelId");

CREATE INDEX "PrinterTonerCompat_printerModelId_idx"
  ON "PrinterTonerCompat"("printerModelId");

ALTER TABLE "PrinterTonerCompat" ADD CONSTRAINT "PrinterTonerCompat_printerModelId_fkey"
  FOREIGN KEY ("printerModelId") REFERENCES "PrinterModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
