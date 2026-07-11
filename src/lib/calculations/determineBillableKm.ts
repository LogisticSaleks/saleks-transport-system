import { calculateTotalKm } from "./calculateTotalKm";
import { roundKm } from "./rounding";

export type BillableKmLogic =
  | "TOTAL_ROUTE"
  | "ONE_WAY"
  | "SELECTED_LEGS"
  | "FIXED_PRICE"
  | "MANUAL";

export type RouteLegForBillableKm = {
  distanceKm: number;
  isBillable?: boolean;
};

export type DetermineBillableKmInput = {
  logic: BillableKmLogic;
  routeLegs: readonly RouteLegForBillableKm[];
  manualBillableKm?: number;
};

/**
 * Determines the billable distance according to the customer's
 * billable kilometer logic.
 */
export function determineBillableKm({
  logic,
  routeLegs,
  manualBillableKm,
}: DetermineBillableKmInput): number {
  switch (logic) {
    case "TOTAL_ROUTE":
      return calculateTotalKm(routeLegs);

    case "ONE_WAY": {
      const firstRouteLeg = routeLegs[0];

      if (!firstRouteLeg) {
        return 0;
      }

      validateKm(firstRouteLeg.distanceKm, "Route leg distanceKm");

      return roundKm(firstRouteLeg.distanceKm);
    }

    case "SELECTED_LEGS": {
      const selectedRouteLegs = routeLegs.filter(
        (routeLeg) => routeLeg.isBillable === true,
      );

      return calculateTotalKm(selectedRouteLegs);
    }

    case "FIXED_PRICE":
      return 0;

    case "MANUAL":
      if (manualBillableKm === undefined) {
        throw new Error(
          "manualBillableKm is required when logic is MANUAL.",
        );
      }

      validateKm(manualBillableKm, "manualBillableKm");

      return roundKm(manualBillableKm);

    default:
      return assertNever(logic);
  }
}

function validateKm(value: number, fieldName: string): void {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${fieldName} must be a finite number.`);
  }

  if (value < 0) {
    throw new RangeError(`${fieldName} cannot be negative.`);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unsupported billable kilometer logic: ${String(value)}`);
}