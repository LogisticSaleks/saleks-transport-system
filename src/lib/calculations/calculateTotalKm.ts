import { roundKm } from "./rounding";

export type RouteLegForTotalKm = {
  distanceKm: number;
};

/**
 * Calculates the total distance of all route legs.
 *
 * The individual distances are added first, and the final result
 * is rounded using the shared roundKm helper.
 */
export function calculateTotalKm(
  routeLegs: readonly RouteLegForTotalKm[],
): number {
  const totalKm = routeLegs.reduce((sum, routeLeg) => {
    if (!Number.isFinite(routeLeg.distanceKm)) {
      throw new TypeError(
        "Each route leg must have a finite distanceKm value.",
      );
    }

    if (routeLeg.distanceKm < 0) {
      throw new RangeError(
        "Route leg distanceKm cannot be negative.",
      );
    }

    return sum + routeLeg.distanceKm;
  }, 0);

  return roundKm(totalKm);
}