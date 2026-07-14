/*
  Warnings:

  - Made the column `notes` on table `Address` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Address" ADD COLUMN     "latitude" DECIMAL(10,7),
ADD COLUMN     "longitude" DECIMAL(10,7),
ALTER COLUMN "notes" SET NOT NULL;
