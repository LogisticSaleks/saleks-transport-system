"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

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

const CUSTOMER_STATUS_OPTIONS = [
  {
    value: "ACTIVE",
    label: "Активен",
  },
  {
    value: "INACTIVE",
    label: "Неактивен",
  },
] as const;

type BillableKmLogic =
  (typeof BILLABLE_KM_OPTIONS)[number]["value"];

type CustomerStatus =
  (typeof CUSTOMER_STATUS_OPTIONS)[number]["value"];

type FormState = {
  name: string;
  email: string;
  phone: string;
  vatNumber: string;
  status: CustomerStatus;
  billableKmLogic: BillableKmLogic;
  notes: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  email: "",
  phone: "",
  vatNumber: "",
  status: "ACTIVE",
  billableKmLogic: "MANUAL",
  notes: "",
};

export default function CustomerCreateForm() {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
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

    const customerName = form.name.trim();

    if (customerName === "") {
      setErrorMessage("Името на клиента е задължително.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: customerName,
          email: normalizeOptionalText(form.email),
          phone: normalizeOptionalText(form.phone),
          vatNumber: normalizeOptionalText(form.vatNumber),
          status: form.status,
          billableKmLogic: form.billableKmLogic,
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
            "Клиентът не можа да бъде създаден.",
        );
      }

      setForm(EMPTY_FORM);
      setIsOpen(false);
      setSuccessMessage("Клиентът е създаден успешно.");
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Клиентът не можа да бъде създаден.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-300 bg-slate-100 p-3 shadow-sm">
      <div className="rounded-xl border border-slate-400 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950">
              Нов клиент
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-600">
              Добави клиент в системата. Тарифите ще се добавят
              отделно в следващата стъпка.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsOpen((currentValue) => !currentValue);
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className="inline-flex h-10 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            {isOpen ? "Затвори формата" : "Добави клиент"}
          </button>
        </div>

        {successMessage && (
          <p className="mt-3 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
            {successMessage}
          </p>
        )}

        {isOpen && (
          <form
            onSubmit={handleSubmit}
            className="mt-4 rounded-xl border-2 border-sky-300 bg-sky-50 p-4 shadow-md"
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <TextField
                label="Име"
                value={form.name}
                onChange={(value) => updateField("name", value)}
                required
                placeholder="Например: Hapag-Lloyd"
              />

              <TextField
                label="Имейл"
                value={form.email}
                onChange={(value) => updateField("email", value)}
                type="email"
                placeholder="planning@example.com"
              />

              <TextField
                label="Телефон"
                value={form.phone}
                onChange={(value) => updateField("phone", value)}
                placeholder="+31..."
              />

              <TextField
                label="VAT"
                value={form.vatNumber}
                onChange={(value) =>
                  updateField("vatNumber", value)
                }
                placeholder="NL..."
              />

              <SelectField
                label="Статус"
                value={form.status}
                onChange={(value) =>
                  updateField("status", value as CustomerStatus)
                }
                options={CUSTOMER_STATUS_OPTIONS}
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

              <label className="flex flex-col gap-1.5 text-sm font-semibold text-slate-800 md:col-span-2 xl:col-span-3">
                Бележки
                <textarea
                  value={form.notes}
                  onChange={(event) =>
                    updateField("notes", event.target.value)
                  }
                  rows={3}
                  placeholder="Вътрешни бележки за клиента..."
                  className="w-full rounded-md border border-slate-400 bg-white px-3 py-2 text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                />
              </label>
            </div>

            {errorMessage && (
              <p className="mt-4 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                {errorMessage}
              </p>
            )}

            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setForm(EMPTY_FORM);
                  setIsOpen(false);
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                disabled={isSaving}
                className="inline-flex h-10 items-center justify-center rounded-md border border-slate-400 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:border-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Отказ
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex h-10 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "Записване..." : "Запази клиент"}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email";
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-semibold text-slate-800">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
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

function normalizeOptionalText(value: string): string | null {
  const normalizedValue = value.trim();

  return normalizedValue === "" ? null : normalizedValue;
}