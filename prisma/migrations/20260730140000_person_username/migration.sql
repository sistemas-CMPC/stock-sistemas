-- AlterTable
ALTER TABLE "Person" ADD COLUMN "username" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Person_username_key" ON "Person"("username");
