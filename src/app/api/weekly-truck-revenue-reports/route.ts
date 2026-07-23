import { NextResponse } from "next/server";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JsonObject = Record<string, unknown>;

type CourseForWeeklyReport = {
  id: string;
  plannedDate: Date | null;
  createdAt: Date;
  courseType: "ROUND_TRIP" | "SHUNT";
  containerNumber: string | null;
  agreedPrice: unknown;
  waitingAmount: unknown;
  settlementAmount: unknown;
  settlementStatus: SettlementStatusValue;
  settlementReference: string | null;
  settlementNotes: string | null;
  customer: {
    name: string;
  };
  customerTariff: {
    name: string;
  } | null;
  tariffNameAtBooking: string | null;
  pickupAddress: AddressForRouteLabel | null;
  deliveryAddress: AddressForRouteLabel | null;
  stops: {
    sequence: number;
    label: string | null;
    address: AddressForRouteLabel | null;
  }[];
};

type AddressForRouteLabel = {
  name: string;
  street: string | null;
  city: string | null;
  postalCode: string | null;
  country: string;
};

type SettlementStatusValue =
  | "NOT_CHECKED"
  | "OK"
  | "UNDERPAID"
  | "OVERPAID"
  | "DISPUTED";

type WeeklyReportCourseSnapshot = {
  courseId: string;
  courseDate: Date;
  customerNameAtReport: string;
  courseTypeAtReport: "ROUND_TRIP" | "SHUNT";
  containerNumber: string | null;
  routeLabel: string;
  tariffNameAtBooking: string | null;
  agreedPrice: number;
  waitingAmount: number;
  totalRevenue: number;
};

type WeeklyReportCourseForResponse = {
  id: string;
  courseId: string | null;
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

type WeeklyReportForResponse = {
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
  courses: WeeklyReportCourseForResponse[];
};

/**
 * GET /api/weekly-truck-revenue-reports
 * GET /api/weekly-truck-revenue-reports?id=REPORT_ID
 * GET /api/weekly-truck-revenue-reports?year=2026&weekNumber=30
 * GET /api/weekly-truck-revenue-reports?year=2026&weekNumber=30&truckId=TRUCK_ID
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);

    const reportId = normalizeOptionalString(
      url.searchParams.get("id"),
    );

    if (reportId) {
      const report = await readReportById(reportId);

      if (!report) {
        return errorResponse(
          "Седмичният отчет не е намерен.",
          404,
        );
      }

      return NextResponse.json({
        report: serializeForJson(
          buildWeeklyReportResponse(
            report as WeeklyReportForResponse,
          ),
        ),
      });
    }

    const year = readOptionalPositiveIntegerFromSearchParams(
      url.searchParams,
      "year",
    );

    const weekNumber = readOptionalPositiveIntegerFromSearchParams(
      url.searchParams,
      "weekNumber",
    );

    const truckId = normalizeOptionalString(
      url.searchParams.get("truckId"),
    );

    const reports = await prisma.weeklyTruckRevenueReport.findMany({
      where: {
        ...(year !== null ? { year } : {}),
        ...(weekNumber !== null ? { weekNumber } : {}),
        ...(truckId !== null ? { truckId } : {}),
      },
      include: buildWeeklyReportInclude(),
      orderBy: [
        {
          year: "desc",
        },
        {
          weekNumber: "desc",
        },
        {
          truckNameAtReport: "asc",
        },
      ],
      take: year === null && weekNumber === null ? 50 : undefined,
    });

    return NextResponse.json({
      reports: serializeForJson(
        reports.map((report) =>
          buildWeeklyReportResponse(
            report as WeeklyReportForResponse,
          ),
        ),
      ),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/weekly-truck-revenue-reports
 *
 * Body:
 * {
 *   "year": 2026,
 *   "weekNumber": 30,
 *   "truckId": "...",
 *   "forceRefresh": false
 * }
 *
 * Генерира или обновява седмичен приходен отчет за един камион.
 * Разходи не се записват и не се показват тук.
 */
export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);

    const year = readRequiredPositiveInteger(body.year, "year");
    const weekNumber = readRequiredIsoWeekNumber(
      body.weekNumber,
      "weekNumber",
    );
    const truckId = readRequiredString(body.truckId, "truckId");
    const forceRefresh = readBooleanWithDefault(
      body.forceRefresh,
      false,
      "forceRefresh",
    );

    const report = await prisma.$transaction(async (transaction) => {
      return generateWeeklyTruckRevenueReport(transaction, {
        year,
        weekNumber,
        truckId,
        forceRefresh,
      });
    });

    return NextResponse.json({
      report: serializeForJson(
        buildWeeklyReportResponse(
          report as WeeklyReportForResponse,
        ),
      ),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/weekly-truck-revenue-reports
 *
 * Body:
 * {
 *   "id": "...",
 *   "isLocked": true
 * }
 */
export async function PATCH(request: Request) {
  try {
    const body = await readJsonObject(request);

    const reportId = readRequiredString(body.id, "id");

    if (!hasOwn(body, "isLocked")) {
      throw new ApiValidationError(
        "Липсва isLocked за обновяване на отчета.",
      );
    }

    const isLocked = readBooleanWithDefault(
      body.isLocked,
      false,
      "isLocked",
    );

    const report =
      await prisma.weeklyTruckRevenueReport.update({
        where: {
          id: reportId,
        },
        data: {
          isLocked,
        },
        include: buildWeeklyReportInclude(),
      });

    return NextResponse.json({
      report: serializeForJson(
        buildWeeklyReportResponse(
          report as WeeklyReportForResponse,
        ),
      ),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

async function generateWeeklyTruckRevenueReport(
  transaction: Prisma.TransactionClient,
  {
    year,
    weekNumber,
    truckId,
    forceRefresh,
  }: {
    year: number;
    weekNumber: number;
    truckId: string;
    forceRefresh: boolean;
  },
) {
  const weekRange = getIsoWeekDateRange(year, weekNumber);

  const truck = await transaction.truck.findUnique({
    where: {
      id: truckId,
    },
    select: {
      id: true,
      name: true,
      licensePlate: true,
    },
  });

  if (!truck) {
    throw new ApiValidationError(
      "Камионът за седмичния отчет не е намерен.",
    );
  }

  const existingReport =
    await transaction.weeklyTruckRevenueReport.findFirst({
      where: {
        year,
        weekNumber,
        truckId,
      },
      select: {
        id: true,
        isLocked: true,
      },
    });

  if (existingReport?.isLocked && !forceRefresh) {
    return transaction.weeklyTruckRevenueReport.findUniqueOrThrow({
      where: {
        id: existingReport.id,
      },
      include: buildWeeklyReportInclude(),
    });
  }

  const courses = await findCoursesForTruckWeek(transaction, {
    truckId,
    weekStartDate: weekRange.weekStartDate,
    nextWeekStartDate: weekRange.nextWeekStartDate,
  });

  const courseSnapshots = courses.map((course) =>
    buildWeeklyReportCourseSnapshot(course),
  );

  const totalRevenue = roundMoney(
    courseSnapshots.reduce(
      (sum, course) => sum + course.totalRevenue,
      0,
    ),
  );

  if (existingReport) {
    await transaction.weeklyTruckRevenueReportCourse.deleteMany({
      where: {
        reportId: existingReport.id,
      },
    });

    await transaction.weeklyTruckRevenueReport.update({
      where: {
        id: existingReport.id,
      },
      data: {
        weekStartDate: weekRange.weekStartDate,
        weekEndDate: weekRange.weekEndDate,
        truckNameAtReport: truck.name,
        truckLicensePlateAtReport: truck.licensePlate,
        courseCount: courseSnapshots.length,
        totalRevenue,
        generatedAt: new Date(),
      },
    });

    await createWeeklyReportCourseSnapshots(
      transaction,
      existingReport.id,
      courseSnapshots,
    );

    return transaction.weeklyTruckRevenueReport.findUniqueOrThrow({
      where: {
        id: existingReport.id,
      },
      include: buildWeeklyReportInclude(),
    });
  }

  const createdReport =
    await transaction.weeklyTruckRevenueReport.create({
      data: {
        year,
        weekNumber,
        weekStartDate: weekRange.weekStartDate,
        weekEndDate: weekRange.weekEndDate,
        truckId,
        truckNameAtReport: truck.name,
        truckLicensePlateAtReport: truck.licensePlate,
        courseCount: courseSnapshots.length,
        totalRevenue,
        generatedAt: new Date(),
      },
      select: {
        id: true,
      },
    });

  await createWeeklyReportCourseSnapshots(
    transaction,
    createdReport.id,
    courseSnapshots,
  );

  return transaction.weeklyTruckRevenueReport.findUniqueOrThrow({
    where: {
      id: createdReport.id,
    },
    include: buildWeeklyReportInclude(),
  });
}

async function findCoursesForTruckWeek(
  transaction: Prisma.TransactionClient,
  {
    truckId,
    weekStartDate,
    nextWeekStartDate,
  }: {
    truckId: string;
    weekStartDate: Date;
    nextWeekStartDate: Date;
  },
): Promise<CourseForWeeklyReport[]> {
  return transaction.course.findMany({
    where: {
      truckId,
      status: {
        not: "CANCELLED",
      },
      OR: [
        {
          plannedDate: {
            gte: weekStartDate,
            lt: nextWeekStartDate,
          },
        },
        {
          plannedDate: null,
          createdAt: {
            gte: weekStartDate,
            lt: nextWeekStartDate,
          },
        },
      ],
    },
    select: {
      id: true,
      plannedDate: true,
      createdAt: true,
      courseType: true,
      containerNumber: true,
      agreedPrice: true,
      waitingAmount: true,
      settlementAmount: true,
      settlementStatus: true,
      settlementReference: true,
      settlementNotes: true,
      customer: {
        select: {
          name: true,
        },
      },
      customerTariff: {
        select: {
          name: true,
        },
      },
      tariffNameAtBooking: true,
      pickupAddress: {
        select: {
          name: true,
          street: true,
          city: true,
          postalCode: true,
          country: true,
        },
      },
      deliveryAddress: {
        select: {
          name: true,
          street: true,
          city: true,
          postalCode: true,
          country: true,
        },
      },
      stops: {
        select: {
          sequence: true,
          label: true,
          address: {
            select: {
              name: true,
              street: true,
              city: true,
              postalCode: true,
              country: true,
            },
          },
        },
        orderBy: {
          sequence: "asc",
        },
      },
    },
    orderBy: [
      {
        plannedDate: "asc",
      },
      {
        createdAt: "asc",
      },
    ],
  });
}

async function createWeeklyReportCourseSnapshots(
  transaction: Prisma.TransactionClient,
  reportId: string,
  courseSnapshots: readonly WeeklyReportCourseSnapshot[],
): Promise<void> {
  if (courseSnapshots.length === 0) {
    return;
  }

  await transaction.weeklyTruckRevenueReportCourse.createMany({
    data: courseSnapshots.map((course) => ({
      reportId,
      courseId: course.courseId,
      courseDate: course.courseDate,
      customerNameAtReport: course.customerNameAtReport,
      courseTypeAtReport: course.courseTypeAtReport,
      containerNumber: course.containerNumber,
      routeLabel: course.routeLabel,
      tariffNameAtBooking: course.tariffNameAtBooking,
      agreedPrice: course.agreedPrice,
      waitingAmount: course.waitingAmount,
      totalRevenue: course.totalRevenue,
    })),
  });
}

function buildWeeklyReportCourseSnapshot(
  course: CourseForWeeklyReport,
): WeeklyReportCourseSnapshot {
  const agreedPrice = toNumber(course.agreedPrice);
  const waitingAmount = toNumber(course.waitingAmount);
  const expectedRevenue = roundMoney(
    agreedPrice + waitingAmount,
  );
  const settlementAmount =
    toNullableNumber(course.settlementAmount);

  return {
    courseId: course.id,
    courseDate: course.plannedDate ?? course.createdAt,
    customerNameAtReport: course.customer.name,
    courseTypeAtReport: course.courseType,
    containerNumber: normalizeOptionalString(
      course.containerNumber,
    ),
    routeLabel: buildRouteLabel(course),
    tariffNameAtBooking:
      normalizeOptionalString(course.tariffNameAtBooking) ??
      normalizeOptionalString(course.customerTariff?.name),
    agreedPrice: roundMoney(agreedPrice),
    waitingAmount: roundMoney(waitingAmount),
    totalRevenue: settlementAmount ?? expectedRevenue,
  };
}

function buildWeeklyReportResponse(
  report: WeeklyReportForResponse,
) {
  const courses = report.courses.map(
    buildWeeklyReportCourseResponse,
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

  const settlementDifference = roundMoney(
    totalRevenue - expectedRevenue,
  );

  const settlementCheckedCount =
    courses.filter(
      (course) =>
        course.settlementAmount !== null,
    ).length;

  const notCheckedCount =
    courses.length - settlementCheckedCount;

  const underpaidCount = courses.filter(
    (course) =>
      course.settlementStatus === "UNDERPAID",
  ).length;

  return {
    id: report.id,
    year: report.year,
    weekNumber: report.weekNumber,
    weekStartDate: report.weekStartDate,
    weekEndDate: report.weekEndDate,
    truckId: report.truckId,
    truckNameAtReport: report.truckNameAtReport,
    truckLicensePlateAtReport:
      report.truckLicensePlateAtReport,
    courseCount: report.courseCount,
    expectedRevenue,
    settlementAmount,
    settlementDifference,
    settlementCheckedCount,
    notCheckedCount,
    underpaidCount,
    totalRevenue,
    generatedAt: report.generatedAt,
    isLocked: report.isLocked,
    courses,
  };
}

function buildWeeklyReportCourseResponse(
  course: WeeklyReportCourseForResponse,
) {
  const agreedPrice = roundMoney(
    toNumber(course.agreedPrice),
  );

  const waitingAmount = roundMoney(
    toNumber(course.waitingAmount),
  );

  const expectedRevenue = roundMoney(
    agreedPrice + waitingAmount,
  );

  const settlementAmount =
    toNullableNumber(
      course.course?.settlementAmount,
    );

  const settlementDifference =
    settlementAmount === null
      ? null
      : roundMoney(
          settlementAmount - expectedRevenue,
        );

  const totalRevenue =
    settlementAmount ?? expectedRevenue;

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
    courseId: course.courseId,
    courseDate: course.courseDate,
    customerNameAtReport:
      course.customerNameAtReport,
    courseTypeAtReport:
      course.courseTypeAtReport,
    containerNumber:
      course.containerNumber,
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
      course.course?.settlementReference ??
      null,
    settlementNotes:
      course.course?.settlementNotes ?? null,
    totalRevenue,
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

function buildRouteLabel(course: CourseForWeeklyReport): string {
  const stopLabels = course.stops
    .map((stop) =>
      normalizeOptionalString(stop.label) ??
      formatAddressForRouteLabel(stop.address),
    )
    .filter((label): label is string => Boolean(label));

  if (stopLabels.length > 0) {
    return stopLabels.join(" → ");
  }

  const pickupLabel = formatAddressForRouteLabel(
    course.pickupAddress,
  );

  const deliveryLabel = formatAddressForRouteLabel(
    course.deliveryAddress,
  );

  const fallbackLabels = [
    pickupLabel,
    deliveryLabel,
  ].filter((label): label is string => Boolean(label));

  if (fallbackLabels.length > 0) {
    return fallbackLabels.join(" → ");
  }

  return "Маршрут без адреси";
}

function formatAddressForRouteLabel(
  address: AddressForRouteLabel | null,
): string | null {
  if (!address) {
    return null;
  }

  const cityLine = [
    address.postalCode,
    address.city,
  ]
    .filter(Boolean)
    .join(" ");

  const parts = [
    address.name,
    address.street,
    cityLine,
    address.country,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(", ") : null;
}

function buildWeeklyReportInclude() {
  return {
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
          courseDate: "asc" as const,
        },
        {
          createdAt: "asc" as const,
        },
      ],
    },
  };
}

function getIsoWeekDateRange(
  year: number,
  weekNumber: number,
): {
  weekStartDate: Date;
  weekEndDate: Date;
  nextWeekStartDate: Date;
} {
  const weekStartDate = getIsoWeekStartDate(year, weekNumber);
  const nextWeekStartDate = addUtcDays(weekStartDate, 7);
  const weekEndDate = new Date(
    nextWeekStartDate.getTime() - 1,
  );

  return {
    weekStartDate,
    weekEndDate,
    nextWeekStartDate,
  };
}

function getIsoWeekStartDate(
  year: number,
  weekNumber: number,
): Date {
  const januaryFourth = new Date(
    Date.UTC(year, 0, 4, 0, 0, 0, 0),
  );

  const januaryFourthDay = januaryFourth.getUTCDay() || 7;

  const firstMonday = addUtcDays(
    januaryFourth,
    1 - januaryFourthDay,
  );

  return addUtcDays(firstMonday, (weekNumber - 1) * 7);
}

function addUtcDays(date: Date, days: number): Date {
  const nextDate = new Date(date.getTime());
  nextDate.setUTCDate(nextDate.getUTCDate() + days);

  return nextDate;
}

function readOptionalPositiveIntegerFromSearchParams(
  searchParams: URLSearchParams,
  fieldName: string,
): number | null {
  const value = normalizeOptionalString(
    searchParams.get(fieldName),
  );

  if (!value) {
    return null;
  }

  return readRequiredPositiveInteger(value, fieldName);
}

async function readJsonObject(
  request: Request,
): Promise<JsonObject> {
  let value: unknown;

  try {
    value = await request.json();
  } catch {
    throw new ApiValidationError(
      "Невалиден или липсващ JSON body.",
    );
  }

  return readJsonObjectValue(value, "JSON body");
}

function readJsonObjectValue(
  value: unknown,
  fieldName: string,
): JsonObject {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    throw new ApiValidationError(
      `${fieldName} трябва да бъде обект.`,
    );
  }

  return value as JsonObject;
}

function readRequiredString(
  value: unknown,
  fieldName: string,
): string {
  if (typeof value !== "string") {
    throw new ApiValidationError(
      `${fieldName} трябва да бъде текст.`,
    );
  }

  const normalizedValue = value.trim();

  if (normalizedValue === "") {
    throw new ApiValidationError(
      `${fieldName} не може да бъде празно.`,
    );
  }

  return normalizedValue;
}

function normalizeOptionalString(
  value: unknown,
): string | null {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim();

  return normalizedValue === "" ? null : normalizedValue;
}

function readRequiredPositiveInteger(
  value: unknown,
  fieldName: string,
): number {
  const parsedValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  if (
    !Number.isInteger(parsedValue) ||
    parsedValue < 1
  ) {
    throw new ApiValidationError(
      `${fieldName} трябва да бъде положително цяло число.`,
    );
  }

  return parsedValue;
}

function readRequiredIsoWeekNumber(
  value: unknown,
  fieldName: string,
): number {
  const weekNumber = readRequiredPositiveInteger(
    value,
    fieldName,
  );

  if (weekNumber > 53) {
    throw new ApiValidationError(
      `${fieldName} трябва да бъде между 1 и 53.`,
    );
  }

  return weekNumber;
}

function readBooleanWithDefault(
  value: unknown,
  defaultValue: boolean,
  fieldName: string,
): boolean {
  if (value === null || value === undefined) {
    return defaultValue;
  }

  if (typeof value !== "boolean") {
    throw new ApiValidationError(
      `${fieldName} трябва да бъде true или false.`,
    );
  }

  return value;
}

function hasOwn(
  object: object,
  property: PropertyKey,
): boolean {
  return Object.prototype.hasOwnProperty.call(object, property);
}

function toNumber(value: unknown): number {
  if (
    value === null ||
    value === undefined
  ) {
    return 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsedValue = Number(value);

    return Number.isFinite(parsedValue)
      ? parsedValue
      : 0;
  }

  if (
    typeof value === "object" &&
    "toNumber" in value &&
    typeof value.toNumber === "function"
  ) {
    const parsedValue = value.toNumber();

    return Number.isFinite(parsedValue)
      ? parsedValue
      : 0;
  }

  const parsedValue = Number(value);

  return Number.isFinite(parsedValue)
    ? parsedValue
    : 0;
}

function toNullableNumber(value: unknown): number | null {
  if (
    value === null ||
    value === undefined
  ) {
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

function serializeForJson(value: unknown): unknown {
  if (
    value === null ||
    value === undefined ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => serializeForJson(item));
  }

  if (typeof value === "object") {
    const possibleDecimal = value as {
      toNumber?: () => number;
      toFixed?: (decimalPlaces?: number) => string;
    };

    if (
      typeof possibleDecimal.toNumber === "function" &&
      typeof possibleDecimal.toFixed === "function"
    ) {
      return possibleDecimal.toNumber();
    }

    const serializedObject: Record<string, unknown> = {};

    for (const [key, nestedValue] of Object.entries(
      value as Record<string, unknown>,
    )) {
      serializedObject[key] = serializeForJson(nestedValue);
    }

    return serializedObject;
  }

  return String(value);
}

async function readReportById(reportId: string) {
  return prisma.weeklyTruckRevenueReport.findUnique({
    where: {
      id: reportId,
    },
    include: buildWeeklyReportInclude(),
  });
}

function handleApiError(error: unknown) {
  if (error instanceof ApiValidationError) {
    return errorResponse(error.message, 400);
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002":
        return errorResponse(
          "Вече съществува седмичен отчет със същата седмица и камион.",
          409,
        );

      case "P2003":
        return errorResponse(
          "Посочен камион, курс или отчет не съществува.",
          409,
        );

      case "P2025":
        return errorResponse(
          "Седмичният отчет не е намерен.",
          404,
        );

      default:
        console.error("Prisma weekly reports API error:", error);

        return errorResponse(
          "Възникна грешка при работа с базата.",
          500,
        );
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    console.error("Prisma validation error:", error);

    return errorResponse(
      "Подадените данни не са валидни за седмичен отчет.",
      400,
    );
  }

  console.error("Unexpected weekly reports API error:", error);

  return errorResponse(
    "Възникна неочаквана сървърна грешка.",
    500,
  );
}

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    {
      error: message,
    },
    {
      status,
    },
  );
}

class ApiValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiValidationError";
  }
}