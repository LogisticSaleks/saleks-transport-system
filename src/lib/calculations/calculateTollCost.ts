import { roundMoney } from "./rounding";

export type RouteLegForTollCost = {
  tollCost: number;
};

export type CalculateTollCostInput = {
  routeLegs: readonly RouteLegForTollCost[];
  manualTollOverride?: number;
};

/**
 * Calculates the total toll cost for a route.
 *
 * When manualTollOverride is provided, it replaces the automatically
 * calculated total from the route legs.
 */
export function calculateTollCost({
  routeLegs,
  manualTollOverride,
}: CalculateTollCostInput): number {
  if (manualTollOverride !== undefined) {
    validateTollCost(manualTollOverride, "manualTollOverride");

    return roundMoney(manualTollOverride);
  }

  const totalTollCost = routeLegs.reduce((sum, routeLeg, index) => {
    validateTollCost(
      routeLeg.tollCost,
      `routeLegs[${index}].tollCost`,
    );

    return sum + routeLeg.tollCost;
  }, 0);

  return roundMoney(totalTollCost);
}

function validateTollCost(value: number, fieldName: string): void {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${fieldName} must be a finite number.`);
  }

  if (value < 0) {
    throw new RangeError(`${fieldName} cannot be negative.`);
  }
}