import dotenv from "dotenv";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

dotenv.config({ path: ".env.local" });

type CoordinateUpdate = {
  label: string;
  where: {
    name: string;
    street?: string | null;
    city?: string | null;
    country: string;
  };
  latitude: number;
  longitude: number;
  confidence: "HIGH" | "MEDIUM";
  notes: string;
};

const COORDINATE_UPDATES: CoordinateUpdate[] = [
  {
    label: "APMT II",
    where: {
      name: "APMT II",
      street: "Europaweg 910",
      city: "Maasvlakte Rotterdam",
      country: "NL",
    },
    latitude: 51.95634078979492,
    longitude: 4.0169501304626465,
    confidence: "HIGH",
    notes: "Coordinates from myPTV geocoding preview: Europaweg 910, 3199 LC Rotterdam.",
  },
  {
    label: "DSV Moerdijk",
    where: {
      name: "DSV Moerdijk",
      street: "Exportweg 3",
      city: "Moerdijk",
      country: "NL",
    },
    latitude: 51.68944549560547,
    longitude: 4.638359069824219,
    confidence: "HIGH",
    notes: "Coordinates from myPTV geocoding preview: Exportweg, 4782 JA Moerdijk.",
  },
  {
    label: "RWG Container Terminal",
    where: {
      name: "RWG Container Terminal",
      street: "Amoerweg 50",
      city: "Maasvlakte Rotterdam",
      country: "NL",
    },
    latitude: 51.96141052246094,
    longitude: 3.9908699989318848,
    confidence: "HIGH",
    notes: "Coordinates from myPTV geocoding preview: Amoerweg 50, 3199 KD Rotterdam.",
  },
  {
    label: "Stolthaven Moerdijk",
    where: {
      name: "Stolthaven Moerdijk",
      street: "Middenweg 30",
      city: "Moerdijk",
      country: "NL",
    },
    latitude: 51.679420471191406,
    longitude: 4.586900234222412,
    confidence: "HIGH",
    notes: "Coordinates from myPTV geocoding preview: Middenweg 30, 4782 PM Moerdijk.",
  },
  {
    label: "ECT Delta",
    where: {
      name: "ECT Delta",
      street: null,
      city: "Maasvlakte Rotterdam",
      country: "NL",
    },
    latitude: 51.97101974487305,
    longitude: 4.013599872589111,
    confidence: "MEDIUM",
    notes: "Coordinates from myPTV geocoding preview: Maasvlakte result. Confirm exact terminal point later.",
  },
  {
    label: "Waalhaven",
    where: {
      name: "Waalhaven",
      street: null,
      city: "Rotterdam",
      country: "NL",
    },
    latitude: 51.883670806884766,
    longitude: 4.427700042724609,
    confidence: "MEDIUM",
    notes: "Coordinates from myPTV geocoding preview: Rotterdam Eem- en Waalhaven. Confirm exact depot/terminal later.",
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
    let totalUpdated = 0;

    for (const update of COORDINATE_UPDATES) {
      const matches = await prisma.address.findMany({
        where: {
          name: update.where.name,
          city: update.where.city,
          country: update.where.country,
          ...(update.where.street === undefined
            ? {}
            : { street: update.where.street }),
        },
        select: {
          id: true,
          name: true,
          street: true,
          city: true,
          country: true,
          latitude: true,
          longitude: true,
        },
      });

      if (matches.length === 0) {
        console.log(`[SKIP] ${update.label} — no matching address found.`);
        continue;
      }

      const result = await prisma.address.updateMany({
        where: {
          id: {
            in: matches.map((address) => address.id),
          },
        },
        data: {
          latitude: update.latitude,
          longitude: update.longitude,
          notes: buildCoordinateNote(update),
        },
      });

      totalUpdated += result.count;

      console.log(
        `[UPDATED] ${update.label} — ${result.count} record(s), confidence=${update.confidence}`,
      );
    }

    console.log("");
    console.log(`Finished. Updated address records: ${totalUpdated}`);
  } finally {
    await prisma.$disconnect();
  }
}

function buildCoordinateNote(update: CoordinateUpdate): string {
  return [
    update.notes,
    `Coordinate confidence: ${update.confidence}.`,
    `Updated at: ${new Date().toISOString()}.`,
  ].join(" ");
}

main().catch((error) => {
  console.error("Failed to set address coordinates:");
  console.error(error);
  process.exit(1);
});