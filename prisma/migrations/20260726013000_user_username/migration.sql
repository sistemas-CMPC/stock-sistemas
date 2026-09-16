-- AlterTable
ALTER TABLE "User" ADD COLUMN "username" TEXT;

-- Backfill existing users from email local-part
UPDATE "User"
SET "username" = split_part("email", '@', 1)
WHERE "username" IS NULL AND "email" IS NOT NULL;

UPDATE "User"
SET "username" = 'user_' || substr("id", 1, 8)
WHERE "username" IS NULL;

-- Make username required and unique
ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- Make email optional
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;
