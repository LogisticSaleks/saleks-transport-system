-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "billableKmLogicAtBooking" "CustomerBillableKmLogic",
ADD COLUMN     "fixedPriceAtBooking" DECIMAL(12,2),
ADD COLUMN     "portFeeIncludedAtBooking" BOOLEAN,
ADD COLUMN     "pricePerKmAtBooking" DECIMAL(12,4),
ADD COLUMN     "pricingMethodAtBooking" TEXT,
ADD COLUMN     "pricingSnapshotCreatedAt" TIMESTAMP(3),
ADD COLUMN     "tariffNameAtBooking" TEXT,
ADD COLUMN     "tariffTypeAtBooking" "TariffType",
ADD COLUMN     "waitingHourlyRateAtBooking" DECIMAL(12,2);
