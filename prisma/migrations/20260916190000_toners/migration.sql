-- CreateEnum
CREATE TYPE "TonerMovementType" AS ENUM ('INCOMING', 'USED', 'EMPTY_OUT', 'ADJUST');

-- CreateTable
CREATE TABLE "TonerSku" (
    "id" TEXT NOT NULL,
    "barcode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "minStock" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT NOT NULL DEFAULT '',
    "fullQty" INTEGER NOT NULL DEFAULT 0,
    "emptyQty" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TonerSku_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrinterTonerCompat" (
    "id" TEXT NOT NULL,
    "tonerSkuId" TEXT NOT NULL,
    "printerModel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrinterTonerCompat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TonerMovement" (
    "id" TEXT NOT NULL,
    "tonerSkuId" TEXT NOT NULL,
    "type" "TonerMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "userId" TEXT NOT NULL,
    "printerAssetId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TonerMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TonerSku_barcode_key" ON "TonerSku"("barcode");

-- CreateIndex
CREATE INDEX "PrinterTonerCompat_printerModel_idx" ON "PrinterTonerCompat"("printerModel");

-- CreateIndex
CREATE UNIQUE INDEX "PrinterTonerCompat_tonerSkuId_printerModel_key" ON "PrinterTonerCompat"("tonerSkuId", "printerModel");

-- CreateIndex
CREATE INDEX "TonerMovement_tonerSkuId_createdAt_idx" ON "TonerMovement"("tonerSkuId", "createdAt");

-- AddForeignKey
ALTER TABLE "PrinterTonerCompat" ADD CONSTRAINT "PrinterTonerCompat_tonerSkuId_fkey" FOREIGN KEY ("tonerSkuId") REFERENCES "TonerSku"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TonerMovement" ADD CONSTRAINT "TonerMovement_tonerSkuId_fkey" FOREIGN KEY ("tonerSkuId") REFERENCES "TonerSku"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TonerMovement" ADD CONSTRAINT "TonerMovement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TonerMovement" ADD CONSTRAINT "TonerMovement_printerAssetId_fkey" FOREIGN KEY ("printerAssetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
