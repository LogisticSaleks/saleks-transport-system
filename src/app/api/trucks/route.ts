import { NextResponse } from "next/server";

import { Prisma, TruckStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type TruckRequestBody = {
  id?: unknown;
  name?: unknown;
  licensePlate?: unknown;
  status?: unknown;
  defaultFuelConsumptionL100Km?: unknown;
  defaultFuelConsumptionLitersPer100Km?: unknown;
  fuelConsumptionLitersPer100Km?: unknown;
  fuelConsumptionL100Km?: unknown;
  fuelConsumption?: unknown;
};

const FUEL_FIELD_CANDIDATES = [
  "defaultFuelConsumptionL100Km",
  "defaultFuelConsumptionLitersPer100Km",
  "fuelConsumptionLitersPer100Km",
  "fuelConsumptionL100Km",
  "fuelConsumption",
];

export async function GET() {
  const trucks = await prisma.truck.findMany({
    orderBy: [
      {
        name: "asc",
      },
      {
        licensePlate: "asc",
      },
    ],
  });

  return NextResponse.json({
    trucks: trucks.map(serializeTruck),
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TruckRequestBody;

    const name = normalizeRequiredString(body.name, "Truck name");
    const licensePlate = normalizeRequiredString(
      body.licensePlate,
      "License plate",
    );
    const status = normalizeTruckStatus(body.status);
    const fuelConsumption = normalizeOptionalFuelConsumption(body);

    const createData: Prisma.TruckCreateInput = {
      name,
      licensePlate,
      status,
    };

    applyFuelConsumptionIfSupported(
      createData,
      fuelConsumption,
      "create",
    );

    const truck = await prisma.truck.create({
      data: createData,
    });

    return NextResponse.json(
      {
        truck: serializeTruck(truck),
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    return handleTruckApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as TruckRequestBody;

    const id = normalizeRequiredString(body.id, "Truck id");
    const name = normalizeRequiredString(body.name, "Truck name");
    const licensePlate = normalizeRequiredString(
      body.licensePlate,
      "License plate",
    );
    const status = normalizeTruckStatus(body.status);
    const fuelConsumption = normalizeOptionalFuelConsumption(body);

    const updateData: Prisma.TruckUpdateInput = {
      name,
      licensePlate,
      status,
    };

    applyFuelConsumptionIfSupported(
      updateData,
      fuelConsumption,
      "update",
    );

    const truck = await prisma.truck.update({
      where: {
        id,
      },
      data: updateData,
    });

    return NextResponse.json({
      truck: serializeTruck(truck),
    });
  } catch (error) {
    return handleTruckApiError(error);
  }
}

function serializeTruck(truck: {
  id: string;
  name: string;
  licensePlate: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  const truckRecord = truck as unknown as Record<string, unknown>;

  return {
    id: truck.id,
    name: truck.name,
    licensePlate: truck.licensePlate,
    status: truck.status,
    defaultFuelConsumptionL100Km:
      getTruckFuelConsumption(truckRecord),
    createdAt: truck.createdAt.toISOString(),
    updatedAt: truck.updatedAt.toISOString(),
  };
}

function applyFuelConsumptionIfSupported(
  data: Prisma.TruckCreateInput | Prisma.TruckUpdateInput,
  fuelConsumption: number | null | undefined,
  mode: "create" | "update",
): void {
  const fuelFieldName = getTruckFuelFieldName();

  if (!fuelFieldName) {
    return;
  }

  if (mode === "create" && fuelConsumption === undefined) {
    return;
  }

  const dataRecord = data as unknown as Record<string, unknown>;

  dataRecord[fuelFieldName] =
    fuelConsumption === undefined ? null : fuelConsumption;
}

function getTruckFuelFieldName(): string | null {
  const prismaNamespace = Prisma as unknown as {
    dmmf?: {
      datamodel?: {
        models?: Array<{
          name: string;
          fields: Array<{
            name: string;
          }>;
        }>;
      };
    };
  };

  const truckModel = prismaNamespace.dmmf?.datamodel?.models?.find(
    (model) => model.name === "Truck",
  );

  const fieldNames = new Set(
    truckModel?.fields.map((field) => field.name) ?? [],
  );

  return (
    FUEL_FIELD_CANDIDATES.find((fieldName) =>
      fieldNames.has(fieldName),
    ) ?? null
  );
}

function getTruckFuelConsumption(
  truckRecord: Record<string, unknown>,
): number | null {
  for (const fieldName of FUEL_FIELD_CANDIDATES) {
    if (fieldName in truckRecord) {
      return toNullableNumber(truckRecord[fieldName]);
    }
  }

  return null;
}

function normalizeRequiredString(
  value: unknown,
  label: string,
): string {
  if (typeof value !== "string") {
    throw new Error(`${label} is required.`);
  }

  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new Error(`${label} is required.`);
  }

  return normalizedValue;
}

function normalizeTruckStatus(value: unknown): TruckStatus {
  const requestedStatus =
    typeof value === "string" && value.trim()
      ? value.trim().toUpperCase()
      : "ACTIVE";

  const allowedStatuses = new Set<string>(
    Object.values(TruckStatus),
  );

  if (!allowedStatuses.has(requestedStatus)) {
    throw new Error(
      `Invalid truck status. Allowed statuses: ${Object.values(
        TruckStatus,
      ).join(", ")}.`,
    );
  }

  return requestedStatus as TruckStatus;
}

function normalizeOptionalFuelConsumption(
  body: TruckRequestBody,
): number | null | undefined {
  const rawValue = getFirstExistingBodyValue(
    body,
    FUEL_FIELD_CANDIDATES,
  );

  if (rawValue === undefined) {
    return undefined;
  }

  if (rawValue === null || rawValue === "") {
    return null;
  }

  const normalizedValue =
    typeof rawValue === "string"
      ? Number(rawValue.replace(",", "."))
      : Number(rawValue);

  if (!Number.isFinite(normalizedValue) || normalizedValue < 0) {
    throw new Error(
      "Fuel consumption must be a positive number or empty.",
    );
  }

  return roundToTwoDecimals(normalizedValue);
}

function getFirstExistingBodyValue(
  body: TruckRequestBody,
  fieldNames: readonly string[],
): unknown {
  const bodyRecord = body as Record<string, unknown>;

  for (const fieldName of fieldNames) {
    if (fieldName in bodyRecord) {
      return bodyRecord[fieldName];
    }
  }

  return undefined;
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const parsedValue = Number(value);

    return Number.isFinite(parsedValue) ? parsedValue : null;
  }

  if (
    typeof value === "object" &&
    "toNumber" in value &&
    typeof value.toNumber === "function"
  ) {
    const parsedValue = value.toNumber();

    return Number.isFinite(parsedValue) ? parsedValue : null;
  }

  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function roundToTwoDecimals(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function handleTruckApiError(error: unknown) {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    return NextResponse.json(
      {
        error:
          "Вече има камион със същия регистрационен номер.",
      },
      {
        status: 409,
      },
    );
  }

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  ) {
    return NextResponse.json(
      {
        error: "Камионът не беше намерен.",
      },
      {
        status: 404,
      },
    );
  }

  return NextResponse.json(
    {
      error:
        error instanceof Error
          ? error.message
          : "Камионът не можа да бъде записан.",
    },
    {
      status: 400,
    },
  );
}