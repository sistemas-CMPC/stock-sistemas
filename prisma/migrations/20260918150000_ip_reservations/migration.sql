-- CreateTable
CREATE TABLE "IpReservation" (
    "id" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IpReservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IpReservation_ipAddress_key" ON "IpReservation"("ipAddress");
