-- AlterTable
ALTER TABLE "Address" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "notes" SET DEFAULT '';

-- CreateIndex
CREATE INDEX "Address_type_idx" ON "Address"("type");

-- CreateIndex
CREATE INDEX "Address_isActive_idx" ON "Address"("isActive");
