import FuelManagement, {
  type FuelTruckOption,
} from "@/components/fuel/FuelManagement";
import { AppShell } from "@/components/layout/AppShell";
import { loadCurrentUserAccess } from "@/lib/auth/currentUser";
import { roleHasPermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function FuelPage() {
  const currentUserAccess = await loadCurrentUserAccess();

  const canReadFuel =
    currentUserAccess.status === "AUTHORIZED" &&
    currentUserAccess.profile !== null &&
    roleHasPermission(currentUserAccess.profile.role, "fuel:read");

  if (!canReadFuel) {
    return (
      <AppShell title="Fuel">
        <FuelAccessDeniedPanel />
      </AppShell>
    );
  }

  const trucks = await prisma.truck.findMany({
    orderBy: [
      {
        name: "asc",
      },
      {
        licensePlate: "asc",
      },
    ],
    select: {
      id: true,
      name: true,
      licensePlate: true,
      status: true,
    },
  });

  return (
    <AppShell title="Fuel">
      <FuelManagement
        initialTrucks={trucks.map(mapTruckForFuel)}
        initialFromDate=""
        initialToDate=""
      />
    </AppShell>
  );
}

function FuelAccessDeniedPanel() {
  return (
    <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5 shadow-sm">
      <h2 className="text-lg font-bold text-slate-950">
        Fuel access blocked
      </h2>

      <p className="mt-2 text-sm font-medium leading-6 text-amber-800">
        Твоята роля няма право да вижда Fuel страницата.
      </p>
    </section>
  );
}

function mapTruckForFuel(truck: {
  id: string;
  name: string;
  licensePlate: string;
  status: string;
}): FuelTruckOption {
  return {
    id: truck.id,
    name: truck.name,
    licensePlate: truck.licensePlate,
    status: truck.status,
  };
}
