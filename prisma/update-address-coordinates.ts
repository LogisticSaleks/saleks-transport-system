import dotenv from "dotenv";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

dotenv.config({ path: ".env.local" });

const GEOCODING_ENDPOINT =
  "https://api.myptv.com/geocoding/v1/locations/by-text";

const WRITE_MODE = process.argv.includes("--write");
const DELAY_BETWEEN_REQUESTS_MS = 250;

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

async function main() {
  const connectionString = process.env.DATABASE_URL;
  const apiKey = process.env.MYPTV_API_KEY;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  if (!apiKey) {
    throw new Error("MYPTV_API_KEY is not set");
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    const addresses = await prisma.address.findMany({
      where: {
        OR: [
          {
            latitude: null,
          },
          {
            longitude: null,
          },
        ],
      },
      orderBy: {
        name: "asc",
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

    console.log(
      WRITE_MODE
        ? "WRITE MODE: coordinates will be saved."
        : "PREVIEW MODE: no database changes will be made.",
    );

    console.log(`Addresses without coordinates: ${addresses.length}`);

    let updatedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const address of addresses) {
      if (address.country === "UNSPECIFIED") {
        skippedCount += 1;
        console.log(
          `[SKIP] ${address.name} — country is UNSPECIFIED. Fix address first.`,
        );
        continue;
      }

      const searchText = buildAddressSearchText(address);

      if (!searchText) {
        skippedCount += 1;
        console.log(`[SKIP] ${address.name} — not enough address data.`);
        continue;
      }

      try {
        const result = await geocodeAddress(searchText, apiKey);
        const location = result.locations?.[0];

        if (!location) {
          failedCount += 1;
          console.log(`[FAIL] ${address.name} — no PTV geocoding result.`);
          await sleep(DELAY_BETWEEN_REQUESTS_MS);
          continue;
        }

        const position =
          location.roadAccessPosition ?? location.referencePosition ?? null;

        if (!position || !isValidCoordinate(position)) {
          failedCount += 1;
          console.log(`[FAIL] ${address.name} — invalid coordinate result.`);
          await sleep(DELAY_BETWEEN_REQUESTS_MS);
          continue;
        }

        const formattedAddress =
          location.formattedAddress ?? formatPtvAddress(location) ?? "";

        console.log(
          [
            WRITE_MODE ? "[WRITE]" : "[PREVIEW]",
            address.name,
            `search="${searchText}"`,
            `lat=${position.latitude}`,
            `lon=${position.longitude}`,
            formattedAddress ? `ptv="${formattedAddress}"` : "",
          ]
            .filter(Boolean)
            .join(" | "),
        );

        if (WRITE_MODE) {
          await prisma.address.update({
            where: {
              id: address.id,
            },
            data: {
              latitude: position.latitude,
              longitude: position.longitude,
              notes: buildUpdatedNotes(
                "Coordinates added from myPTV geocoding.",
              ),
            },
          });

          updatedCount += 1;
        }
      } catch (error) {
        failedCount += 1;
        console.log(
          `[FAIL] ${address.name} — ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }

      await sleep(DELAY_BETWEEN_REQUESTS_MS);
    }

    console.log("");
    console.log("Finished.");
    console.log(`Updated: ${updatedCount}`);
    console.log(`Skipped: ${skippedCount}`);
    console.log(`Failed: ${failedCount}`);

    if (!WRITE_MODE) {
      console.log("");
      console.log(
        "Run again with --write to save coordinates after reviewing the preview.",
      );
    }
  } finally {
    await prisma.$disconnect();
  }
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
    [address.postalCode, address.city].filter(Boolean).join(" "),
    address.country,
  ]
    .filter(Boolean)
    .join(", ")
    .trim();
}

async function geocodeAddress(
  searchText: string,
  apiKey: string,
): Promise<PtvGeocodingResponse> {
  const url = new URL(GEOCODING_ENDPOINT);

  url.searchParams.set("searchText", searchText);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      ApiKey: apiKey,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const responseText = await response.text();
  const responseData = parseJsonSafely(responseText);

  if (!response.ok) {
    throw new Error(
      `PTV geocoding returned HTTP ${response.status}: ${responseText}`,
    );
  }

  if (typeof responseData !== "object" || responseData === null) {
    throw new Error("PTV geocoding returned invalid JSON.");
  }

  return responseData as PtvGeocodingResponse;
}

function isValidCoordinate(position: PtvPosition): boolean {
  return (
    Number.isFinite(position.latitude) &&
    position.latitude >= -90 &&
    position.latitude <= 90 &&
    Number.isFinite(position.longitude) &&
    position.longitude >= -180 &&
    position.longitude <= 180
  );
}

function formatPtvAddress(location: PtvGeocodedLocation): string | null {
  const address = location.address;

  if (!address) {
    return null;
  }

  const streetLine = [address.street, address.houseNumber]
    .filter(Boolean)
    .join(" ");

  const cityLine = [address.postalCode, address.city]
    .filter(Boolean)
    .join(" ");

  return [
    streetLine,
    cityLine,
    address.countryName ?? address.countryCode,
  ]
    .filter(Boolean)
    .join(", ");
}

function buildUpdatedNotes(message: string): string {
  const date = new Date().toISOString();

  return `${message} ${date}`;
}

function parseJsonSafely(value: string): unknown {
  if (value.trim() === "") {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

main().catch((error) => {
  console.error("Failed to update address coordinates:");
  console.error(error);
  process.exit(1);
});