import dotenv from "dotenv";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

dotenv.config({ path: ".env.local" });

const WRITE_MODE = process.argv.includes("--write");

type DuplicateCleanupGroup = {
  label: string;
  keepAddressId: string;
  duplicateAddressIds: string[];
};

const CLEANUP_GROUPS: DuplicateCleanupGroup[] = [
  {
    label: "CCT Moerdijk",
    // This one is already used by Course, RouteLeg and course_stops.
    keepAddressId: "cmrd7j6440003ggvkjy6b9xqt",
    duplicateAddressIds: [
      "cmrd7mjxd0003jsvkm4zm2pnb",
      "cmrd8h32y000i20vk03zymb1l",
      "cmrd80k7h000djovk5ruvh9vm",
      "cmrd8gu2u000i6gvktv0pn3nh",
      "cmrd7x6tw000dksvk2wenz35n",
      "cmrd80ptr000d1kvk2kuv3j5y",
      "cmrd74ykm0004o0vk0ud4tve0",
      "cmrd7mrku0003pwvk8wa5iz1c",
    ],
  },
  {
    label: "RWG Container Terminal",
    // Any of the RWG duplicates can be kept; this one already has coordinates.
    keepAddressId: "cmrd8gu19000h6gvkojaupim8",
    duplicateAddressIds: [
      "cmrd74yiy0003o0vk6joktjl3",
      "cmrd7mjvn0002jsvkc0lmntl8",
      "cmrd7x6sd000cksvkb9mjuen6",
      "cmrd80ps5000c1kvkfr1w15wk",
      "cmrd7mrj90002pwvkwm4usz6a",
      "cmrd8h31d000h20vk32q066ob",
      "cmrd7j62c0002ggvkyhs7z81w",
      "cmrd80k5r000cjovkveccv81j",
    ],
  },
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
    console.log(
      WRITE_MODE
        ? "WRITE MODE: duplicates will be merged and deleted."
        : "PREVIEW MODE: no database changes will be made.",
    );

    for (const group of CLEANUP_GROUPS) {
      console.log("");
      console.log(`GROUP: ${group.label}`);
      console.log(`Keep address: ${group.keepAddressId}`);
      console.log(`Duplicate addresses: ${group.duplicateAddressIds.length}`);

      const keepAddress = await prisma.address.findUnique({
        where: {
          id: group.keepAddressId,
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

      if (!keepAddress) {
        throw new Error(
          `Keep address not found for ${group.label}: ${group.keepAddressId}`,
        );
      }

      const duplicates = await prisma.address.findMany({
        where: {
          id: {
            in: group.duplicateAddressIds,
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

      const foundDuplicateIds = new Set(duplicates.map((address) => address.id));
      const missingDuplicateIds = group.duplicateAddressIds.filter(
        (addressId) => !foundDuplicateIds.has(addressId),
      );

      if (missingDuplicateIds.length > 0) {
        console.log("Missing duplicate IDs:");
        console.table(missingDuplicateIds.map((id) => ({ id })));
      }

      console.log("Keep address data:");
      console.table([
        {
          id: keepAddress.id,
          name: keepAddress.name,
          street: keepAddress.street,
          city: keepAddress.city,
          postalCode: keepAddress.postalCode,
          country: keepAddress.country,
          latitude: keepAddress.latitude?.toString() ?? "",
          longitude: keepAddress.longitude?.toString() ?? "",
        },
      ]);

      console.log("Duplicate address records found:");
      console.table(
        duplicates.map((address) => ({
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

      for (const reference of ADDRESS_REFERENCES) {
        const usageCount = await countReferenceUsages(
          prisma,
          reference,
          group.duplicateAddressIds,
        );

        if (usageCount === 0) {
          continue;
        }

        console.log(
          `[${WRITE_MODE ? "UPDATE" : "PREVIEW"}] ${reference.tableName}.${reference.columnName}: ${usageCount} row(s) will point to ${group.keepAddressId}`,
        );

        if (WRITE_MODE) {
          await updateReferenceUsages(
            prisma,
            reference,
            group.duplicateAddressIds,
            group.keepAddressId,
          );
        }
      }

      if (WRITE_MODE && duplicates.length > 0) {
        const deleteResult = await prisma.address.deleteMany({
          where: {
            id: {
              in: duplicates.map((address) => address.id),
            },
          },
        });

        console.log(`[DELETE] Removed ${deleteResult.count} duplicate address record(s).`);
      } else if (!WRITE_MODE) {
        console.log(
          `[PREVIEW] ${duplicates.length} duplicate address record(s) would be deleted.`,
        );
      }
    }

    console.log("");
    console.log("Cleanup finished.");

    if (!WRITE_MODE) {
      console.log("");
      console.log("Review the preview above. Then run again with --write.");
    }
  } finally {
    await prisma.$disconnect();
  }
}

async function countReferenceUsages(
  prisma: PrismaClient,
  reference: AddressReference,
  addressIds: string[],
): Promise<number> {
  if (addressIds.length === 0) {
    return 0;
  }

  const placeholders = addressIds.map((_, index) => `$${index + 1}`).join(", ");

  const rows = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT COUNT(*)::bigint AS count FROM "${reference.tableName}" WHERE "${reference.columnName}" IN (${placeholders})`,
    ...addressIds,
  );

  return Number(rows[0]?.count ?? 0);
}

async function updateReferenceUsages(
  prisma: PrismaClient,
  reference: AddressReference,
  duplicateAddressIds: string[],
  keepAddressId: string,
): Promise<void> {
  if (duplicateAddressIds.length === 0) {
    return;
  }

  const placeholders = duplicateAddressIds
    .map((_, index) => `$${index + 2}`)
    .join(", ");

  await prisma.$executeRawUnsafe(
    `UPDATE "${reference.tableName}" SET "${reference.columnName}" = $1 WHERE "${reference.columnName}" IN (${placeholders})`,
    keepAddressId,
    ...duplicateAddressIds,
  );
}

main().catch((error) => {
  console.error("Failed to clean duplicate addresses:");
  console.error(error);
  process.exit(1);
});