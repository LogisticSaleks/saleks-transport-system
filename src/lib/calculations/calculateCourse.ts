import {
  calculateClientRevenue,
} from "./calculateClientRevenue";
import { calculateFuelCost } from "./calculateFuelCost";
import { calculateMsiPrice } from "./calculateMsiPrice";
import { calculatePricingStatus } from "./calculatePricingStatus";
import { calculateProfit } from "./calculateProfit";
import { calculateProfitMargin } from "./calculateProfitMargin";
import { calculateTollCost } from "./calculateTollCost";
import { calculateTotalCost } from "./calculateTotalCost";
import { calculateTotalKm } from "./calculateTotalKm";
import { calculateVepcoPrice } from "./calculateVepcoPrice";
import {
  calculateWaiting,
  type WaitingCalculationResult,
} from "./calculateWaiting";
import {
  determineBillableKm,
  type BillableKmLogic,
} from "./determineBillableKm";
import { roundMoney } from "./rounding";
import {
  calculationSettings,
  type CalculationSettings,
} from "../settings/calculationSettings";
import type { PricingStatus } from "./calculatePricingStatus";

export type CoursePricingMethod =
  | "VEPCO"
  | "MSI"
  | "FIXED_PRICE"
  | "MANUAL";

export type CourseRouteLeg = {
  distanceKm: number;
  tollCost: number;
  isBillable?: boolean;
};

export type CalculateCourseInput = {
  routeLegs: readonly CourseRouteLeg[];

  billableKmLogic: BillableKmLogic;
  pricingMethod: CoursePricingMethod;

  manualBillableKm?: number;
  fixedPrice?: number;
  manualPrice?: number;
  manualTollOverride?: number;

  waitingMinutes?: number;
  portCost?: number;
  truckFixedCost?: number;
  otherCosts?: number;
  additionalRevenue?: number;

  requiresReview?: boolean;
  settings?: CalculationSettings;
};

export type CourseCostBreakdown = {
  fuelCost: number;
  tollCost: number;
  portCost: number;
  truckFixedCost: number;
  otherCosts: number;
  totalCost: number;
};

export type CalculateCourseResult = {
  totalKm: number;
  billableKm: number;

  price: number | null;
  waiting: WaitingCalculationResult;

  costs: CourseCostBreakdown;

  revenue: number | null;
  profit: number | null;
  profitMargin: number | null;

  status: PricingStatus;
  warnings: string[];
};

/**
 * Runs the complete course calculation process.
 *
 * The function combines all individual calculation helpers
 * without duplicating their business logic.
 */
export function calculateCourse({
  routeLegs,
  billableKmLogic,
  pricingMethod,
  manualBillableKm,
  fixedPrice,
  manualPrice,
  manualTollOverride,
  waitingMinutes = 0,
  portCost = 0,
  truckFixedCost = 0,
  otherCosts = 0,
  additionalRevenue = 0,
  requiresReview = false,
  settings = calculationSettings,
}: CalculateCourseInput): CalculateCourseResult {
  const warnings: string[] = [];

  if (routeLegs.length === 0) {
    warnings.push("Course has no route legs.");
  }

  const totalKm = calculateTotalKm(routeLegs);

  const billableKm = determineBillableKm({
    logic: billableKmLogic,
    routeLegs,
    manualBillableKm,
  });

  const pricingResult = determineCoursePrice({
    pricingMethod,
    billableKm,
    fixedPrice,
    manualPrice,
    settings,
  });

  warnings.push(...pricingResult.warnings);

  const fuelCost = calculateFuelCost({
    totalKm,
    settings: settings.fuel,
  });

  const tollCost = calculateTollCost({
    routeLegs,
    manualTollOverride,
  });

  const waiting = calculateWaiting({
    waitingMinutes,
    settings: settings.waiting,
  });

  const totalCost = calculateTotalCost({
    fuelCost,
    tollCost,
    portCost,
    truckFixedCost,
    otherCosts,
  });

  let revenue: number | null = null;
  let profit: number | null = null;
  let profitMargin: number | null = null;

  if (pricingResult.price !== null) {
    revenue = calculateClientRevenue({
      coursePrice: pricingResult.price,
      waitingCharge: waiting.waitingCost,
      additionalRevenue,
    });

    profit = calculateProfit({
      revenue,
      totalCost,
    });

    profitMargin = calculateProfitMargin({
      profit,
      revenue,
    });
  }

  const status = calculatePricingStatus({
    profit: profit ?? 0,
    profitMargin,
    settings: settings.pricingStatus,
    requiresReview: requiresReview || warnings.length > 0,
    pricingWarning: warnings[0] ?? null,
  });

  return {
    totalKm,
    billableKm,

    price: pricingResult.price,
    waiting,

    costs: {
      fuelCost,
      tollCost,
      portCost: roundMoney(portCost),
      truckFixedCost: roundMoney(truckFixedCost),
      otherCosts: roundMoney(otherCosts),
      totalCost,
    },

    revenue,
    profit,
    profitMargin,

    status,
    warnings,
  };
}

type DetermineCoursePriceInput = {
  pricingMethod: CoursePricingMethod;
  billableKm: number;
  fixedPrice?: number;
  manualPrice?: number;
  settings: CalculationSettings;
};

type DetermineCoursePriceResult = {
  price: number | null;
  warnings: string[];
};

function determineCoursePrice({
  pricingMethod,
  billableKm,
  fixedPrice,
  manualPrice,
  settings,
}: DetermineCoursePriceInput): DetermineCoursePriceResult {
  switch (pricingMethod) {
    case "VEPCO": {
      const result = calculateVepcoPrice(billableKm);

      return {
        price: result.price,
        warnings: result.warning ? [result.warning] : [],
      };
    }

    case "MSI":
      return {
        price: calculateMsiPrice({
          billableKm,
          settings: settings.msi,
        }),
        warnings: [],
      };

    case "FIXED_PRICE":
      if (fixedPrice === undefined) {
        return {
          price: null,
          warnings: [
            "fixedPrice is required when pricingMethod is FIXED_PRICE.",
          ],
        };
      }

      validatePrice(fixedPrice, "fixedPrice");

      return {
        price: roundMoney(fixedPrice),
        warnings: [],
      };

    case "MANUAL":
      if (manualPrice === undefined) {
        return {
          price: null,
          warnings: [
            "manualPrice is required when pricingMethod is MANUAL.",
          ],
        };
      }

      validatePrice(manualPrice, "manualPrice");

      return {
        price: roundMoney(manualPrice),
        warnings: [],
      };

    default:
      return assertNever(pricingMethod);
  }
}

function validatePrice(value: number, fieldName: string): void {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${fieldName} must be a finite number.`);
  }

  if (value < 0) {
    throw new RangeError(`${fieldName} cannot be negative.`);
  }
}

function assertNever(value: never): never {
  throw new Error(
    `Unsupported course pricing method: ${String(value)}`,
  );
}