import dotenv from "dotenv";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

dotenv.config({ path: ".env.local" });

const WRITE_MODE = process.argv.includes("--write");

const GEOCODING_ENDPOINT =
  "https://api.myptv.com/geocoding/v1/locations/by-text";

type AddressNormalization = {
  id: string;
  currentLabel: string;
  name: string;
  street: string | null;
  city: string | null;
  postalCode: string | null;
  country: string;
  confidence: "HIGH" | "MEDIUM";
  sourceNote: string;
};

const ADDRESS_NORMALIZATIONS: AddressNormalization[] = [
  {
    id: "cmrd9ubgh000d04vk7bseu0bz",
    currentLabel: "Alconet",
    name: "Alconet",
    street: "Theemsweg 48",
    city: "Rotterdam",
    postalCode: "3197 KM",
    country: "NL",
    confidence: "HIGH",
    sourceNote:
      "Address normalized from official Alconet contact details: Theemsweg 48, 3197 KM Rotterdam.",
  },
  {
    id: "cmrd7j6440003ggvkjy6b9xqt",
    currentLabel: "CCT Moerdijk",
    name: "CCT Moerdijk",
    street: "Middenweg 35",
    city: "Moerdijk",
    postalCode: "4782 PM",
    country: "NL",
    confidence: "HIGH",
    sourceNote:
      "Address normalized from official CCT contact details: Middenweg 35, 4782 PM Moerdijk.",
  },
  {
    id: "cmrhrmrc500032wvk8sd32xdt",
    currentLabel: "EWS Malakkastraat 71 3199 LK",
    name: "EWS Malakkastraat 71",
    street: "Malakkastraat 71",
    city: "Maasvlakte Rotterdam",
    postalCode: "3199 LK",
    country: "NL",
    confidence: "HIGH",
    sourceNote:
      "Address normalized from official EWS locations page: Malakkastraat 71, 3199 LK Maasvlakte Rotterdam.",
  },
  {
    id: "cmrd9ubpg000g04vkjtmkfzrn",
    currentLabel: "Nedcargo Waddinxveen",
    name: "Nedcargo Waddinxveen",
    street: "Transportweg 20",
    city: "Waddinxveen",
    postalCode: "2742 RH",
    country: "NL",
    confidence: "HIGH",
    sourceNote:
      "Address normalized from official Nedcargo contact details: Transportweg 20, 2742 RH Waddinxveen.",
  },
  {
    id: "cmrhrmr5p00012wvk36xypqa0",
    currentLabel: "WBT Waalhaven Botlek Terminal Nieuwesluisweg 268 3197 KV",
    name: "WBT Waalhaven Botlek Terminal",
    street: "Nieuwesluisweg 268",
    city: "Rotterdam-Botlek",
    postalCode: "3197 KV",
    country: "NL",
    confidence: "HIGH",
    sourceNote:
      "Address normalized from official Waalhaven Botlek Terminal details: Nieuwesluisweg 268, 3197 KV Rotterdam-Botlek.",
  },
];

const UNUSED_ADDRESS_IDS_TO_DELETE = [
  {
    id: "cmrhrmrfb00042wvk97jw87n9",
    reason:
      "Unused duplicate-like APM Terminals II text address; existing normalized APMT II address already exists.",
  },
];

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
    console.log(
      WRITE_MODE
        ? "WRITE MODE: selected addresses will be normalized and geocoded."
        : "PREVIEW MODE: no database changes will be made.",
    );

    for (const item of ADDRESS_NORMALIZATIONS) {
      const existing = await prisma.address.findUnique({
        where: {
          id: item.id,
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

      if (!existing) {
        console.log(`[SKIP] ${item.currentLabel} — address id not found: ${item.id}`);
        continue;
      }

      const searchText = buildSearchText(item);
      const geocodingResult = await geocodeAddress(searchText, apiKey);
      const location = geocodingResult.locations?.[0] ?? null;
      const position = location?.roadAccessPosition ?? location?.referencePosition ?? null;

      if (!position || !isValidCoordinate(position)) {
        console.log(`[SKIP] ${item.currentLabel} — PTV returned no valid coordinates.`);
        continue;
      }

      const formattedAddress =
        location?.formattedAddress ?? formatPtvAddress(location) ?? "";

      console.log("");
      console.log(`[${WRITE_MODE ? "WRITE" : "PREVIEW"}] ${item.currentLabel}`);
      console.table([
        {
          id: existing.id,
          oldName: existing.name,
          newName: item.name,
          newStreet: item.street,
          newCity: item.city,
          newPostalCode: item.postalCode,
          newCountry: item.country,
          latitude: position.latitude,
          longitude: position.longitude,
          ptv: formattedAddress,
          confidence: item.confidence,
        },
      ]);

      if (WRITE_MODE) {
        await prisma.address.update({
          where: {
            id: item.id,
          },
          data: {
            name: item.name,
            street: item.street,
            city: item.city,
            postalCode: item.postalCode,
            country: item.country,
            latitude: position.latitude,
            longitude: position.longitude,
            notes: buildNotes(item, formattedAddress),
          },
        });
      }
    }

    console.log("");
    console.log("Unused address delete candidates:");

    for (const item of UNUSED_ADDRESS_IDS_TO_DELETE) {
      const usageCount = await countAnyAddressUsage(prisma, item.id);

      const existing = await prisma.address.findUnique({
        where: {
          id: item.id,
        },
        select: {
          id: true,
          name: true,
          street: true,
          city: true,
          postalCode: true,
          country: true,
        },
      });

      if (!existing) {
        console.log(`[SKIP] ${item.id} — already deleted or not found.`);
        continue;
      }

      console.table([
        {
          id: existing.id,
          name: existing.name,
          street: existing.street,
          city: existing.city,
          postalCode: existing.postalCode,
          country: existing.country,
          usageCount,
          action: usageCount === 0 ? "delete" : "keep",
          reason: item.reason,
        },
      ]);

      if (WRITE_MODE && usageCount === 0) {
        await prisma.address.delete({
          where: {
            id: item.id,
          },
        });

        console.log(`[DELETE] Removed unused address ${item.id}.`);
      }
    }

    console.log("");
    console.log("Normalization finished.");

    if (!WRITE_MODE) {
      console.log("");
      console.log("Review the preview. Then run again with --write.");
    }
  } finally {
    await prisma.$disconnect();
  }
}

function buildSearchText(item: AddressNormalization): string {
  return [
    item.name,
    item.street,
    [item.postalCode, item.city].filter(Boolean).join(" "),
    item.country,
  ]
    .filter(Boolean)
    .join(", ");
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

  if (!response.ok) {
    throw new Error(
      `PTV geocoding returned HTTP ${response.status}: ${responseText}`,
    );
  }

  return JSON.parse(responseText) as PtvGeocodingResponse;
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

function formatPtvAddress(location: PtvGeocodedLocation | null): string | null {
  const address = location?.address;

  if (!address) {
    return null;
  }

  const streetLine = [address.street, address.houseNumber]
    .filter(Boolean)
    .join(" ");

  const cityLine = [address.postalCode, address.city]
    .filter(Boolean)
    .join(" ");

  return [streetLine, cityLine, address.countryName ?? address.countryCode]
    .filter(Boolean)
    .join(", ");
}

function buildNotes(item: AddressNormalization, formattedAddress: string): string {
  return [
    item.sourceNote,
    `Coordinate confidence: ${item.confidence}.`,
    formattedAddress ? `PTV geocoding result: ${formattedAddress}.` : "",
    `Updated at: ${new Date().toISOString()}.`,
  ]
    .filter(Boolean)
    .join(" ");
}

async function countAnyAddressUsage(
  prisma: PrismaClient,
  addressId: string,
): Promise<number> {
  const references = [
    { tableName: "Course", columnName: "pickupAddressId" },
    { tableName: "Course", columnName: "deliveryAddressId" },
    { tableName: "CustomerAddress", columnName: "addressId" },
    { tableName: "RouteLeg", columnName: "fromAddressId" },
    { tableName: "RouteLeg", columnName: "toAddressId" },
    { tableName: "course_stops", columnName: "addressId" },
  ];

  let total = 0;

  for (const reference of references) {
    const rows = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
      `SELECT COUNT(*)::bigint AS count FROM "${reference.tableName}" WHERE "${reference.columnName}" = $1`,
      addressId,
    );

    total += Number(rows[0]?.count ?? 0);
  }

  return total;
}

main().catch((error) => {
  console.error("Failed to normalize remaining addresses:");
  console.error(error);
  process.exit(1);
});