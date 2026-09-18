-- CreateTable
CREATE TABLE "Server" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ipAddress" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Server_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VirtualMachine" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ipAddress" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VirtualMachine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VmService" (
    "id" TEXT NOT NULL,
    "vmId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ipAddress" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VmService_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Server_name_key" ON "Server"("name");

-- CreateIndex
CREATE INDEX "VirtualMachine_serverId_idx" ON "VirtualMachine"("serverId");

-- CreateIndex
CREATE UNIQUE INDEX "VirtualMachine_serverId_name_key" ON "VirtualMachine"("serverId", "name");

-- CreateIndex
CREATE INDEX "VmService_vmId_idx" ON "VmService"("vmId");

-- AddForeignKey
ALTER TABLE "VirtualMachine" ADD CONSTRAINT "VirtualMachine_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VmService" ADD CONSTRAINT "VmService_vmId_fkey" FOREIGN KEY ("vmId") REFERENCES "VirtualMachine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
