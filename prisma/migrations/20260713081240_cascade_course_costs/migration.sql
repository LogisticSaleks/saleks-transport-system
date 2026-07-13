-- DropForeignKey
ALTER TABLE "Cost" DROP CONSTRAINT "Cost_courseId_fkey";

-- AddForeignKey
ALTER TABLE "Cost" ADD CONSTRAINT "Cost_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
