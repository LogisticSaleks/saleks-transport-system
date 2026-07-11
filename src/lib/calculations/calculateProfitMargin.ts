export type CalculateProfitMarginInput = {
  profit: number;
  revenue: number;
};

/**
 * Calculates profit margin as a percentage of revenue.
 *
 * Returns null when revenue is 0 because margin cannot
 * mathematically be calculated without revenue.
 */
export function calculateProfitMargin({
  profit,
  revenue,
}: CalculateProfitMarginInput): number | null {
  validateFiniteNumber(profit, "profit");
  validateNonNegativeFiniteNumber(revenue, "revenue");

  if (revenue === 0) {
    return null;
  }

  const marginPercent = (profit / revenue) * 100;

  return roundPercentage(marginPercent);
}

function roundPercentage(value: number): number {
  const factor = 100;
  const roundedValue =
    Math.round((Math.abs(value) + Number.EPSILON) * factor) /
    factor;

  const result = Math.sign(value) * roundedValue;

  return Object.is(result, -0) ? 0 : result;
}

function validateFiniteNumber(
  value: number,
  fieldName: string,
): void {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${fieldName} must be a finite number.`);
  }
}

function validateNonNegativeFiniteNumber(
  value: number,
  fieldName: string,
): void {
  validateFiniteNumber(value, fieldName);

  if (value < 0) {
    throw new RangeError(`${fieldName} cannot be negative.`);
  }
}