/*
  Warnings:

  - A unique constraint covering the columns `[customerId,name]` on the table `CustomerTariff` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TariffType" ADD VALUE 'FIXED_TABLE_UPPER_BOUND';
ALTER TYPE "TariffType" ADD VALUE 'MANUAL';

-- CreateIndex
CREATE UNIQUE INDEX "CustomerTariff_customerId_name_key" ON "CustomerTariff"("customerId", "name");
