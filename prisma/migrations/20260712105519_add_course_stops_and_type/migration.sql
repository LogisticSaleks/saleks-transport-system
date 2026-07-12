-- CreateEnum
CREATE TYPE "CourseType" AS ENUM ('ROUND_TRIP', 'SHUNT');

-- CreateEnum
CREATE TYPE "CourseStopType" AS ENUM ('PICKUP', 'LOAD_UNLOAD', 'EXTRA', 'RETURN');

-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "courseType" "CourseType" NOT NULL DEFAULT 'ROUND_TRIP';

-- CreateTable
CREATE TABLE "course_stops" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "addressId" TEXT,
    "sequence" INTEGER NOT NULL,
    "type" "CourseStopType" NOT NULL,
    "label" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_stops_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "course_stops_courseId_idx" ON "course_stops"("courseId");

-- CreateIndex
CREATE INDEX "course_stops_addressId_idx" ON "course_stops"("addressId");

-- CreateIndex
CREATE INDEX "course_stops_type_idx" ON "course_stops"("type");

-- CreateIndex
CREATE UNIQUE INDEX "course_stops_courseId_sequence_key" ON "course_stops"("courseId", "sequence");

-- CreateIndex
CREATE INDEX "Course_courseType_idx" ON "Course"("courseType");

-- AddForeignKey
ALTER TABLE "course_stops" ADD CONSTRAINT "course_stops_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_stops" ADD CONSTRAINT "course_stops_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;
