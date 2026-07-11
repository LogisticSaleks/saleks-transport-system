import { roundMoney } from "./rounding";

export type WaitingSettings = {
  freeWaitingHours: number;
  pricePerHour: number;
};

export type CalculateWaitingInput = {
  waitingMinutes: number;
  settings: WaitingSettings;
};

export type WaitingCalculationResult = {
  totalWaitingMinutes: number;
  freeWaitingMinutes: number;
  paidWaitingMinutes: number;
  paidWaitingHours: number;
  waitingCost: number;
};

/**
 * Calculates paid waiting time and waiting cost.
 *
 * The function accepts the total waiting time in minutes.
 * Free waiting time and price per hour are provided through settings.
 */
export function calculateWaiting({
  waitingMinutes,
  settings,
}: CalculateWaitingInput): WaitingCalculationResult {
  validateNonNegativeFiniteNumber(waitingMinutes, "waitingMinutes");

  validateNonNegativeFiniteNumber(
    settings.freeWaitingHours,
    "settings.freeWaitingHours",
  );

  validateNonNegativeFiniteNumber(
    settings.pricePerHour,
    "settings.pricePerHour",
  );

  const freeWaitingMinutes = settings.freeWaitingHours * 60;

  const paidWaitingMinutes = Math.max(
    waitingMinutes - freeWaitingMinutes,
    0,
  );

  const paidWaitingHours = paidWaitingMinutes / 60;

  const waitingCost = roundMoney(
    paidWaitingHours * settings.pricePerHour,
  );

  return {
    totalWaitingMinutes: waitingMinutes,
    freeWaitingMinutes,
    paidWaitingMinutes,
    paidWaitingHours,
    waitingCost,
  };
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