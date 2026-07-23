-- CreateEnum
CREATE TYPE "SettlementStatus" AS ENUM ('NOT_CHECKED', 'OK', 'UNDERPAID', 'OVERPAID', 'DISPUTED');

-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "settlementAmount" DECIMAL(12,2),
ADD COLUMN     "settlementCheckedAt" TIMESTAMP(3),
ADD COLUMN     "settlementNotes" TEXT,
ADD COLUMN     "settlementReference" TEXT,
ADD COLUMN     "settlementStatus" "SettlementStatus" NOT NULL DEFAULT 'NOT_CHECKED';

-- CreateIndex
CREATE INDEX "Course_settlementStatus_idx" ON "Course"("settlementStatus");

-- CreateIndex
CREATE INDEX "Course_settlementCheckedAt_idx" ON "Course"("settlementCheckedAt");
