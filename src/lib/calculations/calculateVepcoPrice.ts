import { roundKm, roundMoney } from "./rounding";

export type VepcoTariff = {
  maxKm: number;
  price: number;
};

export type VepcoPriceResult = {
  price: number | null;
  tariffKm: number | null;
  warning: string | null;
};

export const VEPCO_TARIFFS: readonly VepcoTariff[] = [
  { maxKm: 10, price: 194 },
  { maxKm: 15, price: 214 },
  { maxKm: 20, price: 218 },
  { maxKm: 25, price: 231 },
  { maxKm: 30, price: 240 },
  { maxKm: 35, price: 244 },
  { maxKm: 40, price: 249 },
  { maxKm: 45, price: 253 },
  { maxKm: 50, price: 262 },
  { maxKm: 55, price: 270 },
  { maxKm: 60, price: 279 },
  { maxKm: 65, price: 283 },
  { maxKm: 70, price: 292 },
  { maxKm: 75, price: 299 },
  { maxKm: 80, price: 306 },
  { maxKm: 85, price: 311 },
  { maxKm: 90, price: 315 },
  { maxKm: 95, price: 320 },
  { maxKm: 100, price: 325 },
  { maxKm: 110, price: 341 },
  { maxKm: 120, price: 361 },
  { maxKm: 130, price: 377 },
  { maxKm: 140, price: 393 },
  { maxKm: 150, price: 410 },
  { maxKm: 160, price: 434 },
  { maxKm: 170, price: 459 },
  { maxKm: 180, price: 484 },
  { maxKm: 190, price: 509 },
  { maxKm: 200, price: 535 },
  { maxKm: 210, price: 559 },
  { maxKm: 220, price: 585 },
  { maxKm: 230, price: 601 },
  { maxKm: 240, price: 619 },
  { maxKm: 250, price: 635 },
  { maxKm: 260, price: 652 },
  { maxKm: 270, price: 666 },
  { maxKm: 280, price: 682 },
  { maxKm: 290, price: 698 },
  { maxKm: 300, price: 715 },
];

/**
 * Calculates the Vepco course price from the billable distance.
 *
 * Rules:
 * - Below 10 km: fixed price of €90.
 * - Exactly 10 km: use the 10 km tariff.
 * - Above 10 km: use the next matching upper tariff boundary.
 * - Above 300 km: return a warning because no tariff is available.
 */
export function calculateVepcoPrice(
  billableKm: number,
): VepcoPriceResult {
  validateBillableKm(billableKm);

  if (billableKm < 10) {
  return {
    price: roundMoney(90),
    tariffKm: null,
    warning: null,
  };
}

const normalizedKm = roundKm(billableKm);


  const matchingTariff = VEPCO_TARIFFS.find(
    (tariff) => normalizedKm <= tariff.maxKm,
  );

  if (!matchingTariff) {
    return {
      price: null,
      tariffKm: null,
      warning: `No Vepco tariff found for ${normalizedKm} km. Maximum supported distance is 300 km.`,
    };
  }

  return {
    price: roundMoney(matchingTariff.price),
    tariffKm: matchingTariff.maxKm,
    warning: null,
  };
}

function validateBillableKm(billableKm: number): void {
  if (!Number.isFinite(billableKm)) {
    throw new TypeError("billableKm must be a finite number.");
  }

  if (billableKm < 0) {
    throw new RangeError("billableKm cannot be negative.");
  }
}