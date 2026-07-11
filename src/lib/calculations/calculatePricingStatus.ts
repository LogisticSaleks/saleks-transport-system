export type PricingStatus =
  | "PROFITABLE"
  | "LOW_PROFIT"
  | "BREAK_EVEN"
  | "LOSS"
  | "NEEDS_REVIEW";

export type PricingStatusSettings = {
  lowProfitMarginPercent: number;
  breakEvenTolerance: number;
};

export type CalculatePricingStatusInput = {
  profit: number;
  profitMargin: number | null;
  settings: PricingStatusSettings;
  requiresReview?: boolean;
  pricingWarning?: string | null;
};

/**
 * Determines the pricing status of a course.
 *
 * Status priority:
 * 1. NEEDS_REVIEW when a warning or explicit review flag exists.
 * 2. LOSS when profit is negative.
 * 3. BREAK_EVEN when profit is within the configured tolerance.
 * 4. NEEDS_REVIEW when profit margin cannot be calculated.
 * 5. LOW_PROFIT when margin is below the configured threshold.
 * 6. PROFITABLE in all remaining valid cases.
 */
export function calculatePricingStatus({
  profit,
  profitMargin,
  settings,
  requiresReview = false,
  pricingWarning = null,
}: CalculatePricingStatusInput): PricingStatus {
  validateFiniteNumber(profit, "profit");

  validateNonNegativeFiniteNumber(
    settings.lowProfitMarginPercent,
    "settings.lowProfitMarginPercent",
  );

  validateNonNegativeFiniteNumber(
    settings.breakEvenTolerance,
    "settings.breakEvenTolerance",
  );

  if (requiresReview || pricingWarning !== null) {
    return "NEEDS_REVIEW";
  }

  if (profit < -settings.breakEvenTolerance) {
    return "LOSS";
  }

  if (Math.abs(profit) <= settings.breakEvenTolerance) {
    return "BREAK_EVEN";
  }

  if (profitMargin === null) {
    return "NEEDS_REVIEW";
  }

  validateFiniteNumber(profitMargin, "profitMargin");

  if (profitMargin < settings.lowProfitMarginPercent) {
    return "LOW_PROFIT";
  }

  return "PROFITABLE";
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