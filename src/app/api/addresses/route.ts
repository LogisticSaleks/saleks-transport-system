import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADDRESS_TYPES = [
  "TERMINAL",
  "DEPOT",
  "CUSTOMER_SITE",
  "PORT",
  "OTHER",
] as const;

type AddressTypeValue =
  (typeof ADDRESS_TYPES)[number];

type JsonObject = Record<
  string,
  unknown
>;

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

type AddressRecord =
  Prisma.AddressGetPayload<{
    select: typeof ADDRESS_SELECT;
  }>;

export async function GET(
  request: NextRequest,
) {
  const searchParams =
    request.nextUrl.searchParams;

  const addresses =
    await prisma.address.findMany({
      where: buildAddressWhere(
        searchParams,
      ),
      select: ADDRESS_SELECT,
      orderBy: [
        {
          isActive: "desc",
        },
        {
          name: "asc",
        },
        {
          city: "asc",
        },
      ],
    });

  return NextResponse.json({
    addresses: addresses.map(
      mapAddressRecord,
    ),
  });
}

export async function POST(
  request: Request,
) {
  try {
    const body =
      await readJsonObject(request);

    const address =
      await prisma.address.create({
        data: readAddressCreateInput(
          body,
        ),
        select: ADDRESS_SELECT,
      });

    return NextResponse.json(
      {
        address:
          mapAddressRecord(address),
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    if (
      error instanceof
      AddressValidationError
    ) {
      return errorResponse(
        error.message,
        400,
      );
    }

    console.error(
      "Address create error:",
      error,
    );

    return errorResponse(
      "Address could not be created.",
      500,
    );
  }
}

export async function PATCH(
  request: Request,
) {
  try {
    const body =
      await readJsonObject(request);

    const id = readRequiredString(
      body.id,
      "id",
    );

    const existingAddress =
      await prisma.address.findUnique({
        where: {
          id,
        },
        select: {
          id: true,
        },
      });

    if (!existingAddress) {
      return errorResponse(
        "Address not found.",
        404,
      );
    }

    const data =
      readAddressUpdateInput(body);

    if (
      Object.keys(data).length === 0
    ) {
      return errorResponse(
        "No address fields provided for update.",
        400,
      );
    }

    const address =
      await prisma.address.update({
        where: {
          id,
        },
        data,
        select: ADDRESS_SELECT,
      });

    return NextResponse.json({
      address: mapAddressRecord(
        address,
      ),
    });
  } catch (error) {
    if (
      error instanceof
      AddressValidationError
    ) {
      return errorResponse(
        error.message,
        400,
      );
    }

    console.error(
      "Address update error:",
      error,
    );

    return errorResponse(
      "Address could not be updated.",
      500,
    );
  }
}

function buildAddressWhere(
  searchParams: URLSearchParams,
): Prisma.AddressWhereInput {
  const includeInactive =
    searchParams.get(
      "includeInactive",
    ) === "true";

  const query = (
    searchParams.get("q") ?? ""
  )
    .trim()
    .replace(/\s+/g, " ");

  const type = readOptionalAddressType(
    searchParams.get("type") ?? "",
  );

  const where: Prisma.AddressWhereInput =
    {};

  if (!includeInactive) {
    where.isActive = true;
  }

  if (type) {
    where.type = type;
  }

  if (query !== "") {
    where.OR = [
      {
        name: {
          contains: query,
          mode: "insensitive",
        },
      },
      {
        street: {
          contains: query,
          mode: "insensitive",
        },
      },
      {
        city: {
          contains: query,
          mode: "insensitive",
        },
      },
      {
        postalCode: {
          contains: query,
          mode: "insensitive",
        },
      },
      {
        country: {
          contains: query,
          mode: "insensitive",
        },
      },
      {
        portCode: {
          contains: query,
          mode: "insensitive",
        },
      },
      {
        terminalCode: {
          contains: query,
          mode: "insensitive",
        },
      },
    ];
  }

  return where;
}

function readAddressCreateInput(
  body: JsonObject,
): Prisma.AddressCreateInput {
  const country =
    readOptionalCountry(
      body.country,
      "country",
    ) ?? "NL";

  return {
    name: readRequiredString(
      body.name,
      "name",
    ),
    street: readNullableText(
      body.street,
      "street",
    ),
    city: readNullableText(
      body.city,
      "city",
    ),
    postalCode:
      readNullableText(
        body.postalCode,
        "postalCode",
      ),
    country,
    latitude:
      readNullableCoordinate(
        body.latitude,
        "latitude",
        -90,
        90,
      ),
    longitude:
      readNullableCoordinate(
        body.longitude,
        "longitude",
        -180,
        180,
      ),
    type:
      readAddressTypeValue(
        body.type,
        "type",
      ) ?? "OTHER",
    portCode: readNullableText(
      body.portCode,
      "portCode",
    ),
    terminalCode:
      readNullableText(
        body.terminalCode,
        "terminalCode",
      ),
    isActive: readBoolean(
      body.isActive,
      "isActive",
      true,
    ),
    notes:
      readOptionalText(
        body.notes,
        "notes",
      ) ?? "",
  };
}

function readAddressUpdateInput(
  body: JsonObject,
): Prisma.AddressUpdateInput {
  const data: Prisma.AddressUpdateInput =
    {};

  if (hasOwn(body, "name")) {
    data.name = readRequiredString(
      body.name,
      "name",
    );
  }

  if (hasOwn(body, "street")) {
    data.street =
      readNullableText(
        body.street,
        "street",
      );
  }

  if (hasOwn(body, "city")) {
    data.city = readNullableText(
      body.city,
      "city",
    );
  }

  if (hasOwn(body, "postalCode")) {
    data.postalCode =
      readNullableText(
        body.postalCode,
        "postalCode",
      );
  }

  if (hasOwn(body, "country")) {
    data.country =
      readRequiredCountry(
        body.country,
        "country",
      );
  }

  if (hasOwn(body, "latitude")) {
    data.latitude =
      readNullableCoordinate(
        body.latitude,
        "latitude",
        -90,
        90,
      );
  }

  if (hasOwn(body, "longitude")) {
    data.longitude =
      readNullableCoordinate(
        body.longitude,
        "longitude",
        -180,
        180,
      );
  }

  if (hasOwn(body, "type")) {
    data.type =
      readAddressTypeValue(
        body.type,
        "type",
      ) ?? "OTHER";
  }

  if (hasOwn(body, "portCode")) {
    data.portCode =
      readNullableText(
        body.portCode,
        "portCode",
      );
  }

  if (hasOwn(body, "terminalCode")) {
    data.terminalCode =
      readNullableText(
        body.terminalCode,
        "terminalCode",
      );
  }

  if (hasOwn(body, "isActive")) {
    data.isActive = readBoolean(
      body.isActive,
      "isActive",
      true,
    );
  }

  if (hasOwn(body, "notes")) {
    data.notes =
      readOptionalText(
        body.notes,
        "notes",
      ) ?? "";
  }

  return data;
}

async function readJsonObject(
  request: Request,
): Promise<JsonObject> {
  let value: unknown;

  try {
    value = await request.json();
  } catch {
    throw new AddressValidationError(
      "Request body must be a valid JSON object.",
    );
  }

  if (
    value === null ||
    Array.isArray(value) ||
    typeof value !== "object"
  ) {
    throw new AddressValidationError(
      "Request body must be a JSON object.",
    );
  }

  return value as JsonObject;
}

function readRequiredString(
  value: unknown,
  fieldName: string,
): string {
  const text = readOptionalText(
    value,
    fieldName,
  );

  if (!text) {
    throw new AddressValidationError(
      `${fieldName} is required.`,
    );
  }

  return text;
}

function readOptionalText(
  value: unknown,
  fieldName: string,
): string | null {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  if (typeof value !== "string") {
    throw new AddressValidationError(
      `${fieldName} must be text.`,
    );
  }

  const text = value
    .trim()
    .replace(/\s+/g, " ");

  return text === ""
    ? null
    : text;
}

function readNullableText(
  value: unknown,
  fieldName: string,
): string | null {
  return readOptionalText(
    value,
    fieldName,
  );
}

function readOptionalCountry(
  value: unknown,
  fieldName: string,
): string | null {
  const text = readOptionalText(
    value,
    fieldName,
  );

  if (!text) {
    return null;
  }

  if (
    text.length < 2 ||
    text.length > 3
  ) {
    throw new AddressValidationError(
      `${fieldName} must be a 2 or 3 letter country code.`,
    );
  }

  return text.toUpperCase();
}

function readRequiredCountry(
  value: unknown,
  fieldName: string,
): string {
  const country =
    readOptionalCountry(
      value,
      fieldName,
    );

  if (!country) {
    throw new AddressValidationError(
      `${fieldName} is required.`,
    );
  }

  return country;
}

function readNullableCoordinate(
  value: unknown,
  fieldName: string,
  minValue: number,
  maxValue: number,
): string | null {
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
        ? Number(value.trim())
        : Number.NaN;

  if (!Number.isFinite(parsedValue)) {
    throw new AddressValidationError(
      `${fieldName} must be a number.`,
    );
  }

  if (
    parsedValue < minValue ||
    parsedValue > maxValue
  ) {
    throw new AddressValidationError(
      `${fieldName} is out of range.`,
    );
  }

  return roundCoordinate(
    parsedValue,
  ).toFixed(7);
}

function readBoolean(
  value: unknown,
  fieldName: string,
  defaultValue: boolean,
): boolean {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return defaultValue;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    if (value === "true") {
      return true;
    }

    if (value === "false") {
      return false;
    }
  }

  throw new AddressValidationError(
    `${fieldName} must be true or false.`,
  );
}

function readAddressTypeValue(
  value: unknown,
  fieldName: string,
): AddressTypeValue | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  if (typeof value !== "string") {
    throw new AddressValidationError(
      `${fieldName} must be text.`,
    );
  }

  const normalizedValue =
    value.trim().toUpperCase();

  if (
    ADDRESS_TYPES.includes(
      normalizedValue as AddressTypeValue,
    )
  ) {
    return normalizedValue as AddressTypeValue;
  }

  throw new AddressValidationError(
    `${fieldName} must be one of: ${ADDRESS_TYPES.join(
      ", ",
    )}.`,
  );
}

function readOptionalAddressType(
  value: string,
): AddressTypeValue | null {
  const normalizedValue =
    value.trim().toUpperCase();

  if (normalizedValue === "") {
    return null;
  }

  return ADDRESS_TYPES.includes(
    normalizedValue as AddressTypeValue,
  )
    ? (normalizedValue as AddressTypeValue)
    : null;
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

function hasOwn(
  object: JsonObject,
  key: string,
): boolean {
  return Object.prototype.hasOwnProperty.call(
    object,
    key,
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

class AddressValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name =
      "AddressValidationError";
  }
}