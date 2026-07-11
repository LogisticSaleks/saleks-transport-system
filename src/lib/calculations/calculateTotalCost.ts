import { roundMoney } from "./rounding";

export type CalculateTotalCostInput = {
  fuelCost: number;
  tollCost: number;
  portCost?: number;
  truckFixedCost?: number;
  otherCosts?: number;
};

/**
 * Calculates the total operational cost of a course.
 */
export function calculateTotalCost({
  fuelCost,
  tollCost,
  portCost = 0,
  truckFixedCost = 0,
  otherCosts = 0,
}: CalculateTotalCostInput): number {
  const costs = {
    fuelCost,
    tollCost,
    portCost,
    truckFixedCost,
    otherCosts,
  };

  for (const [fieldName, value] of Object.entries(costs)) {
    validateNonNegativeFiniteNumber(value, fieldName);
  }

  const totalCost =
    fuelCost +
    tollCost +
    portCost +
    truckFixedCost +
    otherCosts;

  return roundMoney(totalCost);
}

function validateNonNegativeFiniteNumber(
  value: number,
  fieldName: string,
): void {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${fieldName} must be a finite number.`);
  }

  if (value < 0) {
    throw new RangeError(`${fieldName} cannot be negative.`);
  }
}