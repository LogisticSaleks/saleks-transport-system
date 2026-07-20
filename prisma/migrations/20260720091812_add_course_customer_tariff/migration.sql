-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "customerTariffId" TEXT;

-- CreateIndex
CREATE INDEX "Course_customerTariffId_idx" ON "Course"("customerTariffId");

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_customerTariffId_fkey" FOREIGN KEY ("customerTariffId") REFERENCES "CustomerTariff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
