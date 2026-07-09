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

type SeedSettingInput = {
  key: string;
  value: string;
  valueType: "STRING" | "NUMBER" | "BOOLEAN" | "JSON";
  description: string;
  group: string;
  isPublic?: boolean;
};

async function seedSetting(data: SeedSettingInput) {
  return prisma.appSetting.upsert({
    where: { key: data.key },
    update: {
      value: data.value,
      valueType: data.valueType,
      description: data.description,
      group: data.group,
      isPublic: data.isPublic ?? false,
    },
    create: {
      key: data.key,
      value: data.value,
      valueType: data.valueType,
      description: data.description,
      group: data.group,
      isPublic: data.isPublic ?? false,
    },
  });
}

async function main() {
  console.log("Start seeding...");

  const settings = [
  {
    key: "fuel.price_per_liter",
    value: "1.55",
    valueType: "NUMBER" as const,
    description: "Default diesel fuel price per liter in EUR.",
    group: "fuel",
  },
  {
    key: "fuel.default_consumption_l_per_100km",
    value: "30",
    valueType: "NUMBER" as const,
    description: "Default truck fuel consumption in liters per 100 km.",
    group: "fuel",
  },
  {
    key: "waiting.price_per_hour",
    value: "50",
    valueType: "NUMBER" as const,
    description: "Default waiting price per hour in EUR.",
    group: "waiting",
  },
  {
    key: "waiting.free_hours",
    value: "2",
    valueType: "NUMBER" as const,
    description: "Default free waiting hours before charging waiting time.",
    group: "waiting",
  },
  {
    key: "tariff.msi.price_per_km",
    value: "1.50",
    valueType: "NUMBER" as const,
    description: "MSI default price per total route kilometer in EUR.",
    group: "tariff",
  },
  {
    key: "margin.thresholds",
    value: JSON.stringify({
      criticalPercent: 5,
      warningPercent: 15,
      targetPercent: 25,
    }),
    valueType: "JSON" as const,
    description: "Margin thresholds for profitability warnings.",
    group: "finance",
  },
  {
    key: "route_cache.days",
    value: "30",
    valueType: "NUMBER" as const,
    description: "Number of days to keep cached route calculations.",
    group: "routing",
  },
];

for (const setting of settings) {
  await seedSetting(setting);
}

console.log(`Seeded settings: ${settings.length}`);

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

const vepcoTariffs = [
  { name: "Vepco under 10 km", minKm: 0, maxKm: 9.99, fixedPrice: 90 },
  { name: "Vepco 10 km", minKm: 10, maxKm: 10, fixedPrice: 194 },

  { name: "Vepco 11-15 km", minKm: 11, maxKm: 15, fixedPrice: 214 },
  { name: "Vepco 16-20 km", minKm: 16, maxKm: 20, fixedPrice: 218 },
  { name: "Vepco 21-25 km", minKm: 21, maxKm: 25, fixedPrice: 231 },
  { name: "Vepco 26-30 km", minKm: 26, maxKm: 30, fixedPrice: 240 },
  { name: "Vepco 31-35 km", minKm: 31, maxKm: 35, fixedPrice: 244 },
  { name: "Vepco 36-40 km", minKm: 36, maxKm: 40, fixedPrice: 249 },
  { name: "Vepco 41-45 km", minKm: 41, maxKm: 45, fixedPrice: 253 },
  { name: "Vepco 46-50 km", minKm: 46, maxKm: 50, fixedPrice: 262 },
  { name: "Vepco 51-55 km", minKm: 51, maxKm: 55, fixedPrice: 270 },
  { name: "Vepco 56-60 km", minKm: 56, maxKm: 60, fixedPrice: 279 },
  { name: "Vepco 61-65 km", minKm: 61, maxKm: 65, fixedPrice: 283 },
  { name: "Vepco 66-70 km", minKm: 66, maxKm: 70, fixedPrice: 292 },
  { name: "Vepco 71-75 km", minKm: 71, maxKm: 75, fixedPrice: 299 },
  { name: "Vepco 76-80 km", minKm: 76, maxKm: 80, fixedPrice: 306 },
  { name: "Vepco 81-85 km", minKm: 81, maxKm: 85, fixedPrice: 311 },
  { name: "Vepco 86-90 km", minKm: 86, maxKm: 90, fixedPrice: 315 },
  { name: "Vepco 91-95 km", minKm: 91, maxKm: 95, fixedPrice: 320 },
  { name: "Vepco 96-100 km", minKm: 96, maxKm: 100, fixedPrice: 325 },
  { name: "Vepco 101-110 km", minKm: 101, maxKm: 110, fixedPrice: 341 },
  { name: "Vepco 111-120 km", minKm: 111, maxKm: 120, fixedPrice: 361 },
  { name: "Vepco 121-130 km", minKm: 121, maxKm: 130, fixedPrice: 377 },
  { name: "Vepco 131-140 km", minKm: 131, maxKm: 140, fixedPrice: 393 },
  { name: "Vepco 141-150 km", minKm: 141, maxKm: 150, fixedPrice: 410 },
  { name: "Vepco 151-160 km", minKm: 151, maxKm: 160, fixedPrice: 434 },
  { name: "Vepco 161-170 km", minKm: 161, maxKm: 170, fixedPrice: 459 },
  { name: "Vepco 171-180 km", minKm: 171, maxKm: 180, fixedPrice: 484 },
  { name: "Vepco 181-190 km", minKm: 181, maxKm: 190, fixedPrice: 509 },
  { name: "Vepco 191-200 km", minKm: 191, maxKm: 200, fixedPrice: 535 },
  { name: "Vepco 201-210 km", minKm: 201, maxKm: 210, fixedPrice: 559 },
  { name: "Vepco 211-220 km", minKm: 211, maxKm: 220, fixedPrice: 585 },
  { name: "Vepco 221-230 km", minKm: 221, maxKm: 230, fixedPrice: 601 },
  { name: "Vepco 231-240 km", minKm: 231, maxKm: 240, fixedPrice: 619 },
  { name: "Vepco 241-250 km", minKm: 241, maxKm: 250, fixedPrice: 635 },
  { name: "Vepco 251-260 km", minKm: 251, maxKm: 260, fixedPrice: 652 },
  { name: "Vepco 261-270 km", minKm: 261, maxKm: 270, fixedPrice: 666 },
  { name: "Vepco 271-280 km", minKm: 271, maxKm: 280, fixedPrice: 682 },
  { name: "Vepco 281-290 km", minKm: 281, maxKm: 290, fixedPrice: 698 },
  { name: "Vepco 291-300 km", minKm: 291, maxKm: 300, fixedPrice: 715 },
];

for (const tariff of vepcoTariffs) {
  await prisma.customerTariff.upsert({
    where: {
      customerId_name: {
        customerId: vepco.id,
        name: tariff.name,
      },
    },
    update: {
      type: "FIXED_TABLE_UPPER_BOUND",
      billableKmLogic: "ONE_WAY",
      minKm: tariff.minKm,
      maxKm: tariff.maxKm,
      fixedPrice: tariff.fixedPrice,
      pricePerKm: null,
      waitingHourlyRate: null,
      portFeeIncluded: false,
      isActive: true,
      notes: "Vepco upper-bound tariff. Applied to BILLABLE_KM only.",
    },
    create: {
      customerId: vepco.id,
      name: tariff.name,
      type: "FIXED_TABLE_UPPER_BOUND",
      billableKmLogic: "ONE_WAY",
      minKm: tariff.minKm,
      maxKm: tariff.maxKm,
      fixedPrice: tariff.fixedPrice,
      pricePerKm: null,
      waitingHourlyRate: null,
      portFeeIncluded: false,
      isActive: true,
      notes: "Vepco upper-bound tariff. Applied to BILLABLE_KM only.",
    },
  });
}

console.log(`Seeded Vepco tariffs: ${vepcoTariffs.length}`);

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

console.log("Seeded MSI tariff: €1.50 per km on TOTAL_ROUTE");

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