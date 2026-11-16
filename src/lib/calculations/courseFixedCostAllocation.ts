export const COURSE_ROW_FIXED_COST_DESCRIPTION =
  "Фиксиран разход за камиона";

export type TruckFixedCostInput = {
  monthlyLeaseCost: unknown;
  monthlyInsuranceCost: unknown;
  monthlyRoadTaxCost: unknown;
  monthlyOtherFixedCost: unknown;
};

export type CourseCostRecordInput = {
  type: string;
  description: string | null;
  amount: unknown;
};

export type TruckDayAllocationRow = {
  truckId: string | null | undefined;
  date: string;
};

export function calculateTruckDailyFixedCost(
  truck: TruckFixedCostInput,
): number {
  const monthlyFixedCost =
    toNumber(truck.monthlyLeaseCost) +
    toNumber(truck.monthlyInsuranceCost) +
    toNumber(truck.monthlyRoadTaxCost) +
    toNumber(truck.monthlyOtherFixedCost);

  return roundMoney(
    monthlyFixedCost / 30,
  );
}

export function calculateAllocatedTruckFixedCost(
  truck: TruckFixedCostInput,
  courseCount: number,
): number {
  const divisor =
    Number.isFinite(courseCount) &&
    courseCount > 0
      ? courseCount
      : 1;

  return roundMoney(
    calculateTruckDailyFixedCost(truck) /
      divisor,
  );
}

export function createTruckDayFixedCostAllocationKey(
  truckId: string | null | undefined,
  date: string,
): string | null {
  const normalizedTruckId =
    truckId?.trim() ?? "";

  const normalizedDate =
    date.trim();

  if (
    normalizedTruckId === "" ||
    normalizedDate === ""
  ) {
    return null;
  }

  return `${normalizedTruckId}|${normalizedDate}`;
}

export function buildTruckDayFixedCostAllocationCounts(
  rows: readonly TruckDayAllocationRow[],
): Map<string, number> {
  const counts =
    new Map<string, number>();

  for (const row of rows) {
    const key =
      createTruckDayFixedCostAllocationKey(
        row.truckId,
        row.date,
      );

    if (!key) {
      continue;
    }

    counts.set(
      key,
      (counts.get(key) ?? 0) + 1,
    );
  }

  return counts;
}

export function calculateCourseTotalCostWithAllocatedTruckFixedCost({
  costs,
  truck,
  courseCount,
}: {
  costs: readonly CourseCostRecordInput[];
  truck: TruckFixedCostInput | null;
  courseCount: number;
}): number {
  let costWithoutAllocatedFixedCost = 0;

  for (const cost of costs) {
    if (
      isCourseRowFixedCostRecord(cost)
    ) {
      continue;
    }

    costWithoutAllocatedFixedCost +=
      toNumber(cost.amount);
  }

  const allocatedTruckFixedCost =
    truck === null
      ? 0
      : calculateAllocatedTruckFixedCost(
          truck,
          courseCount,
        );

  return roundMoney(
    costWithoutAllocatedFixedCost +
      allocatedTruckFixedCost,
  );
}

export function isCourseRowFixedCostRecord(
  cost: Pick<
    CourseCostRecordInput,
    "type" | "description"
  >,
): boolean {
  return (
    cost.type === "OTHER" &&
    (cost.description ?? "").trim() ===
      COURSE_ROW_FIXED_COST_DESCRIPTION
  );
}

function toNumber(value: unknown): number {
  const parsedValue =
    Number(value);

  return Number.isFinite(parsedValue)
    ? parsedValue
    : 0;
}

function roundMoney(value: number): number {
  return (
    Math.round(
      (value + Number.EPSILON) * 100,
    ) / 100
  );
}
