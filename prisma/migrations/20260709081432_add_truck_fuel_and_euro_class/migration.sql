-- AlterTable
ALTER TABLE "Truck" ADD COLUMN     "defaultFuelConsumptionLPer100Km" DECIMAL(10,2) NOT NULL DEFAULT 30,
ADD COLUMN     "euroClass" TEXT NOT NULL DEFAULT 'Euro 6';

-- CreateIndex
CREATE INDEX "Truck_status_idx" ON "Truck"("status");
