import { roundKm, roundLiters, roundMoney } from "./rounding";

export type FuelSettings = {
  consumptionLitersPer100Km: number;
  fuelPricePerLiter: number;
};

export type CalculateFuelCostInput = {
  totalKm: number;
  settings: FuelSettings;
};

/**
 * Calculates the fuel cost for the complete route.
 *
 * Fuel cost uses totalKm because fuel is consumed for every
 * kilometer driven, including non-billable kilometers.
 *
 * Fuel consumption and fuel price are provided through settings
 * and are not hardcoded in this function.
 */
export function calculateFuelCost({
  totalKm,
  settings,
}: CalculateFuelCostInput): number {
  validateNonNegativeFiniteNumber(totalKm, "totalKm");

  validateNonNegativeFiniteNumber(
    settings.consumptionLitersPer100Km,
    "settings.consumptionLitersPer100Km",
  );

  validateNonNegativeFiniteNumber(
    settings.fuelPricePerLiter,
    "settings.fuelPricePerLiter",
  );

  const normalizedTotalKm = roundKm(totalKm);

  const litersUsed = roundLiters(
    (normalizedTotalKm * settings.consumptionLitersPer100Km) / 100,
  );

  return roundMoney(litersUsed * settings.fuelPricePerLiter);
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