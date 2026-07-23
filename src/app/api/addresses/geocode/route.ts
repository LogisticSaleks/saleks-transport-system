import { NextResponse } from "next/server";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GEOCODING_ENDPOINT =
  "https://api.myptv.com/geocoding/v1/locations/by-text";

const ADDRESS_SELECT = {
  id: true,
  name: true,
  street: true,
  city: true,
  postalCode: true,
  country: true,
  latitude: true,
  longitude: true,
  type: true,
  portCode: true,
  terminalCode: true,
  isActive: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.AddressSelect;

type JsonObject = Record<string, unknown>;

type AddressRecord =
  Prisma.AddressGetPayload<{
    select: typeof ADDRESS_SELECT;
  }>;

type PtvPosition = {
  latitude: number;
  longitude: number;
};

type PtvGeocodedLocation = {
  referencePosition?: PtvPosition;
  roadAccessPosition?: PtvPosition;
  formattedAddress?: string;
  address?: {
    countryName?: string;
    postalCode?: string;
    city?: string;
    street?: string;
    houseNumber?: string;
    countryCode?: string;
  };
};

type PtvGeocodingResponse = {
  locations?: PtvGeocodedLocation[];
};

export async function POST(
  request: Request,
) {
  try {
    const body =
      await readJsonObject(request);

    const id = readRequiredString(
      body.id,
      "id",
    );

    const apiKey =
      process.env.MYPTV_API_KEY?.trim();

    if (!apiKey) {
      return errorResponse(
        "MYPTV_API_KEY is not configured.",
        500,
      );
    }

    const address =
      await prisma.address.findUnique({
        where: {
          id,
        },
        select: ADDRESS_SELECT,
      });

    if (!address) {
      return errorResponse(
        "Address not found.",
        404,
      );
    }

    const searchText =
      buildAddressSearchText(address);

    if (!searchText) {
      return errorResponse(
        "Address does not contain enough data for geocoding.",
        400,
      );
    }

    const geocodingResult =
      await geocodeAddress(
        searchText,
        apiKey,
      );

    const location =
      geocodingResult.locations?.[0];

    if (!location) {
      return errorResponse(
        "PTV did not return a geocoding result for this address.",
        404,
      );
    }

    const position =
      location.roadAccessPosition ??
      location.referencePosition ??
      null;

    if (
      !position ||
      !isValidCoordinate(position)
    ) {
      return errorResponse(
        "PTV returned invalid coordinates for this address.",
        502,
      );
    }

    const formattedAddress =
      location.formattedAddress ??
      formatPtvAddress(location);

    const updatedAddress =
      await prisma.address.update({
        where: {
          id,
        },
        data: {
          latitude:
            roundCoordinate(
              position.latitude,
            ).toFixed(7),
          longitude:
            roundCoordinate(
              position.longitude,
            ).toFixed(7),
          notes: appendAddressNote(
            address.notes,
            buildCoordinateNote({
              searchText,
              formattedAddress,
            }),
          ),
        },
        select: ADDRESS_SELECT,
      });

    return NextResponse.json({
      address:
        mapAddressRecord(updatedAddress),
      geocoding: {
        searchText,
        formattedAddress,
        latitude:
          roundCoordinate(
            position.latitude,
          ),
        longitude:
          roundCoordinate(
            position.longitude,
          ),
      },
    });
  } catch (error) {
    if (
      error instanceof
      AddressGeocodingValidationError
    ) {
      return errorResponse(
        error.message,
        400,
      );
    }

    console.error(
      "Address geocoding error:",
      error,
    );

    return errorResponse(
      error instanceof Error
        ? error.message
        : "Address coordinates could not be found.",
      500,
    );
  }
}

async function geocodeAddress(
  searchText: string,
  apiKey: string,
): Promise<PtvGeocodingResponse> {
  const url = new URL(
    GEOCODING_ENDPOINT,
  );

  url.searchParams.set(
    "searchText",
    searchText,
  );

  const response = await fetch(url, {
    method: "GET",
    headers: {
      ApiKey: apiKey,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const responseText =
    await response.text();

  const responseData =
    parseJsonSafely(responseText);

  if (!response.ok) {
    throw new Error(
      `PTV geocoding returned HTTP ${response.status}: ${responseText}`,
    );
  }

  if (
    responseData === null ||
    typeof responseData !== "object" ||
    Array.isArray(responseData)
  ) {
    throw new Error(
      "PTV geocoding returned invalid JSON.",
    );
  }

  return responseData as PtvGeocodingResponse;
}

function buildAddressSearchText(address: {
  name: string;
  street: string | null;
  city: string | null;
  postalCode: string | null;
  country: string;
}): string {
  return [
    address.name,
    address.street,
    [
      address.postalCode,
      address.city,
    ]
      .filter(Boolean)
      .join(" "),
    address.country,
  ]
    .filter(Boolean)
    .join(", ")
    .trim();
}

function formatPtvAddress(
  location: PtvGeocodedLocation,
): string | null {
  const address = location.address;

  if (!address) {
    return null;
  }

  const streetLine = [
    address.street,
    address.houseNumber,
  ]
    .filter(Boolean)
    .join(" ");

  const cityLine = [
    address.postalCode,
    address.city,
  ]
    .filter(Boolean)
    .join(" ");

  return [
    streetLine,
    cityLine,
    address.countryName ??
      address.countryCode,
  ]
    .filter(Boolean)
    .join(", ");
}

function buildCoordinateNote({
  searchText,
  formattedAddress,
}: {
  searchText: string;
  formattedAddress: string | null;
}): string {
  return [
    `Coordinates added from myPTV geocoding at ${new Date().toISOString()}.`,
    `Search text: ${searchText}.`,
    formattedAddress
      ? `PTV result: ${formattedAddress}.`
      : null,
  ]
    .filter(Boolean)
    .join(" ");
}

function appendAddressNote(
  existingNotes: string,
  newNote: string,
): string {
  const trimmedExistingNotes =
    existingNotes.trim();

  if (trimmedExistingNotes === "") {
    return newNote;
  }

  return `${trimmedExistingNotes}\n${newNote}`;
}

function isValidCoordinate(
  position: PtvPosition,
): boolean {
  return (
    Number.isFinite(position.latitude) &&
    position.latitude >= -90 &&
    position.latitude <= 90 &&
    Number.isFinite(position.longitude) &&
    position.longitude >= -180 &&
    position.longitude <= 180
  );
}

function readRequiredString(
  value: unknown,
  fieldName: string,
): string {
  if (typeof value !== "string") {
    throw new AddressGeocodingValidationError(
      `${fieldName} is required.`,
    );
  }

  const normalizedValue = value.trim();

  if (normalizedValue === "") {
    throw new AddressGeocodingValidationError(
      `${fieldName} is required.`,
    );
  }

  return normalizedValue;
}

async function readJsonObject(
  request: Request,
): Promise<JsonObject> {
  let value: unknown;

  try {
    value = await request.json();
  } catch {
    throw new AddressGeocodingValidationError(
      "Request body must be valid JSON.",
    );
  }

  if (
    value === null ||
    Array.isArray(value) ||
    typeof value !== "object"
  ) {
    throw new AddressGeocodingValidationError(
      "Request body must be a JSON object.",
    );
  }

  return value as JsonObject;
}

function mapAddressRecord(
  address: AddressRecord,
) {
  return {
    id: address.id,
    name: address.name,
    street: address.street,
    city: address.city,
    postalCode: address.postalCode,
    country: address.country,
    latitude: toNullableNumber(
      address.latitude,
    ),
    longitude: toNullableNumber(
      address.longitude,
    ),
    type: address.type,
    portCode: address.portCode,
    terminalCode:
      address.terminalCode,
    isActive: address.isActive,
    notes: address.notes,
    createdAt:
      address.createdAt.toISOString(),
    updatedAt:
      address.updatedAt.toISOString(),
  };
}

function toNullableNumber(
  value: unknown,
): number | null {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const parsedValue = Number(value);

  return Number.isFinite(parsedValue)
    ? parsedValue
    : null;
}

function roundCoordinate(
  value: number,
): number {
  return Math.round(value * 10_000_000) /
    10_000_000;
}

function parseJsonSafely(
  value: string,
): unknown {
  if (value.trim() === "") {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
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

class AddressGeocodingValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name =
      "AddressGeocodingValidationError";
  }
}