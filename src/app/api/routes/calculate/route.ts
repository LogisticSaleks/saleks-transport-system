import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  RouteServiceError,
  routeService,
  type ManualRouteValues,
  type RouteCoordinate,
  type RouteCurrency,
  type RouteProviderId,
  type RouteRequest,
  type RouteStop,
  type RouteStopType,
  type RouteVehicleProfile,
} from "@/lib/routes/routeService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROUTE_STOP_TYPES = ["ORIGIN", "VIA", "DESTINATION"] as const;
const ROUTE_PROVIDER_IDS = ["manual", "ptv"] as const;

type JsonObject = Record<string, unknown>;

type RouteStopInput = {
  type: RouteStopType;
  addressId: string | null;
  label: string | null;
  coordinate: RouteCoordinate | null;
};

type ResolvedAddressData = {
  label: string;
  coordinate: RouteCoordinate | null;
};

type CalculateRouteBody = {
  providerId: RouteProviderId;
  skipCache: boolean;
  stops: RouteStopInput[];
  vehicle: RouteVehicleProfile | null;
  departureTime: string | null;
  currency: RouteCurrency;
  includeCountryBreakdown: boolean;
  manual: ManualRouteValues | null;
};

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    const parsedBody = readCalculateRouteBody(body);

    const stops = await resolveRouteStops(parsedBody.stops);

    const routeRequest: RouteRequest = {
      stops,
      vehicle: parsedBody.vehicle,
      departureTime: parsedBody.departureTime,
      currency: parsedBody.currency,
      includeCountryBreakdown: parsedBody.includeCountryBreakdown,
      manual: parsedBody.manual,
    };

    const result = await routeService.calculateRoute(
      routeRequest,
      parsedBody.providerId,
      {
        skipCache: parsedBody.skipCache,
      },
    );

    return NextResponse.json({
      route: result,
    });
  } catch (error) {
    return handleRouteApiError(error);
  }
}

function readCalculateRouteBody(body: JsonObject): CalculateRouteBody {
  return {
    providerId: readProviderId(body.providerId),
    skipCache: readBooleanWithDefault(body.skipCache, false, "skipCache"),
    stops: readRouteStops(body.stops),
    vehicle: readVehicleProfile(body.vehicle),
    departureTime: readNullableIsoDate(body.departureTime, "departureTime"),
    currency: readCurrency(body.currency),
    includeCountryBreakdown: readBooleanWithDefault(
      body.includeCountryBreakdown,
      false,
      "includeCountryBreakdown",
    ),
    manual: readManualRouteValues(body.manual),
  };
}

async function resolveRouteStops(
  inputStops: readonly RouteStopInput[],
): Promise<RouteStop[]> {
  if (inputStops.length < 2) {
    throw new RouteApiValidationError(
      "Route calculation изисква поне две спирки.",
    );
  }

  const addressIds = Array.from(
    new Set(
      inputStops
        .map((stop) => stop.addressId)
        .filter((addressId): addressId is string => Boolean(addressId)),
    ),
  );

  const addressMap = new Map<string, ResolvedAddressData>();

  if (addressIds.length > 0) {
    const addresses = await prisma.address.findMany({
      where: {
        id: {
          in: addressIds,
        },
      },
      select: {
        id: true,
        name: true,
        street: true,
        city: true,
        postalCode: true,
        country: true,
        latitude: true,
        longitude: true,
      },
    });

    for (const address of addresses) {
      addressMap.set(address.id, {
        label: formatAddressLabel(address),
        coordinate: buildCoordinateFromAddress(address.latitude, address.longitude),
      });
    }
  }

  return inputStops.map((stop, index) => {
    const resolvedAddress = stop.addressId
      ? addressMap.get(stop.addressId)
      : null;

    if (stop.addressId && !resolvedAddress) {
      throw new RouteApiValidationError(
        `AddressId за route stop ${index + 1} не е намерен в базата.`,
      );
    }

    const label = stop.label ?? resolvedAddress?.label ?? null;

    if (!label || label.trim() === "") {
      throw new RouteApiValidationError(
        `Route stop ${index + 1} няма label или валиден addressId.`,
      );
    }

    return {
      type: stop.type,
      addressId: stop.addressId,
      label: label.trim(),
      coordinate: stop.coordinate ?? resolvedAddress?.coordinate ?? null,
    };
  });
}

function readRouteStops(value: unknown): RouteStopInput[] {
  if (!Array.isArray(value)) {
    throw new RouteApiValidationError("stops трябва да бъде масив.");
  }

  return value.map((item, index) => {
    const stop = readObject(item, `stops[${index}]`);

    return {
      type: readRouteStopType(stop.type, `stops[${index}].type`),
      addressId: readNullableString(stop.addressId, `stops[${index}].addressId`),
      label: readNullableString(stop.label, `stops[${index}].label`),
      coordinate: readNullableCoordinate(
        stop.coordinate,
        `stops[${index}].coordinate`,
      ),
    };
  });
}

function readManualRouteValues(value: unknown): ManualRouteValues | null {
  if (value === null || value === undefined) {
    return null;
  }

  const manual = readObject(value, "manual");

  return {
    distanceKm: readRequiredNonNegativeNumber(
      manual.distanceKm,
      "manual.distanceKm",
    ),
    durationMinutes: readNullableNonNegativeNumber(
      manual.durationMinutes,
      "manual.durationMinutes",
    ),
    tollCost: readNullableNonNegativeNumber(manual.tollCost, "manual.tollCost"),
    countryBreakdown: readCountryBreakdown(manual.countryBreakdown),
    notes: readNullableString(manual.notes, "manual.notes"),
  };
}

function readCountryBreakdown(
  value: unknown,
): ManualRouteValues["countryBreakdown"] {
  if (value === null || value === undefined) {
    return null;
  }

  if (!Array.isArray(value)) {
    throw new RouteApiValidationError(
      "manual.countryBreakdown трябва да бъде масив.",
    );
  }

  return value.map((item, index) => {
    const country = readObject(item, `manual.countryBreakdown[${index}]`);

    return {
      countryCode: readRequiredString(
        country.countryCode,
        `manual.countryBreakdown[${index}].countryCode`,
      ),
      distanceKm: readRequiredNonNegativeNumber(
        country.distanceKm,
        `manual.countryBreakdown[${index}].distanceKm`,
      ),
      tollCost: readRequiredNonNegativeNumber(
        country.tollCost,
        `manual.countryBreakdown[${index}].tollCost`,
      ),
    };
  });
}

function readVehicleProfile(value: unknown): RouteVehicleProfile | null {
  if (value === null || value === undefined) {
    return null;
  }

  const vehicle = readObject(value, "vehicle");

  return {
    grossWeightKg: readNullablePositiveNumber(
      vehicle.grossWeightKg,
      "vehicle.grossWeightKg",
    ),
    totalTechnicallyPermittedWeightKg: readNullablePositiveNumber(
      vehicle.totalTechnicallyPermittedWeightKg,
      "vehicle.totalTechnicallyPermittedWeightKg",
    ),
    axleWeightKg: readNullablePositiveNumber(
      vehicle.axleWeightKg,
      "vehicle.axleWeightKg",
    ),
    heightMeters: readNullablePositiveNumber(
      vehicle.heightMeters,
      "vehicle.heightMeters",
    ),
    widthMeters: readNullablePositiveNumber(
      vehicle.widthMeters,
      "vehicle.widthMeters",
    ),
    lengthMeters: readNullablePositiveNumber(
      vehicle.lengthMeters,
      "vehicle.lengthMeters",
    ),
    axleCount: readNullablePositiveNumber(vehicle.axleCount, "vehicle.axleCount"),
    euroClass: readNullableString(vehicle.euroClass, "vehicle.euroClass"),
    co2EmissionClass: readNullablePositiveNumber(
      vehicle.co2EmissionClass,
      "vehicle.co2EmissionClass",
    ),
    isAdr: readOptionalBoolean(vehicle.isAdr, "vehicle.isAdr"),
  };
}

function readNullableCoordinate(
  value: unknown,
  fieldName: string,
): RouteCoordinate | null {
  if (value === null || value === undefined) {
    return null;
  }

  const coordinate = readObject(value, fieldName);

  return {
    latitude: readLatitude(coordinate.latitude, `${fieldName}.latitude`),
    longitude: readLongitude(coordinate.longitude, `${fieldName}.longitude`),
  };
}

async function readJsonObject(request: Request): Promise<JsonObject> {
  let value: unknown;

  try {
    value = await request.json();
  } catch {
    throw new RouteApiValidationError("Невалиден или липсващ JSON body.");
  }

  return readObject(value, "JSON body");
}

function readObject(value: unknown, fieldName: string): JsonObject {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new RouteApiValidationError(`${fieldName} трябва да бъде обект.`);
  }

  return value as JsonObject;
}

function readProviderId(value: unknown): RouteProviderId {
  if (value === null || value === undefined || value === "") {
    return "manual";
  }

  if (typeof value !== "string") {
    throw new RouteApiValidationError("providerId трябва да бъде текст.");
  }

  const normalizedValue = value.trim().toLowerCase();

  if (!ROUTE_PROVIDER_IDS.includes(normalizedValue as "manual" | "ptv")) {
    throw new RouteApiValidationError(
      `providerId трябва да бъде една от стойностите: ${ROUTE_PROVIDER_IDS.join(
        ", ",
      )}.`,
    );
  }

  return normalizedValue as RouteProviderId;
}

function readRouteStopType(value: unknown, fieldName: string): RouteStopType {
  if (typeof value !== "string") {
    throw new RouteApiValidationError(`${fieldName} трябва да бъде текст.`);
  }

  const normalizedValue = value.trim().toUpperCase();

  if (!ROUTE_STOP_TYPES.includes(normalizedValue as RouteStopType)) {
    throw new RouteApiValidationError(
      `${fieldName} трябва да бъде една от стойностите: ${ROUTE_STOP_TYPES.join(
        ", ",
      )}.`,
    );
  }

  return normalizedValue as RouteStopType;
}

function readCurrency(value: unknown): RouteCurrency {
  if (value === null || value === undefined || value === "") {
    return "EUR";
  }

  if (typeof value !== "string" || value.trim().toUpperCase() !== "EUR") {
    throw new RouteApiValidationError("currency засега поддържа само EUR.");
  }

  return "EUR";
}

function readNullableString(value: unknown, fieldName: string): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    throw new RouteApiValidationError(`${fieldName} трябва да бъде текст или null.`);
  }

  const normalizedValue = value.trim();

  return normalizedValue === "" ? null : normalizedValue;
}

function readRequiredString(value: unknown, fieldName: string): string {
  if (typeof value !== "string") {
    throw new RouteApiValidationError(`${fieldName} трябва да бъде текст.`);
  }

  const normalizedValue = value.trim();

  if (normalizedValue === "") {
    throw new RouteApiValidationError(`${fieldName} не може да бъде празно.`);
  }

  return normalizedValue;
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
    throw new RouteApiValidationError(`${fieldName} трябва да бъде true или false.`);
  }

  return value;
}

function readOptionalBoolean(value: unknown, fieldName: string): boolean | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value !== "boolean") {
    throw new RouteApiValidationError(`${fieldName} трябва да бъде true или false.`);
  }

  return value;
}

function readNullableIsoDate(value: unknown, fieldName: string): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    throw new RouteApiValidationError(`${fieldName} трябва да бъде ISO дата.`);
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new RouteApiValidationError(`${fieldName} съдържа невалидна дата.`);
  }

  return date.toISOString();
}

function readRequiredNonNegativeNumber(value: unknown, fieldName: string): number {
  const parsedValue = parseNumber(value);

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    throw new RouteApiValidationError(
      `${fieldName} трябва да бъде неотрицателно число.`,
    );
  }

  return parsedValue;
}

function readNullableNonNegativeNumber(
  value: unknown,
  fieldName: string,
): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return readRequiredNonNegativeNumber(value, fieldName);
}

function readNullablePositiveNumber(
  value: unknown,
  fieldName: string,
): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsedValue = parseNumber(value);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    throw new RouteApiValidationError(
      `${fieldName} трябва да бъде положително число.`,
    );
  }

  return parsedValue;
}

function readLatitude(value: unknown, fieldName: string): number {
  const latitude = parseNumber(value);

  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new RouteApiValidationError(`${fieldName} не е валидна latitude.`);
  }

  return latitude;
}

function readLongitude(value: unknown, fieldName: string): number {
  const longitude = parseNumber(value);

  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new RouteApiValidationError(`${fieldName} не е валидна longitude.`);
  }

  return longitude;
}

function parseNumber(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return Number(value);
  }

  if (isDecimalLike(value)) {
    return value.toNumber();
  }

  return Number.NaN;
}

function isDecimalLike(value: unknown): value is { toNumber: () => number } {
  return (
    typeof value === "object" &&
    value !== null &&
    "toNumber" in value &&
    typeof (value as { toNumber?: unknown }).toNumber === "function"
  );
}

function buildCoordinateFromAddress(
  latitude: unknown,
  longitude: unknown,
): RouteCoordinate | null {
  if (latitude === null || latitude === undefined) {
    return null;
  }

  if (longitude === null || longitude === undefined) {
    return null;
  }

  const parsedLatitude = parseNumber(latitude);
  const parsedLongitude = parseNumber(longitude);

  if (
    !Number.isFinite(parsedLatitude) ||
    parsedLatitude < -90 ||
    parsedLatitude > 90
  ) {
    return null;
  }

  if (
    !Number.isFinite(parsedLongitude) ||
    parsedLongitude < -180 ||
    parsedLongitude > 180
  ) {
    return null;
  }

  return {
    latitude: parsedLatitude,
    longitude: parsedLongitude,
  };
}

function formatAddressLabel(address: {
  name: string;
  street: string | null;
  city: string | null;
  postalCode: string | null;
  country: string;
}): string {
  return [
    address.name,
    address.street,
    [address.postalCode, address.city].filter(Boolean).join(" "),
    address.country,
  ]
    .filter(Boolean)
    .join(", ");
}

function handleRouteApiError(error: unknown) {
  if (error instanceof RouteApiValidationError) {
    return errorResponse(error.message, 400);
  }

  if (error instanceof RouteServiceError) {
    return errorResponse(error.message, 400);
  }

  if (error instanceof Error && error.name === "PtvRouteProviderError") {
    return errorResponse(error.message, 502);
  }

  console.error("Route calculation API error:", error);

  return errorResponse("Възникна грешка при route calculation.", 500);
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

class RouteApiValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RouteApiValidationError";
  }
}