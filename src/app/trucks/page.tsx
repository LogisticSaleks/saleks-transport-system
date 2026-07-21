import { AppShell } from "@/components/layout/AppShell";
import TruckManagement, {
  type TruckRow,
} from "@/components/trucks/TruckManagement";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function TrucksPage() {
  const trucks = await prisma.truck.findMany({
    orderBy: [
      {
        name: "asc",
      },
      {
        licensePlate: "asc",
      },
    ],
  });

  return (
    <AppShell title="Trucks">
      <TruckManagement initialTrucks={trucks.map(mapTruckForClient)} />
    </AppShell>
  );
}

function mapTruckForClient(truck: {
  id: string;
  name: string;
  licensePlate: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): TruckRow {
  const truckRecord = truck as unknown as Record<string, unknown>;

  return {
    id: truck.id,
    name: truck.name,
    licensePlate: truck.licensePlate,
    status: truck.status,
    defaultFuelConsumptionL100Km: getTruckFuelConsumption(truckRecord),
    createdAt: truck.createdAt.toISOString(),
    updatedAt: truck.updatedAt.toISOString(),
  };
}

function getTruckFuelConsumption(
  truckRecord: Record<string, unknown>,
): number | null {
  const possibleFieldNames = [
    "defaultFuelConsumptionL100Km",
    "defaultFuelConsumptionLitersPer100Km",
    "fuelConsumptionLitersPer100Km",
    "fuelConsumptionL100Km",
    "fuelConsumption",
  ];

  for (const fieldName of possibleFieldNames) {
    if (fieldName in truckRecord) {
      return toNullableNumber(truckRecord[fieldName]);
    }
  }

  return null;
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const parsedValue = Number(value);

    return Number.isFinite(parsedValue) ? parsedValue : null;
  }

  if (
    typeof value === "object" &&
    "toNumber" in value &&
    typeof value.toNumber === "function"
  ) {
    const parsedValue = value.toNumber();

    return Number.isFinite(parsedValue) ? parsedValue : null;
  }

  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : null;
}