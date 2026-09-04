import { NextResponse } from "next/server";

import { Prisma } from "@/generated/prisma/client";
import { requireApiPermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JsonObject = Record<string, unknown>;

type FuelEntryForResponse = {
  id: string;
  truckId: string;
  entryDate: Date;
  odometerKm: unknown;
  dieselLiters: unknown;
  dieselTotalAmount: unknown;
  adBlueLiters: unknown;
  adBlueTotalAmount: unknown;
  stationName: string | null;
  location: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  truck: {
    id: string;
    name: string;
    licensePlate: string;
    status: string;
  };
};

type FuelEntryRow = {
  id: string;
  truckId: string;
  truckName: string;
  truckLicensePlate: string;
  truckStatus: string;
  entryDate: string;
  odometerKm: number;
  distanceKm: number | null;
  dieselLiters: number;
  dieselTotalAmount: number;
  dieselPricePerLiter: number | null;
  adBlueLiters: number;
  adBlueTotalAmount: number;
  adBluePricePerLiter: number | null;
  consumptionLPer100Km: number | null;
  stationName: string | null;
  location: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

type FuelSummary = {
  entryCount: number;
  dieselLiters: number;
  dieselTotalAmount: number;
  dieselAveragePricePerLiter: number | null;
  adBlueLiters: number;
  adBlueTotalAmount: number;
  adBlueAveragePricePerLiter: number | null;
  distanceKm: number;
  averageConsumptionLPer100Km: number | null;
};

export async function GET(request: Request) {
  const permission = await requireApiPermission("fuel:read");

  if (!permission.ok) {
    return permission.response;
  }

  try {
    const url = new URL(request.url);

    const truckId = normalizeOptionalString(
      url.searchParams.get("truckId"),
    );

    const fromDate = readOptionalDateOnly(
      url.searchParams.get("fromDate"),
      "fromDate",
      false,
    );

    const toDate = readOptionalDateOnly(
      url.searchParams.get("toDate"),
      "toDate",
      true,
    );

    const where: Prisma.TruckFuelEntryWhereInput = {};

    if (truckId) {
      where.truckId = truckId;
    }

    const entryDateFilter: {
      gte?: Date;
      lte?: Date;
    } = {};

    if (fromDate) {
      entryDateFilter.gte = fromDate;
    }

    if (toDate) {
      entryDateFilter.lte = toDate;
    }

    if (Object.keys(entryDateFilter).length > 0) {
      where.entryDate = entryDateFilter;
    }

    const fuelEntries = await prisma.truckFuelEntry.findMany({
      where,
      include: buildFuelEntryInclude(),
      orderBy: [
        {
          entryDate: "asc",
        },
        {
          createdAt: "asc",
        },
      ],
    });

    const entries = buildFuelEntryRows(
      fuelEntries as FuelEntryForResponse[],
    );

    return NextResponse.json({
      entries,
      summary: buildFuelSummary(entries),
    });
  } catch (error) {
    return handleFuelApiError(error);
  }
}

export async function POST(request: Request) {
  const permission = await requireApiPermission("fuel:write");

  if (!permission.ok) {
    return permission.response;
  }

  try {
    const body = await readJsonObject(request);

    const truckId = readRequiredString(body.truckId, "Камион");
    const entryDate = readRequiredDateOnly(body.entryDate, "Дата");

    const odometerKm = readRequiredNonNegativeNumber(
      body.odometerKm,
      "Километри",
    );

    const dieselLiters = readOptionalNonNegativeNumber(
      body.dieselLiters,
      "Дизел литри",
      0,
    );

    const dieselTotalAmount = readOptionalNonNegativeNumber(
      body.dieselTotalAmount,
      "Дизел обща сума",
      0,
    );

    const adBlueLiters = readOptionalNonNegativeNumber(
      body.adBlueLiters,
      "AdBlue литри",
      0,
    );

    const adBlueTotalAmount = readOptionalNonNegativeNumber(
      body.adBlueTotalAmount,
      "AdBlue обща сума",
      0,
    );

    if (dieselLiters <= 0 && adBlueLiters <= 0) {
      throw new ApiValidationError(
        "Въведи поне дизел литри или AdBlue литри.",
      );
    }

    if (dieselTotalAmount > 0 && dieselLiters <= 0) {
      throw new ApiValidationError(
        "Не може да има сума за дизел без литри дизел.",
      );
    }

    if (adBlueTotalAmount > 0 && adBlueLiters <= 0) {
      throw new ApiValidationError(
        "Не може да има сума за AdBlue без литри AdBlue.",
      );
    }

    const truck = await prisma.truck.findUnique({
      where: {
        id: truckId,
      },
      select: {
        id: true,
      },
    });

    if (!truck) {
      throw new ApiValidationError("Избраният камион не съществува.");
    }

    const fuelEntry = await prisma.truckFuelEntry.create({
      data: {
        truckId,
        entryDate,
        odometerKm: new Prisma.Decimal(odometerKm),
        dieselLiters: new Prisma.Decimal(dieselLiters),
        dieselTotalAmount: new Prisma.Decimal(dieselTotalAmount),
        adBlueLiters: new Prisma.Decimal(adBlueLiters),
        adBlueTotalAmount: new Prisma.Decimal(adBlueTotalAmount),
        stationName: normalizeOptionalString(body.stationName),
        location: normalizeOptionalString(body.location),
        notes: normalizeOptionalString(body.notes),
      },
      include: buildFuelEntryInclude(),
    });

    const entries = buildFuelEntryRows([
      fuelEntry as FuelEntryForResponse,
    ]);

    return NextResponse.json(
      {
        entry: entries[0],
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    return handleFuelApiError(error);
  }
}

export async function PATCH(request: Request) {
  const permission = await requireApiPermission("fuel:write");

  if (!permission.ok) {
    return permission.response;
  }

  try {
    const body = await readJsonObject(request);

    const id = readRequiredString(body.id, "Fuel entry id");
    const truckId = readRequiredString(body.truckId, "Камион");
    const entryDate = readRequiredDateOnly(body.entryDate, "Дата");

    const odometerKm = readRequiredNonNegativeNumber(
      body.odometerKm,
      "Километри",
    );

    const dieselLiters = readOptionalNonNegativeNumber(
      body.dieselLiters,
      "Дизел литри",
      0,
    );

    const dieselTotalAmount = readOptionalNonNegativeNumber(
      body.dieselTotalAmount,
      "Дизел обща сума",
      0,
    );

    const adBlueLiters = readOptionalNonNegativeNumber(
      body.adBlueLiters,
      "AdBlue литри",
      0,
    );

    const adBlueTotalAmount = readOptionalNonNegativeNumber(
      body.adBlueTotalAmount,
      "AdBlue обща сума",
      0,
    );

    if (dieselLiters <= 0 && adBlueLiters <= 0) {
      throw new ApiValidationError(
        "Въведи поне дизел литри или AdBlue литри.",
      );
    }

    if (dieselTotalAmount > 0 && dieselLiters <= 0) {
      throw new ApiValidationError(
        "Не може да има сума за дизел без литри дизел.",
      );
    }

    if (adBlueTotalAmount > 0 && adBlueLiters <= 0) {
      throw new ApiValidationError(
        "Не може да има сума за AdBlue без литри AdBlue.",
      );
    }

    const truck = await prisma.truck.findUnique({
      where: {
        id: truckId,
      },
      select: {
        id: true,
      },
    });

    if (!truck) {
      throw new ApiValidationError("Избраният камион не съществува.");
    }

    const fuelEntry = await prisma.truckFuelEntry.update({
      where: {
        id,
      },
      data: {
        truckId,
        entryDate,
        odometerKm: new Prisma.Decimal(odometerKm),
        dieselLiters: new Prisma.Decimal(dieselLiters),
        dieselTotalAmount: new Prisma.Decimal(dieselTotalAmount),
        adBlueLiters: new Prisma.Decimal(adBlueLiters),
        adBlueTotalAmount: new Prisma.Decimal(adBlueTotalAmount),
        stationName: normalizeOptionalString(body.stationName),
        location: normalizeOptionalString(body.location),
        notes: normalizeOptionalString(body.notes),
      },
      include: buildFuelEntryInclude(),
    });

    const entries = buildFuelEntryRows([
      fuelEntry as FuelEntryForResponse,
    ]);

    return NextResponse.json({
      entry: entries[0],
    });
  } catch (error) {
    return handleFuelApiError(error);
  }
}

export async function DELETE(request: Request) {
  const permission = await requireApiPermission("fuel:write");

  if (!permission.ok) {
    return permission.response;
  }

  try {
    const body = await readJsonObject(request);
    const id = readRequiredString(body.id, "Fuel entry id");

    const deletedEntry = await prisma.truckFuelEntry.delete({
      where: {
        id,
      },
      include: buildFuelEntryInclude(),
    });

    const entries = buildFuelEntryRows([
      deletedEntry as FuelEntryForResponse,
    ]);

    return NextResponse.json({
      entry: entries[0],
    });
  } catch (error) {
    return handleFuelApiError(error);
  }
}

function buildFuelEntryInclude() {
  return {
    truck: {
      select: {
        id: true,
        name: true,
        licensePlate: true,
        status: true,
      },
    },
  };
}

function buildFuelEntryRows(
  fuelEntries: readonly FuelEntryForResponse[],
): FuelEntryRow[] {
  const previousOdometerByTruckId = new Map<string, number>();

  const rows = fuelEntries
    .slice()
    .sort((firstEntry, secondEntry) => {
      const truckComparison = firstEntry.truckId.localeCompare(
        secondEntry.truckId,
      );

      if (truckComparison !== 0) {
        return truckComparison;
      }

      const dateComparison =
        firstEntry.entryDate.getTime() -
        secondEntry.entryDate.getTime();

      if (dateComparison !== 0) {
        return dateComparison;
      }

      return (
        firstEntry.createdAt.getTime() -
        secondEntry.createdAt.getTime()
      );
    })
    .map((entry) => {
      const odometerKm = roundKilometers(toNumber(entry.odometerKm));
      const dieselLiters = roundLiters(toNumber(entry.dieselLiters));
      const dieselTotalAmount = roundMoney(
        toNumber(entry.dieselTotalAmount),
      );
      const adBlueLiters = roundLiters(toNumber(entry.adBlueLiters));
      const adBlueTotalAmount = roundMoney(
        toNumber(entry.adBlueTotalAmount),
      );

      const previousOdometer = previousOdometerByTruckId.get(
        entry.truckId,
      );

      previousOdometerByTruckId.set(entry.truckId, odometerKm);

      const distanceKm =
        previousOdometer === undefined
          ? null
          : roundKilometers(odometerKm - previousOdometer);

      const usableDistanceKm =
        distanceKm !== null && distanceKm > 0 ? distanceKm : null;

      return {
        id: entry.id,
        truckId: entry.truckId,
        truckName: entry.truck.name,
        truckLicensePlate: entry.truck.licensePlate,
        truckStatus: entry.truck.status,
        entryDate: entry.entryDate.toISOString(),
        odometerKm,
        distanceKm: usableDistanceKm,
        dieselLiters,
        dieselTotalAmount,
        dieselPricePerLiter: calculateUnitPrice(
          dieselTotalAmount,
          dieselLiters,
        ),
        adBlueLiters,
        adBlueTotalAmount,
        adBluePricePerLiter: calculateUnitPrice(
          adBlueTotalAmount,
          adBlueLiters,
        ),
        consumptionLPer100Km:
          usableDistanceKm === null
            ? null
            : roundConsumption(
                (dieselLiters / usableDistanceKm) * 100,
              ),
        stationName: entry.stationName,
        location: entry.location,
        notes: entry.notes,
        createdAt: entry.createdAt.toISOString(),
        updatedAt: entry.updatedAt.toISOString(),
      };
    });

  return rows.sort((firstRow, secondRow) => {
    const dateComparison =
      new Date(secondRow.entryDate).getTime() -
      new Date(firstRow.entryDate).getTime();

    if (dateComparison !== 0) {
      return dateComparison;
    }

    return firstRow.truckName.localeCompare(
      secondRow.truckName,
      "bg-BG",
    );
  });
}

function buildFuelSummary(
  entries: readonly FuelEntryRow[],
): FuelSummary {
  const dieselLiters = roundLiters(
    entries.reduce(
      (sum, entry) => sum + entry.dieselLiters,
      0,
    ),
  );

  const dieselTotalAmount = roundMoney(
    entries.reduce(
      (sum, entry) => sum + entry.dieselTotalAmount,
      0,
    ),
  );

  const adBlueLiters = roundLiters(
    entries.reduce(
      (sum, entry) => sum + entry.adBlueLiters,
      0,
    ),
  );

  const adBlueTotalAmount = roundMoney(
    entries.reduce(
      (sum, entry) => sum + entry.adBlueTotalAmount,
      0,
    ),
  );

  const entriesWithDistance = entries.filter(
    (entry) => entry.distanceKm !== null && entry.distanceKm > 0,
  );

  const distanceKm = roundKilometers(
    entriesWithDistance.reduce(
      (sum, entry) => sum + (entry.distanceKm ?? 0),
      0,
    ),
  );

  const dieselLitersForConsumption = roundLiters(
    entriesWithDistance.reduce(
      (sum, entry) => sum + entry.dieselLiters,
      0,
    ),
  );

  return {
    entryCount: entries.length,
    dieselLiters,
    dieselTotalAmount,
    dieselAveragePricePerLiter: calculateUnitPrice(
      dieselTotalAmount,
      dieselLiters,
    ),
    adBlueLiters,
    adBlueTotalAmount,
    adBlueAveragePricePerLiter: calculateUnitPrice(
      adBlueTotalAmount,
      adBlueLiters,
    ),
    distanceKm,
    averageConsumptionLPer100Km:
      distanceKm > 0
        ? roundConsumption(
            (dieselLitersForConsumption / distanceKm) * 100,
          )
        : null,
  };
}

async function readJsonObject(
  request: Request,
): Promise<JsonObject> {
  let value: unknown;

  try {
    value = await request.json();
  } catch {
    throw new ApiValidationError("Невалиден или липсващ JSON body.");
  }

  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    throw new ApiValidationError("JSON body трябва да бъде обект.");
  }

  return value as JsonObject;
}

function readRequiredString(
  value: unknown,
  fieldName: string,
): string {
  if (typeof value !== "string") {
    throw new ApiValidationError(fieldName + " е задължително поле.");
  }

  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new ApiValidationError(fieldName + " е задължително поле.");
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

  return normalizedValue ? normalizedValue : null;
}

function readRequiredDateOnly(
  value: unknown,
  fieldName: string,
): Date {
  return parseDateOnly(readRequiredString(value, fieldName), fieldName, false);
}

function readOptionalDateOnly(
  value: unknown,
  fieldName: string,
  endOfDay: boolean,
): Date | null {
  const normalizedValue = normalizeOptionalString(value);

  if (!normalizedValue) {
    return null;
  }

  return parseDateOnly(normalizedValue, fieldName, endOfDay);
}

function parseDateOnly(
  value: string,
  fieldName: string,
  endOfDay: boolean,
): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    throw new ApiValidationError(
      fieldName + " трябва да бъде във формат YYYY-MM-DD.",
    );
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = endOfDay
    ? new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999))
    : new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new ApiValidationError(fieldName + " не е валидна дата.");
  }

  return date;
}

function readRequiredNonNegativeNumber(
  value: unknown,
  fieldName: string,
): number {
  const parsedValue = parseDecimalNumber(value);

  if (parsedValue === null || parsedValue < 0) {
    throw new ApiValidationError(
      fieldName + " трябва да бъде положително число или 0.",
    );
  }

  return roundToTwoDecimals(parsedValue);
}

function readOptionalNonNegativeNumber(
  value: unknown,
  fieldName: string,
  defaultValue: number,
): number {
  if (value === null || value === undefined || value === "") {
    return defaultValue;
  }

  return readRequiredNonNegativeNumber(value, fieldName);
}

function parseDecimalNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const parsedValue = Number(value.trim().replace(",", "."));

    return Number.isFinite(parsedValue) ? parsedValue : null;
  }

  return null;
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

function calculateUnitPrice(
  totalAmount: number,
  liters: number,
): number | null {
  if (liters <= 0) {
    return null;
  }

  return roundMoney(totalAmount / liters);
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function roundKilometers(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function roundLiters(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function roundConsumption(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function roundToTwoDecimals(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function handleFuelApiError(error: unknown) {
  if (error instanceof ApiValidationError) {
    return errorResponse(error.message, 400);
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2003":
        return errorResponse("Посоченият камион не съществува.", 409);

      case "P2025":
        return errorResponse("Fuel записът не беше намерен.", 404);

      default:
        console.error("Prisma fuel API error:", error);

        return errorResponse(
          "Възникна грешка при работа с Fuel базата.",
          500,
        );
    }
  }

  console.error("Unexpected fuel API error:", error);

  return errorResponse(
    "Възникна неочаквана грешка във Fuel модула.",
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
