import { NextResponse } from "next/server";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COURSE_STATUSES = [
  "DRAFT",
  "PLANNED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "INVOICED",
] as const;

type CourseStatusValue =
  (typeof COURSE_STATUSES)[number];

type JsonObject = Record<string, unknown>;

type CourseWriteData = {
  courseNumber?: string | null;
  customerId?: string;
  truckId?: string | null;
  driverId?: string | null;

  pickupAddressId?: string | null;
  deliveryAddressId?: string | null;

  status?: CourseStatusValue;

  plannedDate?: Date | null;
  startedAt?: Date | null;
  completedAt?: Date | null;

  containerNumber?: string | null;
  bookingNumber?: string | null;
  referenceNumber?: string | null;
  tarCode?: string | null;
  acceptanceRef?: string | null;

  totalKm?: number | null;
  billableKm?: number | null;
  nonBillableKm?: number | null;

  kmSource?: string | null;
  manualKmOverride?: boolean;
  kmOverrideNotes?: string | null;

  agreedPrice?: number | null;
  waitingHours?: number | null;
  waitingAmount?: number | null;
  portFeeAmount?: number | null;

  notes?: string | null;
};

const COURSE_INCLUDE = {
  customer: {
    select: {
      id: true,
      name: true,
      status: true,
      billableKmLogic: true,
    },
  },

  truck: {
    select: {
      id: true,
      name: true,
      licensePlate: true,
      status: true,
      defaultFuelConsumptionLPer100Km: true,
    },
  },

  driver: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      status: true,
    },
  },

  pickupAddress: true,
  deliveryAddress: true,

  routeLegs: {
    orderBy: {
      sequence: "asc",
    },
  },

  costs: {
    orderBy: {
      costDate: "asc",
    },
  },
} as const;

/**
 * GET /api/courses
 * GET /api/courses?id=COURSE_ID
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const courseId = normalizeOptionalString(
      url.searchParams.get("id"),
    );

    if (courseId) {
      const course = await prisma.course.findUnique({
        where: {
          id: courseId,
        },
        include: COURSE_INCLUDE,
      });

      if (!course) {
        return errorResponse(
          "Курсът не е намерен.",
          404,
        );
      }

      return NextResponse.json({
        course: serializeForJson(course),
      });
    }

    const courses = await prisma.course.findMany({
      include: COURSE_INCLUDE,
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      courses: serializeForJson(courses),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/courses
 *
 * Създава нов курс.
 */
export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);

    const data = buildCourseWriteData({
      body,
      requireCustomerId: true,
    });

    const course = await prisma.course.create({
      data:
        data as Prisma.CourseUncheckedCreateInput,
      include: COURSE_INCLUDE,
    });

    return NextResponse.json(
      {
        course: serializeForJson(course),
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/courses
 *
 * Обновява само подадените полета.
 * Body трябва да съдържа id.
 */
export async function PATCH(request: Request) {
  return updateCourse(request);
}

/**
 * PUT /api/courses
 *
 * Във v1 използва същата update логика като PATCH.
 * Body трябва да съдържа id.
 */
export async function PUT(request: Request) {
  return updateCourse(request);
}

/**
 * DELETE /api/courses?id=COURSE_ID
 *
 * Може да се използва и JSON body:
 * {
 *   "id": "COURSE_ID"
 * }
 */
export async function DELETE(request: Request) {
  try {
    const courseId = await readDeleteCourseId(
      request,
    );

    if (!courseId) {
      throw new ApiValidationError(
        "Липсва id на курса за изтриване.",
      );
    }

    const deletedCourse =
      await prisma.course.delete({
        where: {
          id: courseId,
        },
      });

    return NextResponse.json({
      deleted: true,
      id: deletedCourse.id,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

async function updateCourse(request: Request) {
  try {
    const body = await readJsonObject(request);

    const courseId = readRequiredString(
      body.id,
      "id",
    );

    const data = buildCourseWriteData({
      body,
      requireCustomerId: false,
    });

    if (Object.keys(data).length === 0) {
      throw new ApiValidationError(
        "Няма подадени полета за обновяване.",
      );
    }

    const course = await prisma.course.update({
      where: {
        id: courseId,
      },

      data:
        data as Prisma.CourseUncheckedUpdateInput,

      include: COURSE_INCLUDE,
    });

    return NextResponse.json({
      course: serializeForJson(course),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

function buildCourseWriteData({
  body,
  requireCustomerId,
}: {
  body: JsonObject;
  requireCustomerId: boolean;
}): CourseWriteData {
  const data: CourseWriteData = {};

  setNullableStringField(
    data,
    body,
    "courseNumber",
  );

  if (requireCustomerId) {
    data.customerId = readRequiredString(
      body.customerId,
      "customerId",
    );
  } else if (hasOwn(body, "customerId")) {
    data.customerId = readRequiredString(
      body.customerId,
      "customerId",
    );
  }

  setNullableStringField(
    data,
    body,
    "truckId",
  );

  setNullableStringField(
    data,
    body,
    "driverId",
  );

  setNullableStringField(
    data,
    body,
    "pickupAddressId",
  );

  setNullableStringField(
    data,
    body,
    "deliveryAddressId",
  );

  setStatusField(data, body);

  setNullableDateField(
    data,
    body,
    "plannedDate",
  );

  setNullableDateField(
    data,
    body,
    "startedAt",
  );

  setNullableDateField(
    data,
    body,
    "completedAt",
  );

  setNullableStringField(
    data,
    body,
    "containerNumber",
  );

  setNullableStringField(
    data,
    body,
    "bookingNumber",
  );

  setNullableStringField(
    data,
    body,
    "referenceNumber",
  );

  setNullableStringField(
    data,
    body,
    "tarCode",
  );

  setNullableStringField(
    data,
    body,
    "acceptanceRef",
  );

  setNullableNumberField(
    data,
    body,
    "totalKm",
  );

  setNullableNumberField(
    data,
    body,
    "billableKm",
  );

  setNullableNumberField(
    data,
    body,
    "nonBillableKm",
  );

  setNullableStringField(
    data,
    body,
    "kmSource",
  );

  setBooleanField(
    data,
    body,
    "manualKmOverride",
  );

  setNullableStringField(
    data,
    body,
    "kmOverrideNotes",
  );

  setNullableNumberField(
    data,
    body,
    "agreedPrice",
  );

  setNullableNumberField(
    data,
    body,
    "waitingHours",
  );

  setNullableNumberField(
    data,
    body,
    "waitingAmount",
  );

  setNullableNumberField(
    data,
    body,
    "portFeeAmount",
  );

  setNullableStringField(
    data,
    body,
    "notes",
  );

  return data;
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

  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    throw new ApiValidationError(
      "JSON body трябва да бъде обект.",
    );
  }

  return value as JsonObject;
}

async function readDeleteCourseId(
  request: Request,
): Promise<string | null> {
  const url = new URL(request.url);

  const queryId = normalizeOptionalString(
    url.searchParams.get("id"),
  );

  if (queryId) {
    return queryId;
  }

  try {
    const body = await readJsonObject(request);

    return normalizeOptionalString(body.id);
  } catch {
    return null;
  }
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
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim();

  return normalizedValue === ""
    ? null
    : normalizedValue;
}

function setNullableStringField(
  data: CourseWriteData,
  body: JsonObject,
  fieldName: keyof CourseWriteData,
): void {
  if (!hasOwn(body, fieldName)) {
    return;
  }

  const value = body[fieldName];

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    Object.assign(data, {
      [fieldName]: null,
    });

    return;
  }

  if (typeof value !== "string") {
    throw new ApiValidationError(
      `${String(fieldName)} трябва да бъде текст или null.`,
    );
  }

  const normalizedValue = value.trim();

  Object.assign(data, {
    [fieldName]:
      normalizedValue === ""
        ? null
        : normalizedValue,
  });
}

function setNullableNumberField(
  data: CourseWriteData,
  body: JsonObject,
  fieldName: keyof CourseWriteData,
): void {
  if (!hasOwn(body, fieldName)) {
    return;
  }

  const value = body[fieldName];

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    Object.assign(data, {
      [fieldName]: null,
    });

    return;
  }

  const parsedValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(parsedValue)) {
    throw new ApiValidationError(
      `${String(fieldName)} трябва да бъде валидно число.`,
    );
  }

  if (parsedValue < 0) {
    throw new ApiValidationError(
      `${String(fieldName)} не може да бъде отрицателно.`,
    );
  }

  Object.assign(data, {
    [fieldName]: parsedValue,
  });
}

function setNullableDateField(
  data: CourseWriteData,
  body: JsonObject,
  fieldName:
    | "plannedDate"
    | "startedAt"
    | "completedAt",
): void {
  if (!hasOwn(body, fieldName)) {
    return;
  }

  const value = body[fieldName];

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    Object.assign(data, {
      [fieldName]: null,
    });

    return;
  }

  if (typeof value !== "string") {
    throw new ApiValidationError(
      `${fieldName} трябва да бъде ISO дата или null.`,
    );
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new ApiValidationError(
      `${fieldName} съдържа невалидна дата.`,
    );
  }

  Object.assign(data, {
    [fieldName]: parsedDate,
  });
}

function setBooleanField(
  data: CourseWriteData,
  body: JsonObject,
  fieldName: "manualKmOverride",
): void {
  if (!hasOwn(body, fieldName)) {
    return;
  }

  const value = body[fieldName];

  if (typeof value !== "boolean") {
    throw new ApiValidationError(
      `${fieldName} трябва да бъде true или false.`,
    );
  }

  data[fieldName] = value;
}

function setStatusField(
  data: CourseWriteData,
  body: JsonObject,
): void {
  if (!hasOwn(body, "status")) {
    return;
  }

  const value = body.status;

  if (
    typeof value !== "string" ||
    !isCourseStatus(value)
  ) {
    throw new ApiValidationError(
      `status трябва да бъде една от стойностите: ${COURSE_STATUSES.join(", ")}.`,
    );
  }

  data.status = value;
}

function isCourseStatus(
  value: string,
): value is CourseStatusValue {
  return (
    COURSE_STATUSES as readonly string[]
  ).includes(value);
}

function hasOwn(
  object: JsonObject,
  property: PropertyKey,
): boolean {
  return Object.prototype.hasOwnProperty.call(
    object,
    property,
  );
}

function serializeForJson(
  value: unknown,
): unknown {
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
    return value.map((item) =>
      serializeForJson(item),
    );
  }

  if (typeof value === "object") {
    const possibleDecimal = value as {
      toNumber?: () => number;
      toFixed?: (
        decimalPlaces?: number,
      ) => string;
    };

    if (
      typeof possibleDecimal.toNumber ===
        "function" &&
      typeof possibleDecimal.toFixed ===
        "function"
    ) {
      return possibleDecimal.toNumber();
    }

    const serializedObject: Record<
      string,
      unknown
    > = {};

    for (const [key, nestedValue] of Object.entries(
      value as Record<string, unknown>,
    )) {
      serializedObject[key] =
        serializeForJson(nestedValue);
    }

    return serializedObject;
  }

  return String(value);
}

function handleApiError(error: unknown) {
  if (error instanceof ApiValidationError) {
    return errorResponse(error.message, 400);
  }

  if (
    error instanceof
    Prisma.PrismaClientKnownRequestError
  ) {
    switch (error.code) {
      case "P2002":
        return errorResponse(
          "Вече съществува запис със същата уникална стойност.",
          409,
        );

      case "P2003":
        return errorResponse(
          "Посочен клиент, камион, шофьор или адрес не съществува, или курсът има свързани записи.",
          409,
        );

      case "P2025":
        return errorResponse(
          "Курсът не е намерен.",
          404,
        );

      default:
        console.error(
          "Prisma courses API error:",
          error,
        );

        return errorResponse(
          "Възникна грешка при работа с базата.",
          500,
        );
    }
  }

  if (
    error instanceof
    Prisma.PrismaClientValidationError
  ) {
    console.error(
      "Prisma validation error:",
      error,
    );

    return errorResponse(
      "Подадените данни не са валидни за курс.",
      400,
    );
  }

  console.error(
    "Unexpected courses API error:",
    error,
  );

  return errorResponse(
    "Възникна неочаквана сървърна грешка.",
    500,
  );
}

function errorResponse(
  message: string,
  status: number,
) {
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