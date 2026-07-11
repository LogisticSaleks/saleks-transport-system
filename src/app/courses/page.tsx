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
  const [trucks, customers, rawAddresses] =
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