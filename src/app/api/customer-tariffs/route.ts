import { NextResponse } from "next/server";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CUSTOMER_BILLABLE_KM_LOGICS = [
  "TOTAL_ROUTE",
  "ONE_WAY",
  "SELECTED_LEGS",
  "FIXED_PRICE",
  "MANUAL",
] as const;

const TARIFF_TYPES = [
  "FIXED_TABLE_UPPER_BOUND",
  "DISTANCE_TABLE",
  "PRICE_PER_KM",
  "FIXED_PRICE",
  "SHUNT",
  "WAITING_TIME",
  "MANUAL",
] as const;

type CustomerBillableKmLogicValue =
  (typeof CUSTOMER_BILLABLE_KM_LOGICS)[number];

type TariffTypeValue = (typeof TARIFF_TYPES)[number];

type JsonObject = Record<string, unknown>;

type CustomerTariffWriteData = {
  customerId: string;
  type: TariffTypeValue;
  billableKmLogic: CustomerBillableKmLogicValue;
  name: string;
  minKm?: number | null;
  maxKm?: number | null;
  fixedPrice?: number | null;
  pricePerKm?: number | null;
  waitingHourlyRate?: number | null;
  portFeeIncluded?: boolean;
  isActive?: boolean;
  notes?: string | null;
};

/**
 * GET /api/customer-tariffs
 * GET /api/customer-tariffs?customerId=CUSTOMER_ID
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const customerId = normalizeOptionalString(
      url.searchParams.get("customerId"),
    );

    const tariffs = await prisma.customerTariff.findMany({
      where: customerId
        ? {
            customerId,
          }
        : undefined,
      orderBy: [
        {
          customer: {
            name: "asc",
          },
        },
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
      include: {
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      tariffs: serializeForJson(tariffs),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/customer-tariffs
 *
 * Създава ново тарифно правило към клиент.
 */
export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    const tariffData = buildCustomerTariffWriteData(body);

    await validateCustomerExists(tariffData.customerId);

    const tariff = await prisma.customerTariff.create({
      data: tariffData,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        tariff: serializeForJson(tariff),
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    return handleApiError(error);
  }
}

async function validateCustomerExists(
  customerId: string,
): Promise<void> {
  const customer = await prisma.customer.findUnique({
    where: {
      id: customerId,
    },
    select: {
      id: true,
    },
  });

  if (!customer) {
    throw new ApiValidationError(
      "Клиентът за тарифата не е намерен.",
    );
  }
}

function buildCustomerTariffWriteData(
  body: JsonObject,
): CustomerTariffWriteData {
  const minKm = readNullableNonNegativeNumber(body.minKm, "minKm");
  const maxKm = readNullableNonNegativeNumber(body.maxKm, "maxKm");

  if (
    minKm !== null &&
    maxKm !== null &&
    minKm > maxKm
  ) {
    throw new ApiValidationError(
      "minKm не може да бъде по-голямо от maxKm.",
    );
  }

  const type = readTariffType(body.type, "type");

  const data: CustomerTariffWriteData = {
    customerId: readRequiredString(body.customerId, "customerId"),
    type,
    billableKmLogic: readCustomerBillableKmLogic(
      body.billableKmLogic,
      "billableKmLogic",
    ),
    name: readRequiredString(body.name, "name"),
    minKm,
    maxKm,
    fixedPrice: readNullableNonNegativeNumber(
      body.fixedPrice,
      "fixedPrice",
    ),
    pricePerKm: readNullableNonNegativeNumber(
      body.pricePerKm,
      "pricePerKm",
    ),
    waitingHourlyRate: readNullableNonNegativeNumber(
      body.waitingHourlyRate,
      "waitingHourlyRate",
    ),
    portFeeIncluded: readBooleanWithDefault(
      body.portFeeIncluded,
      false,
      "portFeeIncluded",
    ),
    isActive: readBooleanWithDefault(
      body.isActive,
      true,
      "isActive",
    ),
    notes: readNullableString(body.notes, "notes"),
  };

  validateTariffPricing(data);

  return data;
}

function validateTariffPricing(
  data: CustomerTariffWriteData,
): void {
  if (data.type === "PRICE_PER_KM" && data.pricePerKm === null) {
    throw new ApiValidationError(
      "За тарифа Цена / км трябва да има pricePerKm.",
    );
  }

  if (
    (data.type === "FIXED_PRICE" ||
      data.type === "SHUNT" ||
      data.type === "FIXED_TABLE_UPPER_BOUND" ||
      data.type === "DISTANCE_TABLE") &&
    data.fixedPrice === null
  ) {
    throw new ApiValidationError(
      "За този тип тарифа трябва да има fixedPrice.",
    );
  }

  if (
    data.type === "WAITING_TIME" &&
    data.waitingHourlyRate === null
  ) {
    throw new ApiValidationError(
      "За тарифа Престой трябва да има waitingHourlyRate.",
    );
  }
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

function normalizeOptionalString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim();

  return normalizedValue === "" ? null : normalizedValue;
}

function readNullableNonNegativeNumber(
  value: unknown,
  fieldName: string,
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const parsedValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    throw new ApiValidationError(
      `${fieldName} трябва да бъде неотрицателно число.`,
    );
  }

  return parsedValue;
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

function readTariffType(
  value: unknown,
  fieldName: string,
): TariffTypeValue {
  if (
    typeof value !== "string" ||
    !isTariffType(value)
  ) {
    throw new ApiValidationError(
      `${fieldName} трябва да бъде една от стойностите: ${TARIFF_TYPES.join(", ")}.`,
    );
  }

  return value;
}

function readCustomerBillableKmLogic(
  value: unknown,
  fieldName: string,
): CustomerBillableKmLogicValue {
  if (
    typeof value !== "string" ||
    !isCustomerBillableKmLogic(value)
  ) {
    throw new ApiValidationError(
      `${fieldName} трябва да бъде една от стойностите: ${CUSTOMER_BILLABLE_KM_LOGICS.join(", ")}.`,
    );
  }

  return value;
}

function isTariffType(
  value: string,
): value is TariffTypeValue {
  return (TARIFF_TYPES as readonly string[]).includes(value);
}

function isCustomerBillableKmLogic(
  value: string,
): value is CustomerBillableKmLogicValue {
  return (
    CUSTOMER_BILLABLE_KM_LOGICS as readonly string[]
  ).includes(value);
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
          "Вече съществува тарифно правило със същото име за този клиент.",
          409,
        );

      case "P2003":
        return errorResponse(
          "Посоченият клиент не съществува.",
          409,
        );

      default:
        console.error(
          "Prisma customer tariffs API error:",
          error,
        );

        return errorResponse(
          "Възникна грешка при работа с базата.",
          500,
        );
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    console.error("Prisma validation error:", error);

    return errorResponse(
      "Подадените данни не са валидни за тарифно правило.",
      400,
    );
  }

  console.error("Unexpected customer tariffs API error:", error);

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