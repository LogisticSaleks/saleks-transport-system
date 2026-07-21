-- CreateTable
CREATE TABLE "weekly_truck_revenue_reports" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "weekStartDate" TIMESTAMP(3) NOT NULL,
    "weekEndDate" TIMESTAMP(3) NOT NULL,
    "truckId" TEXT,
    "truckNameAtReport" TEXT NOT NULL,
    "truckLicensePlateAtReport" TEXT NOT NULL,
    "courseCount" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weekly_truck_revenue_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_truck_revenue_report_courses" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "courseId" TEXT,
    "courseDate" TIMESTAMP(3) NOT NULL,
    "customerNameAtReport" TEXT NOT NULL,
    "courseTypeAtReport" "CourseType" NOT NULL,
    "containerNumber" TEXT,
    "routeLabel" TEXT NOT NULL,
    "tariffNameAtBooking" TEXT,
    "agreedPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "waitingAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalRevenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weekly_truck_revenue_report_courses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "weekly_truck_revenue_reports_year_weekNumber_idx" ON "weekly_truck_revenue_reports"("year", "weekNumber");

-- CreateIndex
CREATE INDEX "weekly_truck_revenue_reports_truckId_idx" ON "weekly_truck_revenue_reports"("truckId");

-- CreateIndex
CREATE INDEX "weekly_truck_revenue_reports_weekStartDate_idx" ON "weekly_truck_revenue_reports"("weekStartDate");

-- CreateIndex
CREATE INDEX "weekly_truck_revenue_reports_isLocked_idx" ON "weekly_truck_revenue_reports"("isLocked");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_truck_revenue_reports_year_weekNumber_truckId_key" ON "weekly_truck_revenue_reports"("year", "weekNumber", "truckId");

-- CreateIndex
CREATE INDEX "weekly_truck_revenue_report_courses_reportId_idx" ON "weekly_truck_revenue_report_courses"("reportId");

-- CreateIndex
CREATE INDEX "weekly_truck_revenue_report_courses_courseId_idx" ON "weekly_truck_revenue_report_courses"("courseId");

-- CreateIndex
CREATE INDEX "weekly_truck_revenue_report_courses_courseDate_idx" ON "weekly_truck_revenue_report_courses"("courseDate");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_truck_revenue_report_courses_reportId_courseId_key" ON "weekly_truck_revenue_report_courses"("reportId", "courseId");

-- AddForeignKey
ALTER TABLE "weekly_truck_revenue_reports" ADD CONSTRAINT "weekly_truck_revenue_reports_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_truck_revenue_report_courses" ADD CONSTRAINT "weekly_truck_revenue_report_courses_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "weekly_truck_revenue_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_truck_revenue_report_courses" ADD CONSTRAINT "weekly_truck_revenue_report_courses_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;
