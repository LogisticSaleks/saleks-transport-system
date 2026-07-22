import AddressManagement, {
  type AddressManagementRow,
} from "@/components/settings/AddressManagement";
import { AppShell } from "@/components/layout/AppShell";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AddressesSettingsPage() {
  const rawAddresses =
    await prisma.address.findMany({
      select: {
        id: true,
        name: true,
        street: true,
        city: true,
        postalCode: true,
        country: true,
        latitude: true,
        longitude: true,
        type: true,
        portCode: true,
        terminalCode: true,
        isActive: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [
        {
          isActive: "desc",
        },
        {
          name: "asc",
        },
        {
          city: "asc",
        },
      ],
    });

  const addresses: AddressManagementRow[] =
    rawAddresses.map((address) => ({
      id: address.id,
      name: address.name,
      street: address.street,
      city: address.city,
      postalCode: address.postalCode,
      country: address.country,
      latitude: toNullableNumber(
        address.latitude,
      ),
      longitude: toNullableNumber(
        address.longitude,
      ),
      type: address.type,
      portCode: address.portCode,
      terminalCode:
        address.terminalCode,
      isActive: address.isActive,
      notes: address.notes,
      createdAt:
        address.createdAt.toISOString(),
      updatedAt:
        address.updatedAt.toISOString(),
    }));

  return (
    <AppShell title="Address Book">
      <AddressManagement
        initialAddresses={addresses}
      />
    </AppShell>
  );
}

function toNullableNumber(
  value: unknown,
): number | null {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const parsedValue = Number(value);

  return Number.isFinite(parsedValue)
    ? parsedValue
    : null;
}