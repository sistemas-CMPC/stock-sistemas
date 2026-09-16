-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MovementType" ADD VALUE 'ASIGNACION_PC';
ALTER TYPE "MovementType" ADD VALUE 'FIN_ASIGNACION_PC';

-- CreateTable
CREATE TABLE "Workstation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ipAddress" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "personId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workstation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkstationComponent" (
    "id" TEXT NOT NULL,
    "workstationId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkstationComponent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Workstation_name_key" ON "Workstation"("name");

-- CreateIndex
CREATE INDEX "WorkstationComponent_assetId_removedAt_idx" ON "WorkstationComponent"("assetId", "removedAt");

-- CreateIndex
CREATE INDEX "WorkstationComponent_workstationId_removedAt_idx" ON "WorkstationComponent"("workstationId", "removedAt");

-- AddForeignKey
ALTER TABLE "Workstation" ADD CONSTRAINT "Workstation_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkstationComponent" ADD CONSTRAINT "WorkstationComponent_workstationId_fkey" FOREIGN KEY ("workstationId") REFERENCES "Workstation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkstationComponent" ADD CONSTRAINT "WorkstationComponent_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
