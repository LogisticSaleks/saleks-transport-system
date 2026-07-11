import { roundMoney } from "./rounding";

export type CalculateProfitInput = {
  revenue: number;
  totalCost: number;
};

/**
 * Calculates the course profit.
 *
 * Profit may be negative when the course operates at a loss.
 */
export function calculateProfit({
  revenue,
  totalCost,
}: CalculateProfitInput): number {
  validateNonNegativeFiniteNumber(revenue, "revenue");
  validateNonNegativeFiniteNumber(totalCost, "totalCost");

  return roundMoney(revenue - totalCost);
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