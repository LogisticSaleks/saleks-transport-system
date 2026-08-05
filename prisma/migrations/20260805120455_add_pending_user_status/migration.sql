-- AlterEnum
ALTER TYPE "UserStatus" ADD VALUE 'PENDING';

-- AlterTable
ALTER TABLE "user_profiles" ALTER COLUMN "status" SET DEFAULT 'PENDING';
