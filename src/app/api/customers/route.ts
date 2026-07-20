import { NextResponse } from "next/server";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CUSTOMER_STATUSES = ["ACTIVE", "INACTIVE"] as const;

const CUSTOMER_BILLABLE_KM_LOGICS = [
  "TOTAL_ROUTE",
  "ONE_WAY",
  "SELECTED_LEGS",
  "FIXED_PRICE",
  "MANUAL",
] as const;

type CustomerStatusValue =
  (typeof CUSTOMER_STATUSES)[number];

type CustomerBillableKmLogicValue =
  (typeof CUSTOMER_BILLABLE_KM_LOGICS)[number];

type JsonObject = Record<string, unknown>;

type CustomerWriteData = {
  name: string;
  email?: string | null;
  phone?: string | null;
  vatNumber?: string | null;
  status?: CustomerStatusValue;
  billableKmLogic?: CustomerBillableKmLogicValue;
  notes?: string | null;
};

const CUSTOMER_INCLUDE: Prisma.CustomerInclude = {
  tariffs: {
    orderBy: [
      {
        isActive: "desc",
      },
      {
        minKm: "asc",
      },
      {
        maxKm: "asc",
      },
      {
        type: "asc",
      },
      {
        name: "asc",
      },
    ],
  },
  _count: {
    select: {
      addresses: true,
      courses: true,
      invoices: true,
    },
  },
};

/**
 * GET /api/customers
 *
 * Връща всички клиенти. Ползва се основно за бъдещи client-side
 * нужди. Страницата /customers в момента чете директно през Prisma.
 */
export async function GET() {
  try {
    const customers = await prisma.customer.findMany({
      include: CUSTOMER_INCLUDE,
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({
      customers: serializeForJson(customers),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/customers
 *
 * Създава нов клиент без тарифни правила.
 * Тарифите ще се управляват в отделна следваща стъпка.
 */
export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    const customerData = buildCustomerWriteData(body);

    const customer = await prisma.customer.create({
      data: customerData,
      include: CUSTOMER_INCLUDE,
    });

    return NextResponse.json(
      {
        customer: serializeForJson(customer),
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    return handleApiError(error);
  }
}

function buildCustomerWriteData(
  body: JsonObject,
): CustomerWriteData {
  const data: CustomerWriteData = {
    name: readRequiredString(body.name, "name"),
  };

  setNullableStringField(data, body, "email");
  setNullableStringField(data, body, "phone");
  setNullableStringField(data, body, "vatNumber");
  setNullableStringField(data, body, "notes");
  setStatusField(data, body);
  setBillableKmLogicField(data, body);

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

function readNullableString(
  value: unknown,
  fieldName: string,
): string | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  if (typeof value !== "string") {
    throw new ApiValidationError(
      `${fieldName} трябва да бъде текст или null.`,
    );
  }

  const normalizedValue = value.trim();

  return normalizedValue === "" ? null : normalizedValue;
}

function setNullableStringField(
  data: CustomerWriteData,
  body: JsonObject,
  fieldName: "email" | "phone" | "vatNumber" | "notes",
): void {
  if (!hasOwn(body, fieldName)) {
    return;
  }

  data[fieldName] = readNullableString(
    body[fieldName],
    fieldName,
  );
}

function setStatusField(
  data: CustomerWriteData,
  body: JsonObject,
): void {
  if (!hasOwn(body, "status")) {
    return;
  }

  const value = body.status;

  if (
    typeof value !== "string" ||
    !isCustomerStatus(value)
  ) {
    throw new ApiValidationError(
      `status трябва да бъде една от стойностите: ${CUSTOMER_STATUSES.join(", ")}.`,
    );
  }

  data.status = value;
}

function setBillableKmLogicField(
  data: CustomerWriteData,
  body: JsonObject,
): void {
  if (!hasOwn(body, "billableKmLogic")) {
    return;
  }

  const value = body.billableKmLogic;

  if (
    typeof value !== "string" ||
    !isCustomerBillableKmLogic(value)
  ) {
    throw new ApiValidationError(
      `billableKmLogic трябва да бъде една от стойностите: ${CUSTOMER_BILLABLE_KM_LOGICS.join(", ")}.`,
    );
  }

  data.billableKmLogic = value;
}

function isCustomerStatus(
  value: string,
): value is CustomerStatusValue {
  return (CUSTOMER_STATUSES as readonly string[]).includes(value);
}

function isCustomerBillableKmLogic(
  value: string,
): value is CustomerBillableKmLogicValue {
  return (
    CUSTOMER_BILLABLE_KM_LOGICS as readonly string[]
  ).includes(value);
}

function hasOwn(
  object: JsonObject,
  property: PropertyKey,
): boolean {
  return Object.prototype.hasOwnProperty.call(object, property);
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

function handleApiError(error: unknown) {
  if (error instanceof ApiValidationError) {
    return errorResponse(error.message, 400);
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002":
        return errorResponse(
          "Вече съществува клиент със същото име.",
          409,
        );

      default:
        console.error("Prisma customers API error:", error);

        return errorResponse(
          "Възникна грешка при работа с базата.",
          500,
        );
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    console.error("Prisma validation error:", error);

    return errorResponse(
      "Подадените данни не са валидни за клиент.",
      400,
    );
  }

  console.error("Unexpected customers API error:", error);

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