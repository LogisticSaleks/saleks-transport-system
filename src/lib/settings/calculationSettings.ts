export type CalculationSettings = {
  fuel: {
    consumptionLitersPer100Km: number;
    fuelPricePerLiter: number;
  };
  msi: {
    pricePerKm: number;
  };
};

/**
 * Default calculation settings.
 *
 * These values can later be replaced with settings loaded
 * from the database or from the Settings page.
 */
export const calculationSettings: CalculationSettings = {
  fuel: {
    consumptionLitersPer100Km: 30,
    fuelPricePerLiter: 1.92,
  },
  msi: {
    pricePerKm: 1.5,
  },
};