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

  const truck = await prisma.truck.upsert({
    where: { licensePlate: "04-BRS-7" },
    update: {},
    create: {
      name: "Saleks 1",
      licensePlate: "04-BRS-7",
      vin: "WMA06XZZ9HM741490",
      status: "ACTIVE",
      notes: "Initial test truck.",
    },
  });

  const driver = await prisma.driver.create({
    data: {
      firstName: "Test",
      lastName: "Driver",
      status: "ACTIVE",
      notes: "Initial test driver.",
    },
  });

  const pickupAddress = await prisma.address.create({
    data: {
      name: "RWG Container Terminal",
      street: "Amoerweg 50",
      city: "Maasvlakte Rotterdam",
      postalCode: "3199 KD",
      country: "NL",
      type: "TERMINAL",
      notes: "Initial test terminal address.",
    },
  });

  const deliveryAddress = await prisma.address.create({
    data: {
      name: "CCT Moerdijk",
      city: "Moerdijk",
      country: "NL",
      type: "TERMINAL",
      notes: "Initial test delivery address.",
    },
  });

await prisma.course.upsert({
  where: { courseNumber: "TEST-001" },
  update: {
    customerId: vepco.id,
    truckId: truck.id,
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
    truckId: truck.id,
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