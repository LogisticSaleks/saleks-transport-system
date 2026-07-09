import dotenv from "dotenv";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

dotenv.config({ path: ".env.local" });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

type SeedAddressInput = {
  name: string;
  street?: string;
  city: string;
  postalCode?: string;
  country: string;
  type: "TERMINAL" | "DEPOT" | "CUSTOMER_SITE" | "PORT" | "OTHER";
  portCode?: string;
  terminalCode?: string;
  notes?: string;
};

async function seedAddress(data: SeedAddressInput) {
  const existingAddress = await prisma.address.findFirst({
    where: {
      name: data.name,
      city: data.city,
      country: data.country,
    },
  });

  if (existingAddress) {
    return prisma.address.update({
      where: { id: existingAddress.id },
      data,
    });
  }

  return prisma.address.create({
    data,
  });
}

async function main() {
  console.log("Start seeding...");

  const company = await prisma.company.upsert({
  where: { name: "Saleks" },
  update: {
    legalName: "Saleks",
    status: "ACTIVE",
    notes: "Main company for Saleks Transport System.",
  },
  create: {
    name: "Saleks",
    legalName: "Saleks",
    country: "BG",
    status: "ACTIVE",
    notes: "Main company for Saleks Transport System.",
  },
});

console.log(`Seeded company: ${company.name}`);

const vepco = await prisma.customer.upsert({
  where: { name: "Vepco Transport B.V." },
  update: {
    status: "ACTIVE",
    billableKmLogic: "ONE_WAY",
    notes: "Seed customer. Uses fixed upper-bound tariff table and one-way billable kilometers.",
  },
  create: {
    name: "Vepco Transport B.V.",
    status: "ACTIVE",
    billableKmLogic: "ONE_WAY",
    notes: "Seed customer. Uses fixed upper-bound tariff table and one-way billable kilometers.",
  },
});

await prisma.customerTariff.upsert({
  where: {
    customerId_name: {
      customerId: vepco.id,
      name: "Vepco fixed upper-bound table",
    },
  },
  update: {
    type: "FIXED_TABLE_UPPER_BOUND",
    billableKmLogic: "ONE_WAY",
    isActive: true,
    notes: "Vepco tariff logic: fixed price table by upper kilometer bound, billed one-way.",
  },
  create: {
    customerId: vepco.id,
    name: "Vepco fixed upper-bound table",
    type: "FIXED_TABLE_UPPER_BOUND",
    billableKmLogic: "ONE_WAY",
    isActive: true,
    notes: "Vepco tariff logic: fixed price table by upper kilometer bound, billed one-way.",
  },
});

const msi = await prisma.customer.upsert({
  where: { name: "MSI Transport B.V." },
  update: {
    status: "ACTIVE",
    billableKmLogic: "TOTAL_ROUTE",
    notes: "Seed customer. Uses price per kilometer on total route kilometers.",
  },
  create: {
    name: "MSI Transport B.V.",
    status: "ACTIVE",
    billableKmLogic: "TOTAL_ROUTE",
    notes: "Seed customer. Uses price per kilometer on total route kilometers.",
  },
});

await prisma.customerTariff.upsert({
  where: {
    customerId_name: {
      customerId: msi.id,
      name: "MSI price per km",
    },
  },
  update: {
    type: "PRICE_PER_KM",
    billableKmLogic: "TOTAL_ROUTE",
    pricePerKm: 1.5,
    isActive: true,
    notes: "MSI tariff logic: price per kilometer, total route kilometers.",
  },
  create: {
    customerId: msi.id,
    name: "MSI price per km",
    type: "PRICE_PER_KM",
    billableKmLogic: "TOTAL_ROUTE",
    pricePerKm: 1.5,
    isActive: true,
    notes: "MSI tariff logic: price per kilometer, total route kilometers.",
  },
});

const manualCustomerNames = [
  "Eucon",
  "Maersk",
  "MSC",
];

for (const customerName of manualCustomerNames) {
  const manualCustomer = await prisma.customer.upsert({
    where: { name: customerName },
    update: {
      status: "ACTIVE",
      billableKmLogic: "MANUAL",
      notes: "Seed customer. Manual pricing until customer-specific tariff is configured.",
    },
    create: {
      name: customerName,
      status: "ACTIVE",
      billableKmLogic: "MANUAL",
      notes: "Seed customer. Manual pricing until customer-specific tariff is configured.",
    },
  });

  await prisma.customerTariff.upsert({
    where: {
      customerId_name: {
        customerId: manualCustomer.id,
        name: `${customerName} manual pricing`,
      },
    },
    update: {
      type: "MANUAL",
      billableKmLogic: "MANUAL",
      isActive: true,
      notes: "Manual pricing placeholder.",
    },
    create: {
      customerId: manualCustomer.id,
      name: `${customerName} manual pricing`,
      type: "MANUAL",
      billableKmLogic: "MANUAL",
      isActive: true,
      notes: "Manual pricing placeholder.",
    },
  });
}

console.log("Seeded customers: Vepco, MSI, Eucon, Maersk, MSC");

const ectDelta = await seedAddress({
  name: "ECT Delta",
  city: "Maasvlakte Rotterdam",
  country: "NL",
  type: "TERMINAL",
  terminalCode: "ECT_DELTA",
  notes: "Seed address. Exact street/postal code can be confirmed later.",
});

const rwg = await seedAddress({
  name: "RWG Container Terminal",
  street: "Amoerweg 50",
  city: "Maasvlakte Rotterdam",
  postalCode: "3199 KD",
  country: "NL",
  type: "TERMINAL",
  terminalCode: "RWG",
  notes: "Seed address.",
});

const apmtII = await seedAddress({
  name: "APMT II",
  street: "Europaweg 910",
  city: "Maasvlakte Rotterdam",
  country: "NL",
  type: "TERMINAL",
  terminalCode: "APMT_II",
  notes: "Seed address.",
});

const cctMoerdijk = await seedAddress({
  name: "CCT Moerdijk",
  city: "Moerdijk",
  country: "NL",
  type: "TERMINAL",
  terminalCode: "CCT_MOERDIJK",
  notes: "Seed address.",
});

const alconet = await seedAddress({
  name: "Alconet",
  city: "Rotterdam",
  country: "NL",
  type: "DEPOT",
  notes: "Seed address. Exact street/postal code can be confirmed later.",
});

const waalhaven = await seedAddress({
  name: "Waalhaven",
  city: "Rotterdam",
  country: "NL",
  type: "PORT",
  portCode: "WAALHAVEN",
  notes: "Seed address.",
});

const stolthavenMoerdijk = await seedAddress({
  name: "Stolthaven Moerdijk",
  street: "Middenweg 30",
  city: "Moerdijk",
  country: "NL",
  type: "DEPOT",
  notes: "Seed address.",
});

const nedcargoWaddinxveen = await seedAddress({
  name: "Nedcargo Waddinxveen",
  city: "Waddinxveen",
  country: "NL",
  type: "CUSTOMER_SITE",
  notes: "Seed address. Exact street/postal code can be confirmed later.",
});

const rdcAlphen = await seedAddress({
  name: "RDC Alphen",
  city: "Alphen aan den Rijn",
  country: "NL",
  type: "CUSTOMER_SITE",
  notes: "Seed address. Exact street/postal code can be confirmed later.",
});

const dsvMoerdijk = await seedAddress({
  name: "DSV Moerdijk",
  street: "Exportweg 3",
  city: "Moerdijk",
  postalCode: "4782 JA",
  country: "NL",
  type: "CUSTOMER_SITE",
  notes: "Seed address.",
});

console.log(
  `Seeded addresses: ${[
    ectDelta.name,
    rwg.name,
    apmtII.name,
    cctMoerdijk.name,
    alconet.name,
    waalhaven.name,
    stolthavenMoerdijk.name,
    nedcargoWaddinxveen.name,
    rdcAlphen.name,
    dsvMoerdijk.name,
  ].join(", ")}`
);

const truckSeeds = [
  {
    name: "Saleks 1",
    licensePlate: "04-BRS-7",
    vin: "WMA06XZZ9HM741490",
    notes: "Seed truck: Saleks 1.",
  },
  {
    name: "Saleks 2",
    licensePlate: "SALEKS-2",
    notes: "Seed truck: Saleks 2.",
  },
  {
    name: "Saleks 3",
    licensePlate: "SALEKS-3",
    notes: "Seed truck: Saleks 3.",
  },
  {
    name: "Saleks 4",
    licensePlate: "SALEKS-4",
    notes: "Seed truck: Saleks 4.",
  },
  {
    name: "Saleks 5",
    licensePlate: "SALEKS-5",
    notes: "Seed truck: Saleks 5.",
  },
];

const seededTrucks = [];

for (const truckSeed of truckSeeds) {
  const seededTruck = await prisma.truck.upsert({
    where: { licensePlate: truckSeed.licensePlate },
    update: {
      name: truckSeed.name,
      vin: truckSeed.vin,
      status: "ACTIVE",
      euroClass: "Euro 6",
      defaultFuelConsumptionLPer100Km: 30,
      notes: truckSeed.notes,
    },
    create: {
      name: truckSeed.name,
      licensePlate: truckSeed.licensePlate,
      vin: truckSeed.vin,
      status: "ACTIVE",
      euroClass: "Euro 6",
      defaultFuelConsumptionLPer100Km: 30,
      notes: truckSeed.notes,
    },
  });

  seededTrucks.push(seededTruck);
}

const saleks1 = seededTrucks.find((truck) => truck.name === "Saleks 1");

if (!saleks1) {
  throw new Error("Saleks 1 was not seeded");
}

console.log(`Seeded trucks: ${seededTrucks.map((truck) => truck.name).join(", ")}`);

  const driver = await prisma.driver.create({
    data: {
      firstName: "Test",
      lastName: "Driver",
      status: "ACTIVE",
      notes: "Initial test driver.",
    },
  });

const pickupAddress = rwg;
const deliveryAddress = cctMoerdijk;

await prisma.course.upsert({
  where: { courseNumber: "TEST-001" },
  update: {
    customerId: vepco.id,
    truckId: saleks1.id,
    driverId: driver.id,
    pickupAddressId: pickupAddress.id,
    deliveryAddressId: deliveryAddress.id,
    status: "PLANNED",
    plannedDate: new Date(),
    containerNumber: "TEST1234567",
    referenceNumber: "SEED-TEST-001",
    totalKm: 150,
    billableKm: 75,
    nonBillableKm: 75,
    kmSource: "manual_seed",
    manualKmOverride: true,
    kmOverrideNotes: "Seed test course with one-way billable kilometers.",
    agreedPrice: 299,
    notes: "Initial seeded test course.",
  },
  create: {
    courseNumber: "TEST-001",
    customerId: vepco.id,
    truckId: saleks1.id,
    driverId: driver.id,
    pickupAddressId: pickupAddress.id,
    deliveryAddressId: deliveryAddress.id,
    status: "PLANNED",
    plannedDate: new Date(),
    containerNumber: "TEST1234567",
    referenceNumber: "SEED-TEST-001",
    totalKm: 150,
    billableKm: 75,
    nonBillableKm: 75,
    kmSource: "manual_seed",
    manualKmOverride: true,
    kmOverrideNotes: "Seed test course with one-way billable kilometers.",
    agreedPrice: 299,
    notes: "Initial seeded test course.",
  },
});

  console.log("Seeding finished.");
}

main()
  .catch((error) => {
    console.error("Seeding failed:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });