-- CreateTable
CREATE TABLE "truck_fuel_entries" (
    "id" TEXT NOT NULL,
    "truckId" TEXT NOT NULL,
    "entryDate" TIMESTAMP(3) NOT NULL,
    "odometerKm" DECIMAL(12,2) NOT NULL,
    "dieselLiters" DECIMAL(12,2) NOT NULL,
    "dieselTotalAmount" DECIMAL(12,2) NOT NULL,
    "adBlueLiters" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "adBlueTotalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "stationName" TEXT,
    "location" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "truck_fuel_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "truck_fuel_entries_truckId_idx" ON "truck_fuel_entries"("truckId");

-- CreateIndex
CREATE INDEX "truck_fuel_entries_entryDate_idx" ON "truck_fuel_entries"("entryDate");

-- CreateIndex
CREATE INDEX "truck_fuel_entries_truckId_entryDate_idx" ON "truck_fuel_entries"("truckId", "entryDate");

-- CreateIndex
CREATE INDEX "truck_fuel_entries_truckId_odometerKm_idx" ON "truck_fuel_entries"("truckId", "odometerKm");

-- AddForeignKey
ALTER TABLE "truck_fuel_entries" ADD CONSTRAINT "truck_fuel_entries_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck"("id") ON DELETE CASCADE ON UPDATE CASCADE;
