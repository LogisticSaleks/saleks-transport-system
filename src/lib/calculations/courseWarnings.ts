import type { CoursePricingMethod } from "./calculateCourse";

export const COURSE_WARNING_MESSAGES = {
  missingTariff:
    "Липсва активна тарифа за избрания клиент.",

  vepcoRoundTrip:
    "Vepco round trip: провери дали платимите километри са само еднопосочните километри.",

  billableKmAboveTotal:
    "Платимите километри са повече от общите километри.",

  missingToll:
    "Липсва стойност за toll.",

  missingPrice:
    "Липсва цена на курса.",
} as const;

type BuildCourseInputWarningsInput = {
  hasCourseData: boolean;
  hasSelectedCustomer: boolean;
  hasActiveTariff: boolean;
  pricingMethod: CoursePricingMethod;
  courseType: string;
  totalKm: number | null;
  billableKm: number | null;
  tollValue: string;
};

type BuildCourseDisplayWarningsInput = {
  hasCourseData: boolean;
  inputWarnings: readonly string[];
  effectivePrice: number | null;
  engineWarnings: readonly string[];
};

export function buildCourseInputWarnings({
  hasCourseData,
  hasSelectedCustomer,
  hasActiveTariff,
  pricingMethod,
  courseType,
  totalKm,
  billableKm,
  tollValue,
}: BuildCourseInputWarningsInput): string[] {
  if (!hasCourseData) {
    return [];
  }

  const warnings: string[] = [];

  if (
    hasSelectedCustomer &&
    !hasActiveTariff
  ) {
    warnings.push(
      COURSE_WARNING_MESSAGES.missingTariff,
    );
  }

  if (
    pricingMethod === "VEPCO" &&
    courseType === "ROUND_TRIP"
  ) {
    warnings.push(
      COURSE_WARNING_MESSAGES.vepcoRoundTrip,
    );
  }

  if (
    totalKm !== null &&
    billableKm !== null &&
    billableKm > totalKm
  ) {
    warnings.push(
      COURSE_WARNING_MESSAGES.billableKmAboveTotal,
    );
  }

  if (tollValue.trim() === "") {
    warnings.push(
      COURSE_WARNING_MESSAGES.missingToll,
    );
  }

  return uniqueWarnings(warnings);
}

export function buildCourseDisplayWarnings({
  hasCourseData,
  inputWarnings,
  effectivePrice,
  engineWarnings,
}: BuildCourseDisplayWarningsInput): string[] {
  if (!hasCourseData) {
    return [];
  }

  const warnings = [...inputWarnings];

  if (effectivePrice === null) {
    warnings.push(
      COURSE_WARNING_MESSAGES.missingPrice,
    );
  }

  for (const engineWarning of engineWarnings) {
    const localizedWarning =
      localizeEngineWarning(engineWarning);

    if (localizedWarning !== null) {
      warnings.push(localizedWarning);
    }
  }

  return uniqueWarnings(warnings);
}

function localizeEngineWarning(
  warning: string,
): string | null {
  if (
    warning.includes(
      "manualPrice is required",
    ) ||
    warning.includes(
      "fixedPrice is required",
    )
  ) {
    return null;
  }

  return warning;
}

function uniqueWarnings(
  warnings: readonly string[],
): string[] {
  return Array.from(new Set(warnings));
}