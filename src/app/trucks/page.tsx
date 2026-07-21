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
  vin: string | null;
  status: string;
  euroClass: string;
  defaultFuelConsumptionLPer100Km: unknown;
  monthlyLeaseCost: unknown;
  monthlyInsuranceCost: unknown;
  monthlyRoadTaxCost: unknown;
  monthlyOtherFixedCost: unknown;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}): TruckRow {
  return {
    id: truck.id,
    name: truck.name,
    licensePlate: truck.licensePlate,
    vin: truck.vin,
    status: truck.status,
    euroClass: truck.euroClass,
    defaultFuelConsumptionLPer100Km: toNumber(
      truck.defaultFuelConsumptionLPer100Km,
    ),
    monthlyLeaseCost: toNumber(truck.monthlyLeaseCost),
    monthlyInsuranceCost: toNumber(truck.monthlyInsuranceCost),
    monthlyRoadTaxCost: toNumber(truck.monthlyRoadTaxCost),
    monthlyOtherFixedCost: toNumber(truck.monthlyOtherFixedCost),
    notes: truck.notes,
    createdAt: truck.createdAt.toISOString(),
    updatedAt: truck.updatedAt.toISOString(),
  };
}

function toNumber(value: unknown): number {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsedValue = Number(value);

    return Number.isFinite(parsedValue) ? parsedValue : 0;
  }

  if (
    typeof value === "object" &&
    "toNumber" in value &&
    typeof value.toNumber === "function"
  ) {
    const parsedValue = value.toNumber();

    return Number.isFinite(parsedValue) ? parsedValue : 0;
  }

  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : 0;
}