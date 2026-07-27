"use client";

import { useMemo, useState } from "react";

import type { CalculationSettings } from "@/lib/settings/calculationSettings";

type CalculationSettingsFormProps = {
  initialSettings: CalculationSettings;
  defaultSettings: CalculationSettings;
};

type FormField = {
  key: string;
  label: string;
  description: string;
  value: string;
  min: number;
  step: number;
  onChange: (value: string) => void;
};

type SaveSettingsApiResponse = {
  settings?: CalculationSettings;
  error?: string;
};

export default function CalculationSettingsForm({
  initialSettings,
  defaultSettings,
}: CalculationSettingsFormProps) {
  const [fuelConsumption, setFuelConsumption] =
    useState(
      String(
        initialSettings.fuel
          .consumptionLitersPer100Km,
      ),
    );

  const [fuelPrice, setFuelPrice] = useState(
    String(initialSettings.fuel.fuelPricePerLiter),
  );

  const [msiPricePerKm, setMsiPricePerKm] =
    useState(
      String(initialSettings.msi.pricePerKm),
    );

  const [freeWaitingHours, setFreeWaitingHours] =
    useState(
      String(
        initialSettings.waiting.freeWaitingHours,
      ),
    );

  const [waitingPricePerHour, setWaitingPricePerHour] =
    useState(
      String(initialSettings.waiting.pricePerHour),
    );

  const [lowProfitMargin, setLowProfitMargin] =
    useState(
      String(
        initialSettings.pricingStatus
          .lowProfitMarginPercent,
      ),
    );

  const [breakEvenTolerance, setBreakEvenTolerance] =
    useState(
      String(
        initialSettings.pricingStatus
          .breakEvenTolerance,
      ),
    );

  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);
  const [successMessage, setSuccessMessage] =
    useState<string | null>(null);

  const fields = useMemo<FormField[]>(
    () => [
      {
        key: "fuel-consumption",
        label: "Default fuel consumption",
        description:
          "Liters per 100 km. Used only when the selected truck has no own default.",
        value: fuelConsumption,
        min: 0.01,
        step: 0.01,
        onChange: setFuelConsumption,
      },
      {
        key: "fuel-price",
        label: "Fuel price per liter",
        description:
          "Default diesel price used for fuel cost calculation.",
        value: fuelPrice,
        min: 0,
        step: 0.01,
        onChange: setFuelPrice,
      },
      {
        key: "msi-price",
        label: "MSI default price/km",
        description:
          "Used when MSI calculation has no selected customer tariff override.",
        value: msiPricePerKm,
        min: 0,
        step: 0.0001,
        onChange: setMsiPricePerKm,
      },
      {
        key: "free-waiting",
        label: "Free waiting hours",
        description:
          "Waiting time that is not charged to the client.",
        value: freeWaitingHours,
        min: 0,
        step: 0.25,
        onChange: setFreeWaitingHours,
      },
      {
        key: "waiting-price",
        label: "Waiting price/hour",
        description:
          "Default amount charged for every paid waiting hour.",
        value: waitingPricePerHour,
        min: 0,
        step: 0.01,
        onChange: setWaitingPricePerHour,
      },
      {
        key: "low-profit",
        label: "Low profit margin %",
        description:
          "Courses below this margin can be marked as low profit.",
        value: lowProfitMargin,
        min: 0,
        step: 0.01,
        onChange: setLowProfitMargin,
      },
      {
        key: "break-even",
        label: "Break-even tolerance",
        description:
          "Small EUR tolerance around zero profit for break-even status.",
        value: breakEvenTolerance,
        min: 0,
        step: 0.01,
        onChange: setBreakEvenTolerance,
      },
    ],
    [
      fuelConsumption,
      fuelPrice,
      msiPricePerKm,
      freeWaitingHours,
      waitingPricePerHour,
      lowProfitMargin,
      breakEvenTolerance,
    ],
  );

  async function handleSave(): Promise<void> {
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const nextSettings = buildSettingsPayload();

      const response = await fetch(
        "/api/settings/calculation",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(nextSettings),
        },
      );

      const responseData =
        (await response
          .json()
          .catch(() => null)) as
          | SaveSettingsApiResponse
          | null;

      if (!response.ok) {
        throw new Error(
          responseData?.error ??
            "Calculation settings could not be saved.",
        );
      }

      if (!responseData?.settings) {
        throw new Error(
          "The API did not return saved settings.",
        );
      }

      applySettingsToForm(responseData.settings);
      setSuccessMessage("Calculation settings saved.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Calculation settings could not be saved.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleResetToDefaults(): void {
    applySettingsToForm(defaultSettings);
    setErrorMessage(null);
    setSuccessMessage(
      "Default values loaded in the form. Press Save to store them.",
    );
  }

  function buildSettingsPayload(): CalculationSettings {
    return {
      fuel: {
        consumptionLitersPer100Km:
          readFormNumber({
            value: fuelConsumption,
            fieldLabel:
              "Default fuel consumption",
            minimum: 0.01,
          }),
        fuelPricePerLiter: readFormNumber({
          value: fuelPrice,
          fieldLabel: "Fuel price per liter",
          minimum: 0,
        }),
      },
      msi: {
        pricePerKm: readFormNumber({
          value: msiPricePerKm,
          fieldLabel: "MSI default price/km",
          minimum: 0,
        }),
      },
      waiting: {
        freeWaitingHours: readFormNumber({
          value: freeWaitingHours,
          fieldLabel: "Free waiting hours",
          minimum: 0,
        }),
        pricePerHour: readFormNumber({
          value: waitingPricePerHour,
          fieldLabel: "Waiting price/hour",
          minimum: 0,
        }),
      },
      pricingStatus: {
        lowProfitMarginPercent:
          readFormNumber({
            value: lowProfitMargin,
            fieldLabel:
              "Low profit margin %",
            minimum: 0,
          }),
        breakEvenTolerance: readFormNumber({
          value: breakEvenTolerance,
          fieldLabel: "Break-even tolerance",
          minimum: 0,
        }),
      },
    };
  }

  function applySettingsToForm(
    settings: CalculationSettings,
  ): void {
    setFuelConsumption(
      String(
        settings.fuel
          .consumptionLitersPer100Km,
      ),
    );
    setFuelPrice(
      String(settings.fuel.fuelPricePerLiter),
    );
    setMsiPricePerKm(
      String(settings.msi.pricePerKm),
    );
    setFreeWaitingHours(
      String(settings.waiting.freeWaitingHours),
    );
    setWaitingPricePerHour(
      String(settings.waiting.pricePerHour),
    );
    setLowProfitMargin(
      String(
        settings.pricingStatus
          .lowProfitMarginPercent,
      ),
    );
    setBreakEvenTolerance(
      String(
        settings.pricingStatus.breakEvenTolerance,
      ),
    );
  }

  return (
    <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {fields.map((field) => (
          <label
            key={field.key}
            className="flex flex-col gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-800"
          >
            {field.label}

            <input
              type="number"
              value={field.value}
              min={field.min}
              step={field.step}
              onChange={(event) =>
                field.onChange(
                  event.target.value,
                )
              }
              className="h-10 rounded-md border border-slate-400 bg-white px-3 text-slate-950 shadow-sm outline-none transition hover:border-slate-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
            />

            <span className="text-xs font-normal leading-5 text-slate-500">
              {field.description}
            </span>
          </label>
        ))}

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-800">
            Currency
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-950">
            EUR
          </p>

          <p className="mt-2 text-xs leading-5 text-slate-500">
            Currency is currently fixed because all reports and course
            calculations are in EUR.
          </p>
        </div>
      </div>

      {errorMessage && (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700"
        >
          {errorMessage}
        </p>
      )}

      {successMessage && (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
          {successMessage}
        </p>
      )}

      <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-slate-500">
          This page stores values in AppSetting. The next step will connect
          these saved values to the Courses calculation UI.
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleResetToDefaults}
            disabled={isSaving}
            className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Load defaults
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            aria-busy={isSaving}
            className="inline-flex h-10 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save settings"}
          </button>
        </div>
      </div>
    </section>
  );
}

function readFormNumber({
  value,
  fieldLabel,
  minimum,
}: {
  value: string;
  fieldLabel: string;
  minimum: number;
}): number {
  const parsedValue = Number(value);

  if (
    !Number.isFinite(parsedValue) ||
    parsedValue < minimum
  ) {
    throw new Error(
      `${fieldLabel} must be a number greater than or equal to ${minimum}.`,
    );
  }

  return parsedValue;
}