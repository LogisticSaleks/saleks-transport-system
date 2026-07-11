export type CalculationSettings = {
  fuel: {
    consumptionLitersPer100Km: number;
    fuelPricePerLiter: number;
  };
  msi: {
    pricePerKm: number;
  };
  waiting: {
    freeWaitingHours: number;
    pricePerHour: number;
  };
  pricingStatus: {
    lowProfitMarginPercent: number;
    breakEvenTolerance: number;
  };
};

/**
 * Default calculation settings.
 *
 * These values can later be replaced with settings loaded
 * from the database or changed through the Settings page.
 */
export const calculationSettings: CalculationSettings = {
  fuel: {
    consumptionLitersPer100Km: 30,
    fuelPricePerLiter: 1.92,
  },
  msi: {
    pricePerKm: 1.5,
  },
  waiting: {
    freeWaitingHours: 2,
    pricePerHour: 50,
  },
  pricingStatus: {
    lowProfitMarginPercent: 10,
    breakEvenTolerance: 0.01,
  },
};