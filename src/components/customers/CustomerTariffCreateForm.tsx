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

type CustomerTariffCreateFormProps = {
  customerId: string;
  customerName: string;
  defaultBillableKmLogic: BillableKmLogic;
};

function createEmptyForm(
  defaultBillableKmLogic: BillableKmLogic,
): FormState {
  return {
    name: "",
    type: "PRICE_PER_KM",
    billableKmLogic: defaultBillableKmLogic,
    minKm: "",
    maxKm: "",
    fixedPrice: "",
    pricePerKm: "",
    waitingHourlyRate: "",
    portFeeIncluded: false,
    isActive: true,
    notes: "",
  };
}

export default function CustomerTariffCreateForm({
  customerId,
  customerName,
  defaultBillableKmLogic,
}: CustomerTariffCreateFormProps) {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<FormState>(() =>
    createEmptyForm(defaultBillableKmLogic),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    null,
  );
  const [successMessage, setSuccessMessage] = useState<
    string | null
  >(null);

  function updateField<K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ): void {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));

    setErrorMessage(null);
    setSuccessMessage(null);
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
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/customer-tariffs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerId,
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
            "Тарифното правило не можа да бъде създадено.",
        );
      }

      setForm(createEmptyForm(defaultBillableKmLogic));
      setIsOpen(false);
      setSuccessMessage("Тарифното правило е създадено успешно.");
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Тарифното правило не можа да бъде създадено.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mt-3 rounded-lg border border-slate-300 bg-white p-3 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="text-sm font-bold text-slate-900">
            Добавяне на тарифа
          </h4>

          <p className="mt-1 text-xs leading-5 text-slate-600">
            Клиент: {customerName}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setIsOpen((currentValue) => !currentValue);
            setErrorMessage(null);
            setSuccessMessage(null);
          }}
          className="inline-flex h-9 items-center justify-center rounded-md border border-slate-500 bg-slate-900 px-3 text-xs font-semibold text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          {isOpen ? "Затвори" : "Нова тарифа"}
        </button>
      </div>

      {successMessage && (
        <p className="mt-3 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
          {successMessage}
        </p>
      )}

      {isOpen && (
        <form
          onSubmit={handleSubmit}
          className="mt-3 rounded-lg border-2 border-sky-300 bg-sky-50 p-3 shadow-sm"
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <TextField
              label="Име"
              value={form.name}
              onChange={(value) => updateField("name", value)}
              placeholder="Например: 0–10 km"
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
              placeholder="0"
            />

            <NumberField
              label="Max km"
              value={form.maxKm}
              onChange={(value) => updateField("maxKm", value)}
              placeholder="100"
            />

            <NumberField
              label="Фикс цена"
              value={form.fixedPrice}
              onChange={(value) =>
                updateField("fixedPrice", value)
              }
              placeholder="250.00"
            />

            <NumberField
              label="Цена / км"
              value={form.pricePerKm}
              onChange={(value) =>
                updateField("pricePerKm", value)
              }
              placeholder="1.50"
              step="0.0001"
            />

            <NumberField
              label="Престой / час"
              value={form.waitingHourlyRate}
              onChange={(value) =>
                updateField("waitingHourlyRate", value)
              }
              placeholder="50.00"
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
                rows={2}
                placeholder="Вътрешни бележки за тарифата..."
                className="w-full rounded-md border border-slate-400 bg-white px-3 py-2 text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
              />
            </label>
          </div>

          {errorMessage && (
            <p className="mt-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              {errorMessage}
            </p>
          )}

          <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={isSaving}
              onClick={() => {
                setForm(createEmptyForm(defaultBillableKmLogic));
                setIsOpen(false);
                setErrorMessage(null);
                setSuccessMessage(null);
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
              {isSaving ? "Записване..." : "Запази тарифа"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-semibold text-slate-800">
      {label}
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
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
  placeholder,
  step = "0.01",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
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
        placeholder={placeholder}
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
  const parsedValue = parseOptionalNumber(value);

  return parsedValue;
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