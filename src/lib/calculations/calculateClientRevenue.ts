import { roundMoney } from "./rounding";

export type CalculateClientRevenueInput = {
  coursePrice: number;
  waitingCharge?: number;
  additionalRevenue?: number;
};

/**
 * Calculates the total revenue received from the client.
 */
export function calculateClientRevenue({
  coursePrice,
  waitingCharge = 0,
  additionalRevenue = 0,
}: CalculateClientRevenueInput): number {
  validateNonNegativeFiniteNumber(coursePrice, "coursePrice");
  validateNonNegativeFiniteNumber(
    waitingCharge,
    "waitingCharge",
  );
  validateNonNegativeFiniteNumber(
    additionalRevenue,
    "additionalRevenue",
  );

  const totalRevenue =
    coursePrice + waitingCharge + additionalRevenue;

  return roundMoney(totalRevenue);
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