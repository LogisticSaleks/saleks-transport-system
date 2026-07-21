import { NextResponse } from "next/server";

import { Prisma, TruckStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type TruckRequestBody = {
  id?: unknown;
  name?: unknown;
  licensePlate?: unknown;
  vin?: unknown;
  status?: unknown;
  euroClass?: unknown;
  defaultFuelConsumptionLPer100Km?: unknown;
  notes?: unknown;
};

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
    ).toUpperCase();
    const vin = normalizeOptionalString(body.vin);
    const status = normalizeTruckStatus(body.status);
    const euroClass =
      normalizeOptionalString(body.euroClass) ?? "Euro 6";
    const defaultFuelConsumptionLPer100Km =
      normalizeFuelConsumption(
        body.defaultFuelConsumptionLPer100Km,
        30,
      );
    const notes = normalizeOptionalString(body.notes);

    const truck = await prisma.truck.create({
      data: {
        name,
        licensePlate,
        vin,
        status,
        euroClass,
        defaultFuelConsumptionLPer100Km:
          new Prisma.Decimal(defaultFuelConsumptionLPer100Km),
        notes,
      },
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
    ).toUpperCase();
    const vin = normalizeOptionalString(body.vin);
    const status = normalizeTruckStatus(body.status);
    const euroClass =
      normalizeOptionalString(body.euroClass) ?? "Euro 6";
    const defaultFuelConsumptionLPer100Km =
      normalizeFuelConsumption(
        body.defaultFuelConsumptionLPer100Km,
        30,
      );
    const notes = normalizeOptionalString(body.notes);

    const truck = await prisma.truck.update({
      where: {
        id,
      },
      data: {
        name,
        licensePlate,
        vin,
        status,
        euroClass,
        defaultFuelConsumptionLPer100Km:
          new Prisma.Decimal(defaultFuelConsumptionLPer100Km),
        notes,
      },
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
  vin: string | null;
  status: string;
  euroClass: string;
  defaultFuelConsumptionLPer100Km: unknown;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: truck.id,
    name: truck.name,
    licensePlate: truck.licensePlate,
    vin: truck.vin,
    status: truck.status,
    euroClass: truck.euroClass,
    defaultFuelConsumptionLPer100Km: toNumber(
      truck.defaultFuelConsumptionLPer100Km,
    ),
    notes: truck.notes,
    createdAt: truck.createdAt.toISOString(),
    updatedAt: truck.updatedAt.toISOString(),
  };
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

function normalizeOptionalString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim();

  return normalizedValue ? normalizedValue : null;
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

function normalizeFuelConsumption(
  value: unknown,
  defaultValue: number,
): number {
  if (value === null || value === undefined || value === "") {
    return defaultValue;
  }

  const normalizedValue =
    typeof value === "string"
      ? Number(value.replace(",", "."))
      : Number(value);

  if (!Number.isFinite(normalizedValue) || normalizedValue < 0) {
    throw new Error(
      "Fuel consumption must be a positive number.",
    );
  }

  return roundToTwoDecimals(normalizedValue);
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