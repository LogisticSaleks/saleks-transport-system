"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const TARIFF_TYPE_OPTIONS = [
  {
    value: "FIXED_TABLE_UPPER_BOUND",
    label: "Тарифна таблица",
  },
  {
    value: "DISTANCE_TABLE",
    label: "Дистанционна таблица",
  },
  {
    value: "PRICE_PER_KM",
    label: "Цена / км",
  },
  {
    value: "FIXED_PRICE",
    label: "Фиксирана цена",
  },
  {
    value: "SHUNT",
    label: "Шунт",
  },
  {
    value: "WAITING_TIME",
    label: "Престой",
  },
  {
    value: "MANUAL",
    label: "Ръчно",
  },
] as const;

const BILLABLE_KM_OPTIONS = [
  {
    value: "TOTAL_ROUTE",
    label: "Целият маршрут",
  },
  {
    value: "ONE_WAY",
    label: "Еднопосочно",
  },
  {
    value: "SELECTED_LEGS",
    label: "Избрани отсечки",
  },
  {
    value: "FIXED_PRICE",
    label: "Фиксирана цена",
  },
  {
    value: "MANUAL",
    label: "Ръчно",
  },
] as const;

type TariffType =
  (typeof TARIFF_TYPE_OPTIONS)[number]["value"];

type BillableKmLogic =
  (typeof BILLABLE_KM_OPTIONS)[number]["value"];

export type CustomerTariffActionTariff = {
  id: string;
  name: string;
  type: TariffType;
  billableKmLogic: BillableKmLogic;
  minKm: number | null;
  maxKm: number | null;
  fixedPrice: number | null;
  pricePerKm: number | null;
  waitingHourlyRate: number | null;
  portFeeIncluded: boolean;
  isActive: boolean;
  notes: string | null;
};

type FormState = {
  name: string;
  type: TariffType;
  billableKmLogic: BillableKmLogic;
  minKm: string;
  maxKm: string;
  fixedPrice: string;
  pricePerKm: string;
  waitingHourlyRate: string;
  portFeeIncluded: boolean;
  isActive: boolean;
  notes: string;
};

type CustomerTariffActionsProps = {
  customerName: string;
  tariff: CustomerTariffActionTariff;
};

export default function CustomerTariffActions({
  customerName,
  tariff,
}: CustomerTariffActionsProps) {
  const router = useRouter();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [form, setForm] = useState<FormState>(() =>
    createFormFromTariff(tariff),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    null,
  );

  function updateField<K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ): void {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));

    setErrorMessage(null);
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    const validationError = validateForm(form);

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/customer-tariffs", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: tariff.id,
          name: form.name.trim(),
          type: form.type,
          billableKmLogic: form.billableKmLogic,
          minKm: normalizeOptionalNumber(form.minKm),
          maxKm: normalizeOptionalNumber(form.maxKm),
          fixedPrice: normalizeOptionalNumber(form.fixedPrice),
          pricePerKm: normalizeOptionalNumber(form.pricePerKm),
          waitingHourlyRate: normalizeOptionalNumber(
            form.waitingHourlyRate,
          ),
          portFeeIncluded: form.portFeeIncluded,
          isActive: form.isActive,
          notes: normalizeOptionalText(form.notes),
        }),
      });

      const responseData = (await response.json().catch(() => null)) as
        | {
            error?: string;
          }
        | null;

      if (!response.ok) {
        throw new Error(
          responseData?.error ??
            "Тарифното правило не можа да бъде обновено.",
        );
      }

      setIsEditOpen(false);
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Тарифното правило не можа да бъде обновено.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleActive(): Promise<void> {
    const nextIsActive = !tariff.isActive;
    const confirmed = window.confirm(
      nextIsActive
        ? `Сигурен ли си, че искаш да активираш тарифата "${tariff.name}"?`
        : `Сигурен ли си, че искаш да деактивираш тарифата "${tariff.name}"? Старите курсове ще останат запазени.`,
    );

    if (!confirmed) {
      return;
    }

    setIsChangingStatus(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/customer-tariffs", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: tariff.id,
          isActive: nextIsActive,
        }),
      });

      const responseData = (await response.json().catch(() => null)) as
        | {
            error?: string;
          }
        | null;

      if (!response.ok) {
        throw new Error(
          responseData?.error ??
            "Статусът на тарифата не можа да бъде обновен.",
        );
      }

      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Статусът на тарифата не можа да бъде обновен.",
      );
    } finally {
      setIsChangingStatus(false);
    }
  }

  return (
    <div className="min-w-[170px] space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setForm(createFormFromTariff(tariff));
            setIsEditOpen(true);
            setErrorMessage(null);
          }}
          className="inline-flex h-8 items-center justify-center rounded-md border border-slate-400 bg-white px-3 text-xs font-semibold text-slate-800 shadow-sm transition hover:border-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300"
        >
          Редакция
        </button>

        <button
          type="button"
          onClick={handleToggleActive}
          disabled={isChangingStatus}
          className={[
            "inline-flex h-8 items-center justify-center rounded-md border px-3 text-xs font-semibold shadow-sm transition focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60",
            tariff.isActive
              ? "border-amber-300 bg-amber-50 text-amber-800 hover:border-amber-400 hover:bg-amber-100 focus:ring-amber-300"
              : "border-emerald-300 bg-emerald-50 text-emerald-800 hover:border-emerald-400 hover:bg-emerald-100 focus:ring-emerald-300",
          ].join(" ")}
        >
          {isChangingStatus
            ? "..."
            : tariff.isActive
              ? "Деактивирай"
              : "Активирай"}
        </button>
      </div>

      {errorMessage && !isEditOpen && (
        <p className="rounded-md border border-red-300 bg-red-50 px-2 py-1 text-xs font-medium leading-4 text-red-700">
          {errorMessage}
        </p>
      )}

      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 px-4 py-8">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-5xl rounded-2xl border border-slate-500 bg-white p-4 shadow-2xl"
          >
            <div className="flex flex-col gap-2 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Редакция на тарифа
                </p>

                <h3 className="mt-1 text-lg font-bold text-slate-950">
                  {tariff.name}
                </h3>

                <p className="mt-1 text-sm text-slate-600">
                  Клиент: {customerName}
                </p>
              </div>

              <button
                type="button"
                disabled={isSaving}
                onClick={() => {
                  setIsEditOpen(false);
                  setErrorMessage(null);
                }}
                className="inline-flex h-9 items-center justify-center rounded-md border border-slate-400 bg-white px-3 text-xs font-semibold text-slate-800 transition hover:border-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Затвори
              </button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <TextField
                label="Име"
                value={form.name}
                onChange={(value) => updateField("name", value)}
                required
              />

              <SelectField
                label="Тип"
                value={form.type}
                onChange={(value) =>
                  updateField("type", value as TariffType)
                }
                options={TARIFF_TYPE_OPTIONS}
              />

              <SelectField
                label="Платими км"
                value={form.billableKmLogic}
                onChange={(value) =>
                  updateField(
                    "billableKmLogic",
                    value as BillableKmLogic,
                  )
                }
                options={BILLABLE_KM_OPTIONS}
              />

              <SelectField
                label="Статус"
                value={form.isActive ? "ACTIVE" : "INACTIVE"}
                onChange={(value) =>
                  updateField("isActive", value === "ACTIVE")
                }
                options={[
                  {
                    value: "ACTIVE",
                    label: "Активна",
                  },
                  {
                    value: "INACTIVE",
                    label: "Неактивна",
                  },
                ]}
              />

              <NumberField
                label="Min km"
                value={form.minKm}
                onChange={(value) => updateField("minKm", value)}
              />

              <NumberField
                label="Max km"
                value={form.maxKm}
                onChange={(value) => updateField("maxKm", value)}
              />

              <NumberField
                label="Фикс цена"
                value={form.fixedPrice}
                onChange={(value) =>
                  updateField("fixedPrice", value)
                }
              />

              <NumberField
                label="Цена / км"
                value={form.pricePerKm}
                onChange={(value) =>
                  updateField("pricePerKm", value)
                }
                step="0.0001"
              />

              <NumberField
                label="Престой / час"
                value={form.waitingHourlyRate}
                onChange={(value) =>
                  updateField("waitingHourlyRate", value)
                }
              />

              <label className="flex min-h-10 items-center gap-2 rounded-md border border-slate-400 bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm">
                <input
                  type="checkbox"
                  checked={form.portFeeIncluded}
                  onChange={(event) =>
                    updateField(
                      "portFeeIncluded",
                      event.target.checked,
                    )
                  }
                  className="h-4 w-4 rounded border-slate-400"
                />
                Пристанищна такса включена
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-semibold text-slate-800 md:col-span-2 xl:col-span-4">
                Бележки
                <textarea
                  value={form.notes}
                  onChange={(event) =>
                    updateField("notes", event.target.value)
                  }
                  rows={3}
                  className="w-full rounded-md border border-slate-400 bg-white px-3 py-2 text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                />
              </label>
            </div>

            {errorMessage && (
              <p className="mt-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                {errorMessage}
              </p>
            )}

            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => {
                  setForm(createFormFromTariff(tariff));
                  setIsEditOpen(false);
                  setErrorMessage(null);
                }}
                className="inline-flex h-9 items-center justify-center rounded-md border border-slate-400 bg-white px-3 text-xs font-semibold text-slate-800 transition hover:border-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Отказ
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex h-9 items-center justify-center rounded-md bg-slate-900 px-3 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "Записване..." : "Запази промени"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-semibold text-slate-800">
      {label}
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="h-10 w-full rounded-md border border-slate-400 bg-white px-3 text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step = "0.01",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  step?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-semibold text-slate-800">
      {label}
      <input
        type="number"
        min="0"
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-md border border-slate-400 bg-white px-3 text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly {
    value: string;
    label: string;
  }[];
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-semibold text-slate-800">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-md border border-slate-400 bg-white px-3 text-slate-950 shadow-sm outline-none transition hover:border-slate-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function createFormFromTariff(
  tariff: CustomerTariffActionTariff,
): FormState {
  return {
    name: tariff.name,
    type: tariff.type,
    billableKmLogic: tariff.billableKmLogic,
    minKm: formatOptionalNumber(tariff.minKm),
    maxKm: formatOptionalNumber(tariff.maxKm),
    fixedPrice: formatOptionalNumber(tariff.fixedPrice),
    pricePerKm: formatOptionalNumber(tariff.pricePerKm),
    waitingHourlyRate: formatOptionalNumber(
      tariff.waitingHourlyRate,
    ),
    portFeeIncluded: tariff.portFeeIncluded,
    isActive: tariff.isActive,
    notes: tariff.notes ?? "",
  };
}

function validateForm(form: FormState): string | null {
  if (form.name.trim() === "") {
    return "Името на тарифата е задължително.";
  }

  const minKm = parseOptionalNumber(form.minKm);
  const maxKm = parseOptionalNumber(form.maxKm);

  if (
    minKm !== null &&
    maxKm !== null &&
    minKm > maxKm
  ) {
    return "Min km не може да бъде по-голямо от Max km.";
  }

  if (
    form.type === "PRICE_PER_KM" &&
    parseOptionalNumber(form.pricePerKm) === null
  ) {
    return "За тип Цена / км въведи Цена / км.";
  }

  if (
    (form.type === "FIXED_PRICE" ||
      form.type === "SHUNT" ||
      form.type === "FIXED_TABLE_UPPER_BOUND" ||
      form.type === "DISTANCE_TABLE") &&
    parseOptionalNumber(form.fixedPrice) === null
  ) {
    return "За този тип тарифа въведи Фикс цена.";
  }

  if (
    form.type === "WAITING_TIME" &&
    parseOptionalNumber(form.waitingHourlyRate) === null
  ) {
    return "За тип Престой въведи Престой / час.";
  }

  return null;
}

function normalizeOptionalText(value: string): string | null {
  const normalizedValue = value.trim();

  return normalizedValue === "" ? null : normalizedValue;
}

function normalizeOptionalNumber(value: string): number | null {
  return parseOptionalNumber(value);
}

function parseOptionalNumber(value: string): number | null {
  const normalizedValue = value.trim();

  if (normalizedValue === "") {
    return null;
  }

  const parsedValue = Number(normalizedValue);

  return Number.isFinite(parsedValue) && parsedValue >= 0
    ? parsedValue
    : null;
}

function formatOptionalNumber(value: number | null): string {
  if (value === null) {
    return "";
  }

  return String(value);
}