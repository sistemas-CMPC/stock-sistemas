-- CreateEnum
CREATE TYPE "PrinterEventType" AS ENUM ('TONER_CHANGE', 'REPAIR', 'SERVICE', 'NOTE');

-- AlterTable
ALTER TABLE "Category" ADD COLUMN "isPrinter" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "PrinterInfo" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "model" TEXT,
    "location" TEXT,
    "ipAddress" TEXT,
    "connectedTo" TEXT,
    "lastTonerAt" TIMESTAMP(3),
    "notes" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrinterInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrinterEvent" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "type" "PrinterEventType" NOT NULL,
    "userId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrinterEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PrinterInfo_assetId_key" ON "PrinterInfo"("assetId");

-- CreateIndex
CREATE INDEX "PrinterEvent_assetId_createdAt_idx" ON "PrinterEvent"("assetId", "createdAt");

-- AddForeignKey
ALTER TABLE "PrinterInfo" ADD CONSTRAINT "PrinterInfo_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrinterEvent" ADD CONSTRAINT "PrinterEvent_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrinterEvent" ADD CONSTRAINT "PrinterEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
