import CourseTable from "@/components/courses/CourseTable";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type AddressForDeduplication = {
  name: string;
  street: string | null;
  city: string | null;
  postalCode: string | null;
  country: string;
};

export default async function CoursesPage() {
  const [trucks, rawCustomers, rawAddresses] =
    await Promise.all([
      prisma.truck.findMany({
        where: {
          status: "ACTIVE",
        },
        select: {
          id: true,
          name: true,
          licensePlate: true,
        },
        orderBy: [
          {
            name: "asc",
          },
          {
            licensePlate: "asc",
          },
        ],
      }),

      prisma.customer.findMany({
        where: {
          status: "ACTIVE",
        },
        select: {
          id: true,
          name: true,
          tariffs: {
            where: {
              isActive: true,
            },
            select: {
              type: true,
              pricePerKm: true,
              fixedPrice: true,
            },
            orderBy: {
              createdAt: "desc",
            },
          },
        },
        orderBy: {
          name: "asc",
        },
      }),

      prisma.address.findMany({
        select: {
          id: true,
          name: true,
          street: true,
          city: true,
          postalCode: true,
          country: true,
          type: true,
        },
        orderBy: [
          {
            name: "asc",
          },
          {
            city: "asc",
          },
        ],
      }),
    ]);

  const customers = rawCustomers.map((customer) => ({
    id: customer.id,
    name: customer.name,
    tariffs: customer.tariffs.map((tariff) => ({
      type: tariff.type,
      pricePerKm:
        tariff.pricePerKm === null
          ? null
          : Number(tariff.pricePerKm),
      fixedPrice:
        tariff.fixedPrice === null
          ? null
          : Number(tariff.fixedPrice),
    })),
  }));

  const addresses = Array.from(
    new Map(
      rawAddresses.map((address) => [
        createAddressKey(address),
        address,
      ]),
    ).values(),
  );

  return (
    <CourseTable
      trucks={trucks}
      customers={customers}
      addresses={addresses}
    />
  );
}

function createAddressKey(
  address: AddressForDeduplication,
): string {
  return [
    address.name,
    address.street,
    address.postalCode,
    address.city,
    address.country,
  ]
    .map((value) => normalizeAddressPart(value))
    .join("|");
}

function normalizeAddressPart(
  value: string | null,
): string {
  return (value ?? "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("en-US");
}