import CourseTable from "@/components/courses/CourseTable";
import type { CourseRowData } from "@/components/courses/CourseRow";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type AddressForDeduplication = {
  name: string;
  street: string | null;
  city: string | null;
  postalCode: string | null;
  country: string;
};

type AddressForDisplay = AddressForDeduplication & {
  id: string;
};

type CourseStopForRow = {
  type: "PICKUP" | "LOAD_UNLOAD" | "EXTRA" | "RETURN";
  addressId: string | null;
  label: string | null;
  address: AddressForDisplay | null;
};

type CourseCostForRow = {
  type:
    | "FUEL"
    | "TOLL"
    | "PORT_FEE"
    | "REPAIR"
    | "WASH"
    | "PARKING"
    | "DRIVER_COST"
    | "OTHER";
  amount: unknown;
};

export default async function CoursesPage() {
  const [
    rawTrucks,
    rawCustomers,
    rawAddresses,
    rawCourses,
  ] = await Promise.all([
    prisma.truck.findMany({
      where: {
        status: "ACTIVE",
      },
      select: {
        id: true,
        name: true,
        licensePlate: true,
        defaultFuelConsumptionLPer100Km: true,
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

    prisma.course.findMany({
      include: {
        pickupAddress: {
          select: {
            id: true,
            name: true,
            street: true,
            city: true,
            postalCode: true,
            country: true,
          },
        },
        deliveryAddress: {
          select: {
            id: true,
            name: true,
            street: true,
            city: true,
            postalCode: true,
            country: true,
          },
        },
        stops: {
          include: {
            address: {
              select: {
                id: true,
                name: true,
                street: true,
                city: true,
                postalCode: true,
                country: true,
              },
            },
          },
          orderBy: {
            sequence: "asc",
          },
        },
        costs: {
          select: {
            type: true,
            amount: true,
          },
          orderBy: {
            costDate: "asc",
          },
        },
      },
      orderBy: [
        {
          plannedDate: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
    }),
  ]);

  const trucks = rawTrucks.map((truck) => ({
    id: truck.id,
    name: truck.name,
    licensePlate: truck.licensePlate,
    defaultFuelConsumptionLPer100Km: Number(
      truck.defaultFuelConsumptionLPer100Km,
    ),
  }));

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

  const initialCourses: CourseRowData[] =
    rawCourses.map((course, index) =>
      mapCourseToRow(course, index + 1),
    );

  return (
    <CourseTable
      trucks={trucks}
      customers={customers}
      addresses={addresses}
      initialCourses={initialCourses}
    />
  );
}

function mapCourseToRow(
  course: {
    id: string;
    truckId: string | null;
    customerId: string;
    courseType: "ROUND_TRIP" | "SHUNT";
    pickupAddressId: string | null;
    deliveryAddressId: string | null;
    totalKm: unknown;
    billableKm: unknown;
    containerNumber: string | null;
    waitingHours: unknown;
    waitingAmount: unknown;
    agreedPrice: unknown;
    portFeeAmount: unknown;
    plannedDate: Date | null;
    createdAt: Date;
    pickupAddress: AddressForDisplay | null;
    deliveryAddress: AddressForDisplay | null;
    stops: CourseStopForRow[];
    costs: CourseCostForRow[];
  },
  id: number,
): CourseRowData {
  const pickupStop = findStop(
    course.stops,
    "PICKUP",
  );

  const loadingStop = findStop(
    course.stops,
    "LOAD_UNLOAD",
  );

  const extraStop = findStop(
    course.stops,
    "EXTRA",
  );

  const returnStop = findStop(
    course.stops,
    "RETURN",
  );

  const pickupAddress =
    pickupStop?.address ??
    course.pickupAddress;

  const loadingAddress =
    loadingStop?.address ??
    course.deliveryAddress;

  const fuelCost = sumCosts(
    course.costs,
    "FUEL",
  );

  const tollCost = sumCosts(
    course.costs,
    "TOLL",
  );

  const portCostFromCosts = sumCosts(
    course.costs,
    "PORT_FEE",
  );

  const totalCost = course.costs.reduce(
    (sum, cost) =>
      sum + toNumber(cost.amount),
    0,
  );

  const agreedPrice = toNullableNumber(
    course.agreedPrice,
  );

  const waitingAmount =
    toNullableNumber(
      course.waitingAmount,
    ) ?? 0;

  const storedRevenue =
    (agreedPrice ?? 0) +
    waitingAmount;

  const storedProfit =
    storedRevenue - totalCost;

  const waitingHours = toNullableNumber(
    course.waitingHours,
  );

  const portFeeAmount =
    toNullableNumber(course.portFeeAmount) ??
    portCostFromCosts;

  return {
    id,
    databaseId: course.id,
    filterDate: formatDateInput(
      course.plannedDate ??
        course.createdAt,
    ),

    truckId: course.truckId ?? "",
    customerId: course.customerId,
    courseType: course.courseType,

    pickupAddressId:
      pickupStop?.addressId ??
      course.pickupAddressId ??
      "",
    pickupAddressText:
      pickupStop?.label ??
      formatAddress(pickupAddress),

    loadingUnloadingAddressId:
      loadingStop?.addressId ??
      course.deliveryAddressId ??
      "",
    loadingUnloadingAddressText:
      loadingStop?.label ??
      formatAddress(loadingAddress),

    extraAddressId:
      extraStop?.addressId ?? "",
    extraAddressText:
      extraStop?.label ??
      formatAddress(extraStop?.address ?? null),

    returnAddressId:
      returnStop?.addressId ?? "",
    returnAddressText:
      returnStop?.label ??
      formatAddress(returnStop?.address ?? null),

    totalKm: formatNullableNumber(
      course.totalKm,
    ),
    billableKm: formatNullableNumber(
      course.billableKm,
    ),

    containerNumber:
      course.containerNumber ?? "",

    waitingMinutes:
      waitingHours === null
        ? ""
        : formatPlainNumber(
            waitingHours * 60,
          ),

    price:
      agreedPrice === null
        ? ""
        : agreedPrice.toFixed(2),

    tollFee:
      tollCost > 0
        ? tollCost.toFixed(2)
        : "",

    portFee:
      portFeeAmount !== null &&
      portFeeAmount > 0
        ? portFeeAmount.toFixed(2)
        : "",

    fuelCost:
      fuelCost > 0
        ? fuelCost.toFixed(2)
        : "",

    totalCost:
      totalCost > 0
        ? totalCost.toFixed(2)
        : "",

    profit:
      agreedPrice !== null ||
      waitingAmount > 0 ||
      totalCost > 0
        ? storedProfit.toFixed(2)
        : "",

    /*
     * Pricing status се преизчислява от CourseRow
     * с актуалните настройки.
     */
    status: "",
  };
}

function findStop(
  stops: CourseStopForRow[],
  type: CourseStopForRow["type"],
): CourseStopForRow | undefined {
  return stops.find(
    (stop) => stop.type === type,
  );
}

function sumCosts(
  costs: CourseCostForRow[],
  type: CourseCostForRow["type"],
): number {
  return costs
    .filter((cost) => cost.type === type)
    .reduce(
      (sum, cost) =>
        sum + toNumber(cost.amount),
      0,
    );
}

function toNullableNumber(
  value: unknown,
): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function toNumber(value: unknown): number {
  return toNullableNumber(value) ?? 0;
}

function formatNullableNumber(
  value: unknown,
): string {
  const parsed = toNullableNumber(value);

  return parsed === null
    ? ""
    : formatPlainNumber(parsed);
}

function formatPlainNumber(
  value: number,
): string {
  if (Number.isInteger(value)) {
    return String(value);
  }

  return String(
    Math.round(value * 100) / 100,
  );
}

function formatDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatAddress(
  address: AddressForDisplay | null,
): string {
  if (!address) {
    return "";
  }

  const cityLine = [
    address.postalCode,
    address.city,
  ]
    .filter(Boolean)
    .join(" ");

  const details = [
    address.street,
    cityLine,
    address.country,
  ].filter(Boolean);

  if (details.length === 0) {
    return address.name;
  }

  return `${address.name} — ${details.join(", ")}`;
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