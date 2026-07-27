import "server-only";

import { prisma } from "@/lib/prisma";

import {
  calculationSettings,
  type CalculationSettings,
} from "./calculationSettings";

type NumericCalculationSettingDefinition = {
  key: string;
  description: string;
  minimum: number;
  getDefaultValue: (
    settings: CalculationSettings,
  ) => number;
  applyValue: (
    settings: CalculationSettings,
    value: number,
  ) => CalculationSettings;
};

const SETTINGS_GROUP = "calculation";

const NUMERIC_CALCULATION_SETTINGS: readonly NumericCalculationSettingDefinition[] = [
  {
    key: "calculation.fuel.consumptionLitersPer100Km",
    description:
      "Default truck fuel consumption in liters per 100 km. Individual trucks can override this.",
    minimum: 0.01,
    getDefaultValue: (settings) =>
      settings.fuel.consumptionLitersPer100Km,
    applyValue: (settings, value) => ({
      ...settings,
      fuel: {
        ...settings.fuel,
        consumptionLitersPer100Km: value,
      },
    }),
  },
  {
    key: "calculation.fuel.fuelPricePerLiter",
    description:
      "Default fuel price per liter in EUR used for course cost calculations.",
    minimum: 0,
    getDefaultValue: (settings) =>
      settings.fuel.fuelPricePerLiter,
    applyValue: (settings, value) => ({
      ...settings,
      fuel: {
        ...settings.fuel,
        fuelPricePerLiter: value,
      },
    }),
  },
  {
    key: "calculation.msi.pricePerKm",
    description:
      "Default MSI price per billable kilometer when no specific tariff overrides it.",
    minimum: 0,
    getDefaultValue: (settings) =>
      settings.msi.pricePerKm,
    applyValue: (settings, value) => ({
      ...settings,
      msi: {
        ...settings.msi,
        pricePerKm: value,
      },
    }),
  },
  {
    key: "calculation.waiting.freeWaitingHours",
    description:
      "Free waiting time before waiting charges are calculated.",
    minimum: 0,
    getDefaultValue: (settings) =>
      settings.waiting.freeWaitingHours,
    applyValue: (settings, value) => ({
      ...settings,
      waiting: {
        ...settings.waiting,
        freeWaitingHours: value,
      },
    }),
  },
  {
    key: "calculation.waiting.pricePerHour",
    description:
      "Default waiting charge per hour in EUR.",
    minimum: 0,
    getDefaultValue: (settings) =>
      settings.waiting.pricePerHour,
    applyValue: (settings, value) => ({
      ...settings,
      waiting: {
        ...settings.waiting,
        pricePerHour: value,
      },
    }),
  },
  {
    key: "calculation.pricingStatus.lowProfitMarginPercent",
    description:
      "Margin percentage below which a profitable course is marked as low profit.",
    minimum: 0,
    getDefaultValue: (settings) =>
      settings.pricingStatus.lowProfitMarginPercent,
    applyValue: (settings, value) => ({
      ...settings,
      pricingStatus: {
        ...settings.pricingStatus,
        lowProfitMarginPercent: value,
      },
    }),
  },
  {
    key: "calculation.pricingStatus.breakEvenTolerance",
    description:
      "Tolerance in EUR used when deciding whether a course is break-even.",
    minimum: 0,
    getDefaultValue: (settings) =>
      settings.pricingStatus.breakEvenTolerance,
    applyValue: (settings, value) => ({
      ...settings,
      pricingStatus: {
        ...settings.pricingStatus,
        breakEvenTolerance: value,
      },
    }),
  },
];

export async function loadCalculationSettingsFromDb(): Promise<CalculationSettings> {
  const records = await prisma.appSetting.findMany({
    where: {
      group: SETTINGS_GROUP,
      key: {
        in: NUMERIC_CALCULATION_SETTINGS.map(
          (setting) => setting.key,
        ),
      },
    },
    select: {
      key: true,
      value: true,
    },
  });

  const valuesByKey = new Map(
    records.map((record) => [
      record.key,
      record.value,
    ]),
  );

  return NUMERIC_CALCULATION_SETTINGS.reduce(
    (settings, definition) => {
      const rawValue = valuesByKey.get(
        definition.key,
      );

      const parsedValue = parseNumericSettingValue({
        rawValue,
        minimum: definition.minimum,
      });

      if (parsedValue === null) {
        return settings;
      }

      return definition.applyValue(
        settings,
        parsedValue,
      );
    },
    calculationSettings,
  );
}

export async function saveCalculationSettingsToDb(
  settings: CalculationSettings,
): Promise<CalculationSettings> {
  const normalizedSettings =
    normalizeCalculationSettings(settings);

  await Promise.all(
    NUMERIC_CALCULATION_SETTINGS.map((definition) =>
      prisma.appSetting.upsert({
        where: {
          key: definition.key,
        },
        create: {
          key: definition.key,
          value: String(
            definition.getDefaultValue(
              normalizedSettings,
            ),
          ),
          valueType: "NUMBER",
          group: SETTINGS_GROUP,
          description: definition.description,
          isPublic: false,
        },
        update: {
          value: String(
            definition.getDefaultValue(
              normalizedSettings,
            ),
          ),
          valueType: "NUMBER",
          group: SETTINGS_GROUP,
          description: definition.description,
          isPublic: false,
        },
      }),
    ),
  );

  return normalizedSettings;
}

export function parseCalculationSettingsPayload(
  payload: unknown,
): CalculationSettings {
  if (!isObjectRecord(payload)) {
    throw new Error(
      "Calculation settings payload must be an object.",
    );
  }

  const fuel = readObject(payload, "fuel");
  const msi = readObject(payload, "msi");
  const waiting = readObject(payload, "waiting");
  const pricingStatus = readObject(
    payload,
    "pricingStatus",
  );

  return normalizeCalculationSettings({
    fuel: {
      consumptionLitersPer100Km:
        readFiniteNumber(
          fuel,
          "consumptionLitersPer100Km",
        ),
      fuelPricePerLiter: readFiniteNumber(
        fuel,
        "fuelPricePerLiter",
      ),
    },
    msi: {
      pricePerKm: readFiniteNumber(
        msi,
        "pricePerKm",
      ),
    },
    waiting: {
      freeWaitingHours: readFiniteNumber(
        waiting,
        "freeWaitingHours",
      ),
      pricePerHour: readFiniteNumber(
        waiting,
        "pricePerHour",
      ),
    },
    pricingStatus: {
      lowProfitMarginPercent:
        readFiniteNumber(
          pricingStatus,
          "lowProfitMarginPercent",
        ),
      breakEvenTolerance: readFiniteNumber(
        pricingStatus,
        "breakEvenTolerance",
      ),
    },
  });
}

export function normalizeCalculationSettings(
  settings: CalculationSettings,
): CalculationSettings {
  return {
    fuel: {
      consumptionLitersPer100Km:
        normalizeFiniteNumber({
          value:
            settings.fuel
              .consumptionLitersPer100Km,
          fallback:
            calculationSettings.fuel
              .consumptionLitersPer100Km,
          minimum: 0.01,
        }),
      fuelPricePerLiter: normalizeFiniteNumber({
        value: settings.fuel.fuelPricePerLiter,
        fallback:
          calculationSettings.fuel
            .fuelPricePerLiter,
        minimum: 0,
      }),
    },
    msi: {
      pricePerKm: normalizeFiniteNumber({
        value: settings.msi.pricePerKm,
        fallback: calculationSettings.msi.pricePerKm,
        minimum: 0,
      }),
    },
    waiting: {
      freeWaitingHours: normalizeFiniteNumber({
        value: settings.waiting.freeWaitingHours,
        fallback:
          calculationSettings.waiting
            .freeWaitingHours,
        minimum: 0,
      }),
      pricePerHour: normalizeFiniteNumber({
        value: settings.waiting.pricePerHour,
        fallback:
          calculationSettings.waiting.pricePerHour,
        minimum: 0,
      }),
    },
    pricingStatus: {
      lowProfitMarginPercent: normalizeFiniteNumber({
        value:
          settings.pricingStatus
            .lowProfitMarginPercent,
        fallback:
          calculationSettings.pricingStatus
            .lowProfitMarginPercent,
        minimum: 0,
      }),
      breakEvenTolerance: normalizeFiniteNumber({
        value:
          settings.pricingStatus.breakEvenTolerance,
        fallback:
          calculationSettings.pricingStatus
            .breakEvenTolerance,
        minimum: 0,
      }),
    },
  };
}

function parseNumericSettingValue({
  rawValue,
  minimum,
}: {
  rawValue: string | undefined;
  minimum: number;
}): number | null {
  if (rawValue === undefined) {
    return null;
  }

  const parsedValue = Number(rawValue);

  if (
    !Number.isFinite(parsedValue) ||
    parsedValue < minimum
  ) {
    return null;
  }

  return parsedValue;
}

function normalizeFiniteNumber({
  value,
  fallback,
  minimum,
}: {
  value: number;
  fallback: number;
  minimum: number;
}): number {
  if (!Number.isFinite(value) || value < minimum) {
    return fallback;
  }

  return Math.round(value * 10_000) / 10_000;
}

function readObject(
  record: Record<string, unknown>,
  key: string,
): Record<string, unknown> {
  const value = record[key];

  if (!isObjectRecord(value)) {
    throw new Error(`Missing settings group: ${key}.`);
  }

  return value;
}

function readFiniteNumber(
  record: Record<string, unknown>,
  key: string,
): number {
  const value = record[key];
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    throw new Error(`Invalid numeric setting: ${key}.`);
  }

  return parsedValue;
}

function isObjectRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}