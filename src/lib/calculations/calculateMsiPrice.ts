import { roundKm, roundMoney } from "./rounding";

export type MsiPricingSettings = {
  pricePerKm: number;
};

export type CalculateMsiPriceInput = {
  billableKm: number;
  settings: MsiPricingSettings;
};

/**
 * Calculates the MSI course price.
 *
 * The price per kilometer is provided through settings
 * and is not hardcoded in the calculation function.
 */
export function calculateMsiPrice({
  billableKm,
  settings,
}: CalculateMsiPriceInput): number {
  validateNonNegativeFiniteNumber(billableKm, "billableKm");
  validateNonNegativeFiniteNumber(
    settings.pricePerKm,
    "settings.pricePerKm",
  );

  const normalizedBillableKm = roundKm(billableKm);
  const price = normalizedBillableKm * settings.pricePerKm;

  return roundMoney(price);
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