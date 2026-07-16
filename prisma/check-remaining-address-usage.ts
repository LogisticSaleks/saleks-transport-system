import dotenv from "dotenv";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

dotenv.config({ path: ".env.local" });

const REMAINING_ADDRESS_IDS = [
  "cmrd9ubgh000d04vk7bseu0bz", // Alconet
  "cmrhrmrfb00042wvk97jw87n9", // APM Terminals II Europaweg 910 Haven 8410 3199 LC
  "cmrhrmr9200022wvk7hyf4dy7", // CANADA GOOSE INTERNATIONAL AG
  "cmrd7j6440003ggvkjy6b9xqt", // CCT Moerdijk
  "cmrhrmrc500032wvk8sd32xdt", // EWS Malakkastraat 71 3199 LK
  "cmrd9ubpg000g04vkjtmkfzrn", // Nedcargo Waddinxveen
  "cmrd9ubsg000h04vkcih6gny4", // RDC Alphen
  "cmrhrmr5p00012wvk36xypqa0", // WBT Waalhaven Botlek Terminal Nieuwesluisweg 268 3197 KV
];

type AddressReference = {
  tableName: string;
  columnName: string;
};

const ADDRESS_REFERENCES: AddressReference[] = [
  {
    tableName: "Course",
    columnName: "pickupAddressId",
  },
  {
    tableName: "Course",
    columnName: "deliveryAddressId",
  },
  {
    tableName: "CustomerAddress",
    columnName: "addressId",
  },
  {
    tableName: "RouteLeg",
    columnName: "fromAddressId",
  },
  {
    tableName: "RouteLeg",
    columnName: "toAddressId",
  },
  {
    tableName: "course_stops",
    columnName: "addressId",
  },
];

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    const addresses = await prisma.address.findMany({
      where: {
        id: {
          in: REMAINING_ADDRESS_IDS,
        },
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

    console.log("Remaining addresses without coordinates:");
    console.table(
      addresses.map((address) => ({
        id: address.id,
        name: address.name,
        street: address.street,
        city: address.city,
        postalCode: address.postalCode,
        country: address.country,
        latitude: address.latitude?.toString() ?? "",
        longitude: address.longitude?.toString() ?? "",
      })),
    );

    console.log("");
    console.log("Usage by address:");

    for (const address of addresses) {
      const usages: {
        table: string;
        column: string;
        count: number;
      }[] = [];

      for (const reference of ADDRESS_REFERENCES) {
        const count = await countReferenceUsages(prisma, reference, address.id);

        if (count > 0) {
          usages.push({
            table: reference.tableName,
            column: reference.columnName,
            count,
          });
        }
      }

      console.log("");
      console.log(`${address.name} — ${address.id}`);

      if (usages.length === 0) {
        console.log("No usage found.");
      } else {
        console.table(usages);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

async function countReferenceUsages(
  prisma: PrismaClient,
  reference: AddressReference,
  addressId: string,
): Promise<number> {
  const rows = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT COUNT(*)::bigint AS count FROM "${reference.tableName}" WHERE "${reference.columnName}" = $1`,
    addressId,
  );

  return Number(rows[0]?.count ?? 0);
}

main().catch((error) => {
  console.error("Failed to check remaining address usage:");
  console.error(error);
  process.exit(1);
});