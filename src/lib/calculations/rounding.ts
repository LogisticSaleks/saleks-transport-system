/**
 * Rounds a finite number to the specified number of decimal places.
 * Uses symmetric rounding for both positive and negative values.
 */
function roundTo(value: number, decimalPlaces: number): number {
  if (!Number.isFinite(value)) {
    throw new TypeError("Value must be a finite number.");
  }

  const factor = 10 ** decimalPlaces;
  const roundedValue =
    Math.round((Math.abs(value) + Number.EPSILON) * factor) / factor;

  const result = Math.sign(value) * roundedValue;

  return Object.is(result, -0) ? 0 : result;
}

/**
 * Rounds monetary values to 2 decimal places.
 */
export function roundMoney(value: number): number {
  return roundTo(value, 2);
}

/**
 * Rounds kilometer values to 1 decimal place.
 */
export function roundKm(value: number): number {
  return roundTo(value, 1);
}

/**
 * Rounds fuel quantities to 2 decimal places.
 */
export function roundLiters(value: number): number {
  return roundTo(value, 2);
}