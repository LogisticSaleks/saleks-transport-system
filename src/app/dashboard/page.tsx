import DashboardWeeklyReports, {
  type DashboardTruckOption,
  type WeeklyTruckRevenueReportRow,
} from "@/components/dashboard/DashboardWeeklyReports";
import { AppShell } from "@/components/layout/AppShell";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type WeeklyReportCourseForDashboard = {
  id: string;
  courseDate: Date;
  customerNameAtReport: string;
  courseTypeAtReport: "ROUND_TRIP" | "SHUNT";
  containerNumber: string | null;
  routeLabel: string;
  tariffNameAtBooking: string | null;
  agreedPrice: unknown;
  waitingAmount: unknown;
  totalRevenue: unknown;
  course: {
    settlementAmount: unknown;
    settlementStatus: SettlementStatusValue;
    settlementReference: string | null;
    settlementNotes: string | null;
  } | null;
};

type SettlementStatusValue =
  | "NOT_CHECKED"
  | "OK"
  | "UNDERPAID"
  | "OVERPAID"
  | "DISPUTED";

type WeeklyReportForDashboard = {
  id: string;
  year: number;
  weekNumber: number;
  weekStartDate: Date;
  weekEndDate: Date;
  truckId: string | null;
  truckNameAtReport: string;
  truckLicensePlateAtReport: string;
  courseCount: number;
  totalRevenue: unknown;
  generatedAt: Date;
  isLocked: boolean;
  courses: WeeklyReportCourseForDashboard[];
};

export default async function DashboardPage() {
  const currentWeek = getIsoWeek(new Date());

  const [trucks, reports] = await Promise.all([
    prisma.truck.findMany({
      where: {
        status: "ACTIVE",
      },
      select: {
        id: true,
        name: true,
        licensePlate: true,
        status: true,
      },
      orderBy: [
        {
          name: "asc",
        },
        {
          licensePlate: "asc",
        },
      ],
    }),

    prisma.weeklyTruckRevenueReport.findMany({
      where: {
        year: currentWeek.year,
        weekNumber: currentWeek.weekNumber,
      },
      include: {
        courses: {
          include: {
            course: {
              select: {
                settlementAmount: true,
                settlementStatus: true,
                settlementReference: true,
                settlementNotes: true,
              },
            },
          },
          orderBy: [
            {
              courseDate: "asc",
            },
            {
              createdAt: "asc",
            },
          ],
        },
      },
      orderBy: [
        {
          truckNameAtReport: "asc",
        },
        {
          truckLicensePlateAtReport: "asc",
        },
      ],
    }),
  ]);

  return (
    <AppShell title="Dashboard">
      <DashboardWeeklyReports
        initialYear={currentWeek.year}
        initialWeekNumber={currentWeek.weekNumber}
        trucks={trucks.map(mapTruckForDashboard)}
        initialReports={reports.map(mapWeeklyReportForDashboard)}
      />
    </AppShell>
  );
}

function mapTruckForDashboard(
  truck: {
    id: string;
    name: string;
    licensePlate: string;
    status: string;
  },
): DashboardTruckOption {
  return {
    id: truck.id,
    name: truck.name,
    licensePlate: truck.licensePlate,
    status: truck.status,
  };
}

function mapWeeklyReportForDashboard(
  report: WeeklyReportForDashboard,
): WeeklyTruckRevenueReportRow {
  const courses = report.courses.map(
    mapWeeklyReportCourseForDashboard,
  );

  const expectedRevenue = roundMoney(
    courses.reduce(
      (sum, course) => sum + course.expectedRevenue,
      0,
    ),
  );

  const totalRevenue = roundMoney(
    courses.reduce(
      (sum, course) => sum + course.totalRevenue,
      0,
    ),
  );

  const settlementAmount = roundMoney(
    courses.reduce(
      (sum, course) =>
        sum + (course.settlementAmount ?? 0),
      0,
    ),
  );

  const settlementCheckedCount =
    courses.filter(
      (course) =>
        course.settlementAmount !== null,
    ).length;

  return {
    id: report.id,
    year: report.year,
    weekNumber: report.weekNumber,
    weekStartDate: report.weekStartDate.toISOString(),
    weekEndDate: report.weekEndDate.toISOString(),
    truckId: report.truckId,
    truckNameAtReport: report.truckNameAtReport,
    truckLicensePlateAtReport:
      report.truckLicensePlateAtReport,
    courseCount: report.courseCount,
    expectedRevenue,
    settlementAmount,
    settlementDifference:
      roundMoney(totalRevenue - expectedRevenue),
    settlementCheckedCount,
    notCheckedCount:
      courses.length - settlementCheckedCount,
    underpaidCount: courses.filter(
      (course) =>
        course.settlementStatus === "UNDERPAID",
    ).length,
    totalRevenue,
    generatedAt: report.generatedAt.toISOString(),
    isLocked: report.isLocked,
    courses,
  };
}

function mapWeeklyReportCourseForDashboard(
  course: WeeklyReportCourseForDashboard,
) {
  const agreedPrice = toNumber(course.agreedPrice);
  const waitingAmount = toNumber(course.waitingAmount);
  const expectedRevenue = roundMoney(
    agreedPrice + waitingAmount,
  );
  const settlementAmount = toNullableNumber(
    course.course?.settlementAmount,
  );
  const settlementDifference =
    settlementAmount === null
      ? null
      : roundMoney(
          settlementAmount - expectedRevenue,
        );
  const settlementStatus =
    normalizeSettlementStatus({
      settlementStatus:
        course.course?.settlementStatus ??
        "NOT_CHECKED",
      settlementAmount,
      settlementDifference,
    });

  return {
    id: course.id,
    courseDate: course.courseDate.toISOString(),
    customerNameAtReport:
      course.customerNameAtReport,
    courseTypeAtReport:
      course.courseTypeAtReport,
    containerNumber: course.containerNumber,
    routeLabel: course.routeLabel,
    tariffNameAtBooking:
      course.tariffNameAtBooking,
    agreedPrice,
    waitingAmount,
    expectedRevenue,
    settlementAmount,
    settlementDifference,
    settlementStatus,
    settlementReference:
      course.course?.settlementReference ?? null,
    settlementNotes:
      course.course?.settlementNotes ?? null,
    totalRevenue:
      settlementAmount ?? expectedRevenue,
  };
}

function normalizeSettlementStatus({
  settlementStatus,
  settlementAmount,
  settlementDifference,
}: {
  settlementStatus: SettlementStatusValue;
  settlementAmount: number | null;
  settlementDifference: number | null;
}): SettlementStatusValue {
  if (settlementStatus === "DISPUTED") {
    return "DISPUTED";
  }

  if (settlementAmount === null) {
    return "NOT_CHECKED";
  }

  if (
    settlementDifference !== null &&
    Math.abs(settlementDifference) < 0.01
  ) {
    return "OK";
  }

  if (
    settlementDifference !== null &&
    settlementDifference < 0
  ) {
    return "UNDERPAID";
  }

  if (
    settlementDifference !== null &&
    settlementDifference > 0
  ) {
    return "OVERPAID";
  }

  return settlementStatus;
}

function getIsoWeek(date: Date): {
  year: number;
  weekNumber: number;
} {
  const targetDate = new Date(
    Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    ),
  );

  const dayNumber = targetDate.getUTCDay() || 7;

  targetDate.setUTCDate(
    targetDate.getUTCDate() + 4 - dayNumber,
  );

  const yearStart = new Date(
    Date.UTC(targetDate.getUTCFullYear(), 0, 1),
  );

  const weekNumber = Math.ceil(
    ((targetDate.getTime() - yearStart.getTime()) / 86400000 +
      1) /
      7,
  );

  return {
    year: targetDate.getUTCFullYear(),
    weekNumber,
  };
}

function toNullableNumber(
  value: unknown,
): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const parsedValue = toNumber(value);

  return Number.isFinite(parsedValue)
    ? parsedValue
    : null;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function toNumber(value: unknown): number {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsedValue = Number(value);

    return Number.isFinite(parsedValue) ? parsedValue : 0;
  }

  if (
    typeof value === "object" &&
    "toNumber" in value &&
    typeof value.toNumber === "function"
  ) {
    const parsedValue = value.toNumber();

    return Number.isFinite(parsedValue) ? parsedValue : 0;
  }

  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : 0;
}