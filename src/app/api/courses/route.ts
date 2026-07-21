import { NextResponse } from "next/server";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COURSE_STATUSES = [
  "DRAFT",
  "PLANNED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "INVOICED",
] as const;

const COURSE_TYPES = ["ROUND_TRIP", "SHUNT"] as const;

const TARIFF_TYPES = [
  "FIXED_TABLE_UPPER_BOUND",
  "DISTANCE_TABLE",
  "PRICE_PER_KM",
  "FIXED_PRICE",
  "SHUNT",
  "WAITING_TIME",
  "MANUAL",
] as const;

const CUSTOMER_BILLABLE_KM_LOGICS = [
  "TOTAL_ROUTE",
  "ONE_WAY",
  "SELECTED_LEGS",
  "FIXED_PRICE",
  "MANUAL",
] as const;

const COURSE_STOP_TYPES = [
  "PICKUP",
  "LOAD_UNLOAD",
  "EXTRA",
  "RETURN",
] as const;

const COST_TYPES = [
  "FUEL",
  "TOLL",
  "PORT_FEE",
  "REPAIR",
  "WASH",
  "PARKING",
  "DRIVER_COST",
  "OTHER",
] as const;

const COURSE_ROW_COST_MARKER = "SOURCE:COURSE_ROW";

type CourseStatusValue = (typeof COURSE_STATUSES)[number];
type CourseTypeValue = (typeof COURSE_TYPES)[number];
type TariffTypeValue = (typeof TARIFF_TYPES)[number];
type CustomerBillableKmLogicValue =
  (typeof CUSTOMER_BILLABLE_KM_LOGICS)[number];
type CourseStopTypeValue = (typeof COURSE_STOP_TYPES)[number];
type CostTypeValue = (typeof COST_TYPES)[number];

type JsonObject = Record<string, unknown>;

type CourseWriteData = {
  courseNumber?: string | null;
  customerId?: string;
  customerTariffId?: string | null;
  truckId?: string | null;
  driverId?: string | null;
  courseType?: CourseTypeValue;

  pickupAddressId?: string | null;
  deliveryAddressId?: string | null;

  status?: CourseStatusValue;

  plannedDate?: Date | null;
  startedAt?: Date | null;
  completedAt?: Date | null;

  containerNumber?: string | null;
  bookingNumber?: string | null;
  referenceNumber?: string | null;
  tarCode?: string | null;
  acceptanceRef?: string | null;

  totalKm?: number | null;
  billableKm?: number | null;
  nonBillableKm?: number | null;

  kmSource?: string | null;
  manualKmOverride?: boolean;
  kmOverrideNotes?: string | null;

  agreedPrice?: number | null;
  waitingHours?: number | null;
  waitingAmount?: number | null;
  portFeeAmount?: number | null;

  tariffNameAtBooking?: string | null;
  tariffTypeAtBooking?: TariffTypeValue | null;
  pricingMethodAtBooking?: string | null;
  pricePerKmAtBooking?: number | null;
  fixedPriceAtBooking?: number | null;
  waitingHourlyRateAtBooking?: number | null;
  billableKmLogicAtBooking?: CustomerBillableKmLogicValue | null;
  portFeeIncludedAtBooking?: boolean | null;
  pricingSnapshotCreatedAt?: Date | null;

  notes?: string | null;
};

type CourseStopWriteData = {
  sequence: number;
  type: CourseStopTypeValue;
  addressId: string | null;
  addressText: string | null;
  label: string | null;
  notes: string | null;
};

type ResolvedCourseStopData = {
  sequence: number;
  type: CourseStopTypeValue;
  addressId: string;
  label: string | null;
  notes: string | null;
};

type ParsedAddressData = {
  name: string;
  street: string | null;
  city: string | null;
  postalCode: string | null;
  country: string;
};

type RouteLegWriteData = {
  sequence: number;
  fromAddressId: string;
  toAddressId: string;
  description: string | null;
  totalDistanceKm: number | null;
  billableDistanceKm: number | null;
  isBillable: boolean;
  notes: string | null;
};

type CourseCostWriteData = {
  truckId: string | null;
  type: CostTypeValue;
  description: string;
  amount: number;
  notes: string | null;
};

type CoursePricingSnapshotWriteData = {
  tariffNameAtBooking: string | null;
  tariffTypeAtBooking: TariffTypeValue | null;
  pricingMethodAtBooking: string | null;
  pricePerKmAtBooking: number | null;
  fixedPriceAtBooking: number | null;
  waitingHourlyRateAtBooking: number | null;
  billableKmLogicAtBooking: CustomerBillableKmLogicValue | null;
  portFeeIncludedAtBooking: boolean | null;
  pricingSnapshotCreatedAt: Date | null;
};

type CustomerTariffSnapshotSource = {
  name: string;
  type: TariffTypeValue;
  billableKmLogic: CustomerBillableKmLogicValue;
  minKm?: unknown;
  maxKm?: unknown;
  fixedPrice: unknown;
  pricePerKm: unknown;
  waitingHourlyRate: unknown;
  portFeeIncluded: boolean;
};

type CoursePricingSnapshotContext = {
  customerId: string | null;
  customerTariffId: string | null;
  billableKm: number | null;
};

type RelatedCourseData = {
  stops: CourseStopWriteData[] | undefined;
  routeLegs: RouteLegWriteData[] | undefined;
  costs: CourseCostWriteData[] | undefined;
};

const COURSE_INCLUDE = {
  customer: {
    select: {
      id: true,
      name: true,
      status: true,
      billableKmLogic: true,
    },
  },
  customerTariff: {
    select: {
      id: true,
      name: true,
      type: true,
      billableKmLogic: true,
      minKm: true,
      maxKm: true,
      fixedPrice: true,
      pricePerKm: true,
      waitingHourlyRate: true,
      portFeeIncluded: true,
      isActive: true,
    },
  },
  truck: {
    select: {
      id: true,
      name: true,
      licensePlate: true,
      status: true,
      defaultFuelConsumptionLPer100Km: true,
    },
  },
  driver: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      status: true,
    },
  },
  pickupAddress: true,
  deliveryAddress: true,
  stops: {
    include: {
      address: true,
    },
    orderBy: {
      sequence: "asc",
    },
  },
  routeLegs: {
    include: {
      fromAddress: true,
      toAddress: true,
    },
    orderBy: {
      sequence: "asc",
    },
  },
  costs: {
    orderBy: {
      costDate: "asc",
    },
  },
} as const;

/**
 * GET /api/courses
 * GET /api/courses?id=COURSE_ID
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const courseId = normalizeOptionalString(url.searchParams.get("id"));

    if (courseId) {
      const course = await prisma.course.findUnique({
        where: {
          id: courseId,
        },
        include: COURSE_INCLUDE,
      });

      if (!course) {
        return errorResponse("Курсът не е намерен.", 404);
      }

      return NextResponse.json({
        course: serializeForJson(course),
      });
    }

    const courses = await prisma.course.findMany({
      include: COURSE_INCLUDE,
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      courses: serializeForJson(courses),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/courses
 *
 * Създава Course, CourseStop, RouteLeg и Cost
 * в една Prisma transaction.
 */
export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);

    const courseData = buildCourseWriteData({
      body,
      requireCustomerId: true,
    });

    const relatedData = buildRelatedCourseData(body);

    const course = await prisma.$transaction(async (transaction) => {
      await validateCustomerTariffMatchesCustomer(transaction, {
        customerId: courseData.customerId ?? null,
        customerTariffId: courseData.customerTariffId ?? null,
      });

      Object.assign(
        courseData,
        await buildCoursePricingSnapshot(transaction, {
          customerId: courseData.customerId ?? null,
          customerTariffId: courseData.customerTariffId ?? null,
          billableKm: courseData.billableKm ?? null,
        }),
      );

      const createdCourse = await transaction.course.create({
        data: courseData as Prisma.CourseUncheckedCreateInput,
      });

      if (relatedData.stops !== undefined) {
        const resolvedStops = await resolveCourseStops(
          transaction,
          relatedData.stops,
        );

        await createCourseStops(
          transaction,
          createdCourse.id,
          resolvedStops,
        );

        await synchronizeCourseAddresses(
          transaction,
          createdCourse.id,
          resolvedStops,
        );

        await createGeneratedRouteLegs(
          transaction,
          createdCourse.id,
          resolvedStops,
        );
      } else {
        await createRouteLegs(
          transaction,
          createdCourse.id,
          relatedData.routeLegs,
        );
      }

      await createCourseCosts(
        transaction,
        createdCourse.id,
        relatedData.costs,
      );

      return readCourseInsideTransaction(
        transaction,
        createdCourse.id,
      );
    });

    return NextResponse.json(
      {
        course: serializeForJson(course),
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  return updateCourse(request);
}

export async function PUT(request: Request) {
  return updateCourse(request);
}

/**
 * DELETE /api/courses?id=COURSE_ID
 */
export async function DELETE(request: Request) {
  try {
    const courseId = await readDeleteCourseId(request);

    if (!courseId) {
      throw new ApiValidationError(
        "Липсва id на курса за изтриване.",
      );
    }

    await prisma.course.delete({
      where: {
        id: courseId,
      },
    });

    return NextResponse.json({
      deleted: true,
      id: courseId,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

async function updateCourse(request: Request) {
  try {
    const body = await readJsonObject(request);
    const courseId = readRequiredString(body.id, "id");

    const courseData = buildCourseWriteData({
      body,
      requireCustomerId: false,
    });

    const relatedData = buildRelatedCourseData(body);

    const hasCourseFields = Object.keys(courseData).length > 0;

    const hasRelatedFields =
      relatedData.stops !== undefined ||
      relatedData.routeLegs !== undefined ||
      relatedData.costs !== undefined;

    if (!hasCourseFields && !hasRelatedFields) {
      throw new ApiValidationError(
        "Няма подадени полета за обновяване.",
      );
    }

    const course = await prisma.$transaction(async (transaction) => {
      const existingCourse = await transaction.course.findUniqueOrThrow({
        where: {
          id: courseId,
        },
        select: {
          customerId: true,
          customerTariffId: true,
          billableKm: true,
          pricingSnapshotCreatedAt: true,
        },
      });

      const nextCustomerId =
        courseData.customerId ?? existingCourse.customerId;

      const nextCustomerTariffId = hasOwn(body, "customerTariffId")
        ? courseData.customerTariffId ?? null
        : existingCourse.customerTariffId;

      await validateCustomerTariffMatchesCustomer(transaction, {
        customerId: nextCustomerId,
        customerTariffId: nextCustomerTariffId,
      });

      const nextBillableKm = hasOwn(body, "billableKm")
        ? courseData.billableKm ?? null
        : decimalToNullableNumber(existingCourse.billableKm);

      const shouldUpdatePricingSnapshot =
        (hasOwn(body, "customerTariffId") &&
          nextCustomerTariffId !== existingCourse.customerTariffId) ||
        (existingCourse.pricingSnapshotCreatedAt === null &&
          hasCourseFields);

      if (shouldUpdatePricingSnapshot) {
        Object.assign(
          courseData,
          await buildCoursePricingSnapshot(transaction, {
            customerId: nextCustomerId,
            customerTariffId: nextCustomerTariffId,
            billableKm: nextBillableKm,
          }),
        );
      }

      if (hasCourseFields) {
        await transaction.course.update({
          where: {
            id: courseId,
          },
          data: courseData as Prisma.CourseUncheckedUpdateInput,
        });
      }

      if (relatedData.stops !== undefined) {
        /*
         * Stops са пълната актуална последователност.
         * Route legs се генерират от нея, за да работят
         * и със свободно въведени нови адреси.
         */
        await transaction.routeLeg.deleteMany({
          where: {
            courseId,
          },
        });

        await transaction.courseStop.deleteMany({
          where: {
            courseId,
          },
        });

        const resolvedStops = await resolveCourseStops(
          transaction,
          relatedData.stops,
        );

        await createCourseStops(
          transaction,
          courseId,
          resolvedStops,
        );

        await synchronizeCourseAddresses(
          transaction,
          courseId,
          resolvedStops,
        );

        await createGeneratedRouteLegs(
          transaction,
          courseId,
          resolvedStops,
        );
      } else if (relatedData.routeLegs !== undefined) {
        await transaction.routeLeg.deleteMany({
          where: {
            courseId,
          },
        });

        await createRouteLegs(
          transaction,
          courseId,
          relatedData.routeLegs,
        );
      }

      if (relatedData.costs !== undefined) {
        /*
         * Изтриваме само costs, създадени от Course Row.
         * Други бъдещи ръчни разходи няма да бъдат засегнати.
         */
        await transaction.cost.deleteMany({
          where: {
            courseId,
            notes: {
              contains: COURSE_ROW_COST_MARKER,
            },
          },
        });

        await createCourseCosts(
          transaction,
          courseId,
          relatedData.costs,
        );
      }

      return readCourseInsideTransaction(transaction, courseId);
    });

    return NextResponse.json({
      course: serializeForJson(course),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

async function readCourseInsideTransaction(
  transaction: Prisma.TransactionClient,
  courseId: string,
) {
  return transaction.course.findUniqueOrThrow({
    where: {
      id: courseId,
    },
    include: COURSE_INCLUDE,
  });
}

async function validateCustomerTariffMatchesCustomer(
  transaction: Prisma.TransactionClient,
  {
    customerId,
    customerTariffId,
  }: {
    customerId: string | null;
    customerTariffId: string | null;
  },
): Promise<void> {
  if (!customerTariffId) {
    return;
  }

  if (!customerId) {
    throw new ApiValidationError(
      "Не може да бъде избрана тарифа без клиент.",
    );
  }

  const tariff = await transaction.customerTariff.findUnique({
    where: {
      id: customerTariffId,
    },
    select: {
      customerId: true,
    },
  });

  if (!tariff) {
    throw new ApiValidationError(
      "Избраната тарифа не съществува.",
    );
  }

  if (tariff.customerId !== customerId) {
    throw new ApiValidationError(
      "Избраната тарифа не принадлежи на избрания клиент.",
    );
  }
}

async function buildCoursePricingSnapshot(
  transaction: Prisma.TransactionClient,
  {
    customerId,
    customerTariffId,
    billableKm,
  }: CoursePricingSnapshotContext,
): Promise<CoursePricingSnapshotWriteData> {
  if (customerTariffId) {
    const tariff = await transaction.customerTariff.findUnique({
      where: {
        id: customerTariffId,
      },
      select: {
        name: true,
        type: true,
        billableKmLogic: true,
        minKm: true,
        maxKm: true,
        fixedPrice: true,
        pricePerKm: true,
        waitingHourlyRate: true,
        portFeeIncluded: true,
      },
    });

    if (!tariff) {
      throw new ApiValidationError(
        "Избраната тарифа не съществува.",
      );
    }

    return createCoursePricingSnapshotFromTariff(tariff);
  }

  const automaticTableTariff = await findAutomaticTableTariffForSnapshot(
    transaction,
    {
      customerId,
      billableKm,
    },
  );

  if (!automaticTableTariff) {
    return createEmptyCoursePricingSnapshot();
  }

  return createCoursePricingSnapshotFromTariff(automaticTableTariff);
}

async function findAutomaticTableTariffForSnapshot(
  transaction: Prisma.TransactionClient,
  {
    customerId,
    billableKm,
  }: {
    customerId: string | null;
    billableKm: number | null;
  },
): Promise<CustomerTariffSnapshotSource | null> {
  if (!customerId) {
    return null;
  }

  const tableTariffs = await transaction.customerTariff.findMany({
    where: {
      customerId,
      isActive: true,
      type: {
        in: [
          "FIXED_TABLE_UPPER_BOUND",
          "DISTANCE_TABLE",
        ],
      },
    },
    select: {
      name: true,
      type: true,
      billableKmLogic: true,
      minKm: true,
      maxKm: true,
      fixedPrice: true,
      pricePerKm: true,
      waitingHourlyRate: true,
      portFeeIncluded: true,
    },
    orderBy: [
      {
        minKm: "asc",
      },
      {
        maxKm: "asc",
      },
      {
        name: "asc",
      },
    ],
  });

  if (tableTariffs.length === 0) {
    return null;
  }

  if (billableKm === null) {
    return tableTariffs[0] ?? null;
  }

  return (
    tableTariffs.find((tariff) =>
      isBillableKmInTariffRange(tariff, billableKm),
    ) ??
    tableTariffs.find((tariff) => {
      const maxKm = decimalToNullableNumber(tariff.maxKm);

      return maxKm !== null && billableKm <= maxKm;
    }) ??
    tableTariffs[0] ??
    null
  );
}

function isBillableKmInTariffRange(
  tariff: {
    minKm?: unknown;
    maxKm?: unknown;
  },
  billableKm: number,
): boolean {
  const minKm = decimalToNullableNumber(tariff.minKm);
  const maxKm = decimalToNullableNumber(tariff.maxKm);

  const isAboveMinimum =
    minKm === null || billableKm >= minKm;

  const isBelowMaximum =
    maxKm === null || billableKm <= maxKm;

  return isAboveMinimum && isBelowMaximum;
}

function createCoursePricingSnapshotFromTariff(
  tariff: CustomerTariffSnapshotSource,
): CoursePricingSnapshotWriteData {
  return {
    tariffNameAtBooking: tariff.name,
    tariffTypeAtBooking: tariff.type,
    pricingMethodAtBooking: getPricingMethodFromTariffType(
      tariff.type,
    ),
    pricePerKmAtBooking: decimalToNullableNumber(tariff.pricePerKm),
    fixedPriceAtBooking: decimalToNullableNumber(tariff.fixedPrice),
    waitingHourlyRateAtBooking: decimalToNullableNumber(
      tariff.waitingHourlyRate,
    ),
    billableKmLogicAtBooking: tariff.billableKmLogic,
    portFeeIncludedAtBooking: tariff.portFeeIncluded,
    pricingSnapshotCreatedAt: new Date(),
  };
}

function createEmptyCoursePricingSnapshot(): CoursePricingSnapshotWriteData {
  return {
    tariffNameAtBooking: null,
    tariffTypeAtBooking: null,
    pricingMethodAtBooking: null,
    pricePerKmAtBooking: null,
    fixedPriceAtBooking: null,
    waitingHourlyRateAtBooking: null,
    billableKmLogicAtBooking: null,
    portFeeIncludedAtBooking: null,
    pricingSnapshotCreatedAt: null,
  };
}

function getPricingMethodFromTariffType(
  tariffType: TariffTypeValue,
): string {
  switch (tariffType) {
    case "FIXED_TABLE_UPPER_BOUND":
    case "DISTANCE_TABLE":
      return "VEPCO";

    case "PRICE_PER_KM":
      return "MSI";

    case "FIXED_PRICE":
    case "SHUNT":
      return "FIXED_PRICE";

    case "WAITING_TIME":
    case "MANUAL":
      return "MANUAL";

    default:
      return "MANUAL";
  }
}

async function resolveCourseStops(
  transaction: Prisma.TransactionClient,
  stops: CourseStopWriteData[],
): Promise<ResolvedCourseStopData[]> {
  const createdAddressIds = new Map<string, string>();
  const resolvedStops: ResolvedCourseStopData[] = [];

  for (const stop of stops) {
    let addressId = stop.addressId;

    if (!addressId) {
      const addressText = stop.addressText?.trim();

      if (!addressText) {
        throw new ApiValidationError(
          `Stop ${stop.sequence} няма адрес.`,
        );
      }

      const normalizedKey = normalizeAddressText(addressText);
      addressId = createdAddressIds.get(normalizedKey) ?? null;

      if (!addressId) {
        addressId = await findOrCreateAddressFromText(
          transaction,
          addressText,
        );

        createdAddressIds.set(normalizedKey, addressId);
      }
    }

    resolvedStops.push({
      sequence: stop.sequence,
      type: stop.type,
      addressId,
      label: stop.label ?? stop.addressText,
      notes: stop.notes,
    });
  }

  return resolvedStops;
}

async function findOrCreateAddressFromText(
  transaction: Prisma.TransactionClient,
  addressText: string,
): Promise<string> {
  const parsedAddress = parseAddressText(addressText);

  const existingAddress = await transaction.address.findFirst({
    where: {
      name: parsedAddress.name,
      street: parsedAddress.street,
      city: parsedAddress.city,
      postalCode: parsedAddress.postalCode,
      country: parsedAddress.country,
    },
    select: {
      id: true,
    },
  });

  if (existingAddress) {
    return existingAddress.id;
  }

  const createdAddress = await transaction.address.create({
    data: {
      name: parsedAddress.name,
      street: parsedAddress.street,
      city: parsedAddress.city,
      postalCode: parsedAddress.postalCode,
      country: parsedAddress.country,
      type: "OTHER",
      notes: `Създаден автоматично от курс: ${addressText}`,
    },
    select: {
      id: true,
    },
  });

  return createdAddress.id;
}

function parseAddressText(addressText: string): ParsedAddressData {
  const normalizedText = addressText
    .trim()
    .replace(/\s+/g, " ");

  const separatorMatch = normalizedText.match(/\s[—–-]\s/);

  let name = normalizedText;
  let details = "";

  if (separatorMatch?.index !== undefined) {
    name = normalizedText.slice(0, separatorMatch.index).trim();
    details = normalizedText
      .slice(separatorMatch.index + separatorMatch[0].length)
      .trim();
  }

  let country = "UNSPECIFIED";

  const countryMatch = details.match(
    /(?:,\s*|\s+)(NL|BE|DE|FR|BG)$/i,
  );

  if (countryMatch) {
    country = countryMatch[1].toUpperCase();
    details = details.slice(0, countryMatch.index).trim();
  }

  let postalCode: string | null = null;
  let city: string | null = null;
  let street: string | null = details || null;

  const dutchPostalCodeMatch = details.match(
    /\b(\d{4})\s?([A-Za-z]{2})\b/,
  );

  if (
    dutchPostalCodeMatch &&
    dutchPostalCodeMatch.index !== undefined
  ) {
    postalCode = `${dutchPostalCodeMatch[1]} ${dutchPostalCodeMatch[2].toUpperCase()}`;
    country = country === "UNSPECIFIED" ? "NL" : country;

    const beforePostalCode = details
      .slice(0, dutchPostalCodeMatch.index)
      .replace(/[,;]+$/, "")
      .trim();

    const afterPostalCode = details
      .slice(
        dutchPostalCodeMatch.index +
          dutchPostalCodeMatch[0].length,
      )
      .replace(/^[,;]+/, "")
      .trim();

    street = beforePostalCode || null;
    city = afterPostalCode || null;
  }

  return {
    name: name || normalizedText,
    street,
    city,
    postalCode,
    country,
  };
}

function normalizeAddressText(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("bg-BG");
}

async function createCourseStops(
  transaction: Prisma.TransactionClient,
  courseId: string,
  stops: ResolvedCourseStopData[],
): Promise<void> {
  if (stops.length === 0) {
    return;
  }

  await transaction.courseStop.createMany({
    data: stops.map((stop) => ({
      courseId,
      addressId: stop.addressId,
      sequence: stop.sequence,
      type: stop.type,
      label: stop.label,
      notes: stop.notes,
    })),
  });
}

async function synchronizeCourseAddresses(
  transaction: Prisma.TransactionClient,
  courseId: string,
  stops: readonly ResolvedCourseStopData[],
): Promise<void> {
  const pickupAddressId =
    stops.find((stop) => stop.type === "PICKUP")?.addressId ?? null;

  const deliveryAddressId =
    stops.find((stop) => stop.type === "LOAD_UNLOAD")?.addressId ?? null;

  await transaction.course.update({
    where: {
      id: courseId,
    },
    data: {
      pickupAddressId,
      deliveryAddressId,
    },
  });
}

async function createGeneratedRouteLegs(
  transaction: Prisma.TransactionClient,
  courseId: string,
  stops: readonly ResolvedCourseStopData[],
): Promise<void> {
  if (stops.length < 2) {
    return;
  }

  const routeLegs = stops.slice(0, -1).map((fromStop, index) => {
    const toStop = stops[index + 1];

    if (!toStop) {
      throw new ApiValidationError(
        "Невалидна последователност на stops.",
      );
    }

    return {
      courseId,
      sequence: index + 1,
      fromAddressId: fromStop.addressId,
      toAddressId: toStop.addressId,
      description:
        [fromStop.label, toStop.label]
          .filter(Boolean)
          .join(" → ") || null,
      totalDistanceKm: null,
      billableDistanceKm: null,
      isBillable: true,
      notes: "Разстоянието по отсечката очаква route API.",
    };
  });

  await transaction.routeLeg.createMany({
    data: routeLegs,
  });
}

async function createRouteLegs(
  transaction: Prisma.TransactionClient,
  courseId: string,
  routeLegs: RouteLegWriteData[] | undefined,
): Promise<void> {
  if (!routeLegs || routeLegs.length === 0) {
    return;
  }

  await transaction.routeLeg.createMany({
    data: routeLegs.map((routeLeg) => ({
      courseId,
      sequence: routeLeg.sequence,
      fromAddressId: routeLeg.fromAddressId,
      toAddressId: routeLeg.toAddressId,
      description: routeLeg.description,
      totalDistanceKm: routeLeg.totalDistanceKm,
      billableDistanceKm: routeLeg.billableDistanceKm,
      isBillable: routeLeg.isBillable,
      notes: routeLeg.notes,
    })),
  });
}

async function createCourseCosts(
  transaction: Prisma.TransactionClient,
  courseId: string,
  costs: CourseCostWriteData[] | undefined,
): Promise<void> {
  if (!costs || costs.length === 0) {
    return;
  }

  await transaction.cost.createMany({
    data: costs.map((cost) => ({
      courseId,
      truckId: cost.truckId,
      type: cost.type,
      description: cost.description,
      amount: cost.amount,
      notes: buildCourseRowCostNotes(cost.notes),
    })),
  });
}

function buildCourseRowCostNotes(notes: string | null): string {
  if (!notes) {
    return COURSE_ROW_COST_MARKER;
  }

  return `${notes}\n${COURSE_ROW_COST_MARKER}`;
}

function buildRelatedCourseData(body: JsonObject): RelatedCourseData {
  return {
    stops: readCourseStops(body),
    routeLegs: readRouteLegs(body),
    costs: readCourseCosts(body),
  };
}

function readCourseStops(
  body: JsonObject,
): CourseStopWriteData[] | undefined {
  const records = readOptionalObjectArray(body, "stops");

  if (records === undefined) {
    return undefined;
  }

  const usedSequences = new Set<number>();

  return records.map((record, index) => {
    const sequence = readPositiveInteger(
      record.sequence,
      `stops[${index}].sequence`,
    );

    if (usedSequences.has(sequence)) {
      throw new ApiValidationError(
        `stops съдържа повторен sequence: ${sequence}.`,
      );
    }

    usedSequences.add(sequence);

    const addressId = readNullableString(
      record.addressId,
      `stops[${index}].addressId`,
    );

    const addressText = readNullableString(
      record.addressText,
      `stops[${index}].addressText`,
    );

    if (!addressId && !addressText) {
      throw new ApiValidationError(
        `stops[${index}] трябва да съдържа addressId или addressText.`,
      );
    }

    return {
      sequence,
      type: readCourseStopType(
        record.type,
        `stops[${index}].type`,
      ),
      addressId,
      addressText,
      label: readNullableString(
        record.label,
        `stops[${index}].label`,
      ),
      notes: readNullableString(
        record.notes,
        `stops[${index}].notes`,
      ),
    };
  });
}

function readRouteLegs(
  body: JsonObject,
): RouteLegWriteData[] | undefined {
  const records = readOptionalObjectArray(body, "routeLegs");

  if (records === undefined) {
    return undefined;
  }

  const usedSequences = new Set<number>();

  return records.map((record, index) => {
    const sequence = readPositiveInteger(
      record.sequence,
      `routeLegs[${index}].sequence`,
    );

    if (usedSequences.has(sequence)) {
      throw new ApiValidationError(
        `routeLegs съдържа повторен sequence: ${sequence}.`,
      );
    }

    usedSequences.add(sequence);

    return {
      sequence,
      fromAddressId: readRequiredString(
        record.fromAddressId,
        `routeLegs[${index}].fromAddressId`,
      ),
      toAddressId: readRequiredString(
        record.toAddressId,
        `routeLegs[${index}].toAddressId`,
      ),
      description: readNullableString(
        record.description,
        `routeLegs[${index}].description`,
      ),
      totalDistanceKm: readNullableNonNegativeNumber(
        record.totalDistanceKm,
        `routeLegs[${index}].totalDistanceKm`,
      ),
      billableDistanceKm: readNullableNonNegativeNumber(
        record.billableDistanceKm,
        `routeLegs[${index}].billableDistanceKm`,
      ),
      isBillable: readBooleanWithDefault(
        record.isBillable,
        true,
        `routeLegs[${index}].isBillable`,
      ),
      notes: readNullableString(
        record.notes,
        `routeLegs[${index}].notes`,
      ),
    };
  });
}

function readCourseCosts(
  body: JsonObject,
): CourseCostWriteData[] | undefined {
  const records = readOptionalObjectArray(body, "costs");

  if (records === undefined) {
    return undefined;
  }

  return records.map((record, index) => ({
    truckId: readNullableString(
      record.truckId,
      `costs[${index}].truckId`,
    ),
    type: readCostType(
      record.type,
      `costs[${index}].type`,
    ),
    description: readRequiredString(
      record.description,
      `costs[${index}].description`,
    ),
    amount: readRequiredNonNegativeNumber(
      record.amount,
      `costs[${index}].amount`,
    ),
    notes: readNullableString(
      record.notes,
      `costs[${index}].notes`,
    ),
  }));
}

function buildCourseWriteData({
  body,
  requireCustomerId,
}: {
  body: JsonObject;
  requireCustomerId: boolean;
}): CourseWriteData {
  const data: CourseWriteData = {};

  setNullableStringField(data, body, "courseNumber");

  if (requireCustomerId) {
    data.customerId = readRequiredString(
      body.customerId,
      "customerId",
    );
  } else if (hasOwn(body, "customerId")) {
    data.customerId = readRequiredString(
      body.customerId,
      "customerId",
    );
  }

  setNullableStringField(data, body, "customerTariffId");
  setNullableStringField(data, body, "truckId");
  setNullableStringField(data, body, "driverId");

  setCourseTypeField(data, body);

  setNullableStringField(data, body, "pickupAddressId");
  setNullableStringField(data, body, "deliveryAddressId");

  setStatusField(data, body);

  setNullableDateField(data, body, "plannedDate");
  setNullableDateField(data, body, "startedAt");
  setNullableDateField(data, body, "completedAt");

  setNullableStringField(data, body, "containerNumber");
  setNullableStringField(data, body, "bookingNumber");
  setNullableStringField(data, body, "referenceNumber");
  setNullableStringField(data, body, "tarCode");
  setNullableStringField(data, body, "acceptanceRef");

  setNullableNumberField(data, body, "totalKm");
  setNullableNumberField(data, body, "billableKm");
  setNullableNumberField(data, body, "nonBillableKm");

  setNullableStringField(data, body, "kmSource");
  setBooleanField(data, body, "manualKmOverride");
  setNullableStringField(data, body, "kmOverrideNotes");

  setNullableNumberField(data, body, "agreedPrice");
  setNullableNumberField(data, body, "waitingHours");
  setNullableNumberField(data, body, "waitingAmount");
  setNullableNumberField(data, body, "portFeeAmount");

  setNullableStringField(data, body, "notes");

  return data;
}

async function readJsonObject(request: Request): Promise<JsonObject> {
  let value: unknown;

  try {
    value = await request.json();
  } catch {
    throw new ApiValidationError(
      "Невалиден или липсващ JSON body.",
    );
  }

  return readJsonObjectValue(value, "JSON body");
}

function readJsonObjectValue(
  value: unknown,
  fieldName: string,
): JsonObject {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    throw new ApiValidationError(
      `${fieldName} трябва да бъде обект.`,
    );
  }

  return value as JsonObject;
}

function readOptionalObjectArray(
  body: JsonObject,
  fieldName: string,
): JsonObject[] | undefined {
  if (!hasOwn(body, fieldName)) {
    return undefined;
  }

  const value = body[fieldName];

  if (!Array.isArray(value)) {
    throw new ApiValidationError(
      `${fieldName} трябва да бъде масив.`,
    );
  }

  return value.map((item, index) =>
    readJsonObjectValue(item, `${fieldName}[${index}]`),
  );
}

async function readDeleteCourseId(
  request: Request,
): Promise<string | null> {
  const url = new URL(request.url);
  const queryId = normalizeOptionalString(
    url.searchParams.get("id"),
  );

  if (queryId) {
    return queryId;
  }

  try {
    const body = await readJsonObject(request);
    return normalizeOptionalString(body.id);
  } catch {
    return null;
  }
}

function readRequiredString(
  value: unknown,
  fieldName: string,
): string {
  if (typeof value !== "string") {
    throw new ApiValidationError(
      `${fieldName} трябва да бъде текст.`,
    );
  }

  const normalizedValue = value.trim();

  if (normalizedValue === "") {
    throw new ApiValidationError(
      `${fieldName} не може да бъде празно.`,
    );
  }

  return normalizedValue;
}

function readNullableString(
  value: unknown,
  fieldName: string,
): string | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  if (typeof value !== "string") {
    throw new ApiValidationError(
      `${fieldName} трябва да бъде текст или null.`,
    );
  }

  const normalizedValue = value.trim();

  return normalizedValue === "" ? null : normalizedValue;
}

function normalizeOptionalString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim();

  return normalizedValue === "" ? null : normalizedValue;
}

function readPositiveInteger(
  value: unknown,
  fieldName: string,
): number {
  const parsedValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  if (!Number.isInteger(parsedValue) || parsedValue < 1) {
    throw new ApiValidationError(
      `${fieldName} трябва да бъде положително цяло число.`,
    );
  }

  return parsedValue;
}

function readRequiredNonNegativeNumber(
  value: unknown,
  fieldName: string,
): number {
  const parsedValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    throw new ApiValidationError(
      `${fieldName} трябва да бъде неотрицателно число.`,
    );
  }

  return parsedValue;
}

function readNullableNonNegativeNumber(
  value: unknown,
  fieldName: string,
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  return readRequiredNonNegativeNumber(value, fieldName);
}

function readBooleanWithDefault(
  value: unknown,
  defaultValue: boolean,
  fieldName: string,
): boolean {
  if (value === null || value === undefined) {
    return defaultValue;
  }

  if (typeof value !== "boolean") {
    throw new ApiValidationError(
      `${fieldName} трябва да бъде true или false.`,
    );
  }

  return value;
}

function setNullableStringField(
  data: CourseWriteData,
  body: JsonObject,
  fieldName: keyof CourseWriteData,
): void {
  if (!hasOwn(body, fieldName)) {
    return;
  }

  Object.assign(data, {
    [fieldName]: readNullableString(
      body[fieldName],
      String(fieldName),
    ),
  });
}

function setNullableNumberField(
  data: CourseWriteData,
  body: JsonObject,
  fieldName: keyof CourseWriteData,
): void {
  if (!hasOwn(body, fieldName)) {
    return;
  }

  Object.assign(data, {
    [fieldName]: readNullableNonNegativeNumber(
      body[fieldName],
      String(fieldName),
    ),
  });
}

function setNullableDateField(
  data: CourseWriteData,
  body: JsonObject,
  fieldName: "plannedDate" | "startedAt" | "completedAt",
): void {
  if (!hasOwn(body, fieldName)) {
    return;
  }

  const value = body[fieldName];

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    Object.assign(data, {
      [fieldName]: null,
    });

    return;
  }

  if (typeof value !== "string") {
    throw new ApiValidationError(
      `${fieldName} трябва да бъде ISO дата или null.`,
    );
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new ApiValidationError(
      `${fieldName} съдържа невалидна дата.`,
    );
  }

  Object.assign(data, {
    [fieldName]: parsedDate,
  });
}

function setBooleanField(
  data: CourseWriteData,
  body: JsonObject,
  fieldName: "manualKmOverride",
): void {
  if (!hasOwn(body, fieldName)) {
    return;
  }

  const value = body[fieldName];

  if (typeof value !== "boolean") {
    throw new ApiValidationError(
      `${fieldName} трябва да бъде true или false.`,
    );
  }

  data[fieldName] = value;
}

function setStatusField(
  data: CourseWriteData,
  body: JsonObject,
): void {
  if (!hasOwn(body, "status")) {
    return;
  }

  const value = body.status;

  if (
    typeof value !== "string" ||
    !isCourseStatus(value)
  ) {
    throw new ApiValidationError(
      `status трябва да бъде една от стойностите: ${COURSE_STATUSES.join(", ")}.`,
    );
  }

  data.status = value;
}

function setCourseTypeField(
  data: CourseWriteData,
  body: JsonObject,
): void {
  if (!hasOwn(body, "courseType")) {
    return;
  }

  const value = body.courseType;

  if (
    typeof value !== "string" ||
    !isCourseType(value)
  ) {
    throw new ApiValidationError(
      `courseType трябва да бъде една от стойностите: ${COURSE_TYPES.join(", ")}.`,
    );
  }

  data.courseType = value;
}

function readCourseStopType(
  value: unknown,
  fieldName: string,
): CourseStopTypeValue {
  if (
    typeof value !== "string" ||
    !isCourseStopType(value)
  ) {
    throw new ApiValidationError(
      `${fieldName} трябва да бъде една от стойностите: ${COURSE_STOP_TYPES.join(", ")}.`,
    );
  }

  return value;
}

function readCostType(
  value: unknown,
  fieldName: string,
): CostTypeValue {
  if (
    typeof value !== "string" ||
    !isCostType(value)
  ) {
    throw new ApiValidationError(
      `${fieldName} трябва да бъде една от стойностите: ${COST_TYPES.join(", ")}.`,
    );
  }

  return value;
}

function isCourseStatus(value: string): value is CourseStatusValue {
  return (COURSE_STATUSES as readonly string[]).includes(value);
}

function isCourseType(value: string): value is CourseTypeValue {
  return (COURSE_TYPES as readonly string[]).includes(value);
}

function isCourseStopType(
  value: string,
): value is CourseStopTypeValue {
  return (COURSE_STOP_TYPES as readonly string[]).includes(value);
}

function isCostType(value: string): value is CostTypeValue {
  return (COST_TYPES as readonly string[]).includes(value);
}

function hasOwn(
  object: JsonObject,
  property: PropertyKey,
): boolean {
  return Object.prototype.hasOwnProperty.call(object, property);
}

function decimalToNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) {
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

function serializeForJson(value: unknown): unknown {
  if (
    value === null ||
    value === undefined ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => serializeForJson(item));
  }

  if (typeof value === "object") {
    const possibleDecimal = value as {
      toNumber?: () => number;
      toFixed?: (decimalPlaces?: number) => string;
    };

    if (
      typeof possibleDecimal.toNumber === "function" &&
      typeof possibleDecimal.toFixed === "function"
    ) {
      return possibleDecimal.toNumber();
    }

    const serializedObject: Record<string, unknown> = {};

    for (const [key, nestedValue] of Object.entries(
      value as Record<string, unknown>,
    )) {
      serializedObject[key] = serializeForJson(nestedValue);
    }

    return serializedObject;
  }

  return String(value);
}

function handleApiError(error: unknown) {
  if (error instanceof ApiValidationError) {
    return errorResponse(error.message, 400);
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002":
        return errorResponse(
          "Вече съществува запис със същата уникална стойност.",
          409,
        );

      case "P2003":
        return errorResponse(
          "Посочен клиент, тарифа, камион, шофьор или адрес не съществува, или курсът има свързани записи.",
          409,
        );

      case "P2025":
        return errorResponse("Курсът не е намерен.", 404);

      default:
        console.error("Prisma courses API error:", error);

        return errorResponse(
          "Възникна грешка при работа с базата.",
          500,
        );
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    console.error("Prisma validation error:", error);

    return errorResponse(
      "Подадените данни не са валидни за курс.",
      400,
    );
  }

  console.error("Unexpected courses API error:", error);

  return errorResponse(
    "Възникна неочаквана сървърна грешка.",
    500,
  );
}

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    {
      error: message,
    },
    {
      status,
    },
  );
}

class ApiValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiValidationError";
  }
}