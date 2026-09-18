-- AlterTable
ALTER TABLE "Workstation" ADD COLUMN "code" TEXT,
ADD COLUMN "os" TEXT,
ADD COLUMN "ram" TEXT,
ADD COLUMN "diskType" TEXT,
ADD COLUMN "storage" TEXT,
ADD COLUMN "lastMaintenanceAt" TIMESTAMP(3);

-- Backfill unique QR codes for existing PCs
UPDATE "Workstation"
SET "code" = 'PC-' || UPPER(SUBSTR(MD5("id" || RANDOM()::TEXT), 1, 10))
WHERE "code" IS NULL;

ALTER TABLE "Workstation" ALTER COLUMN "code" SET NOT NULL;

CREATE UNIQUE INDEX "Workstation_code_key" ON "Workstation"("code");

-- CreateTable
CREATE TABLE "WorkstationMaintenance" (
    "id" TEXT NOT NULL,
    "workstationId" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkstationMaintenance_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WorkstationMaintenance_workstationId_performedAt_idx" ON "WorkstationMaintenance"("workstationId", "performedAt");

ALTER TABLE "WorkstationMaintenance" ADD CONSTRAINT "WorkstationMaintenance_workstationId_fkey" FOREIGN KEY ("workstationId") REFERENCES "Workstation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkstationMaintenance" ADD CONSTRAINT "WorkstationMaintenance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
