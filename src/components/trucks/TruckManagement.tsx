"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";

export type TruckStatusValue =
  | "ACTIVE"
  | "INACTIVE"
  | "MAINTENANCE"
  | "SOLD";

export type TruckRow = {
  id: string;
  name: string;
  licensePlate: string;
  vin: string | null;
  status: string;
  euroClass: string;
  defaultFuelConsumptionLPer100Km: number;
  monthlyLeaseCost: number;
  monthlyInsuranceCost: number;
  monthlyRoadTaxCost: number;
  monthlyOtherFixedCost: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

type TrucksApiResponse = {
  truck?: TruckRow;
  trucks?: TruckRow[];
  error?: string;
};

type TruckFormState = {
  id: string | null;
  name: string;
  licensePlate: string;
  vin: string;
  status: TruckStatusValue;
  euroClass: string;
  defaultFuelConsumptionLPer100Km: string;
  monthlyLeaseCost: string;
  monthlyInsuranceCost: string;
  monthlyRoadTaxCost: string;
  monthlyOtherFixedCost: string;
  notes: string;
};

type TruckManagementProps = {
  initialTrucks: readonly TruckRow[];
};

const TRUCK_STATUSES: Array<{
  value: TruckStatusValue;
  label: string;
  description: string;
}> = [
  {
    value: "ACTIVE",
    label: "Active",
    description: "Може да се планира и отчита.",
  },
  {
    value: "INACTIVE",
    label: "Inactive",
    description: "Временно не се използва.",
  },
  {
    value: "MAINTENANCE",
    label: "Maintenance",
    description: "В сервиз или технически престой.",
  },
  {
    value: "SOLD",
    label: "Sold",
    description: "Вече не е във флота.",
  },
];

const EURO_CLASSES = [
  "Euro 6",
  "Euro 5",
  "Euro 4",
  "Euro 3",
  "Unknown",
];

const EMPTY_FORM_STATE: TruckFormState = {
  id: null,
  name: "",
  licensePlate: "",
  vin: "",
  status: "ACTIVE",
  euroClass: "Euro 6",
  defaultFuelConsumptionLPer100Km: "30",
  monthlyLeaseCost: "0",
  monthlyInsuranceCost: "0",
  monthlyRoadTaxCost: "0",
  monthlyOtherFixedCost: "0",
  notes: "",
};

export default function TruckManagement({
  initialTrucks,
}: TruckManagementProps) {
  const [trucks, setTrucks] = useState<TruckRow[]>([
    ...initialTrucks,
  ]);
  const [formState, setFormState] =
    useState<TruckFormState>(EMPTY_FORM_STATE);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);
  const [successMessage, setSuccessMessage] =
    useState<string | null>(null);

  const sortedTrucks = useMemo(
    () =>
      [...trucks].sort((firstTruck, secondTruck) =>
        `${firstTruck.name} ${firstTruck.licensePlate}`.localeCompare(
          `${secondTruck.name} ${secondTruck.licensePlate}`,
          "bg-BG",
        ),
      ),
    [trucks],
  );

  const totals = useMemo(
    () => ({
      all: trucks.length,
      active: trucks.filter(
        (truck) => truck.status === "ACTIVE",
      ).length,
      maintenance: trucks.filter(
        (truck) => truck.status === "MAINTENANCE",
      ).length,
      inactive: trucks.filter(
        (truck) => truck.status === "INACTIVE",
      ).length,
      monthlyFixedCost: trucks.reduce(
        (sum, truck) => sum + getMonthlyFixedCost(truck),
        0,
      ),
    }),
    [trucks],
  );

  const isEditing = formState.id !== null;

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    const name = formState.name.trim();
    const licensePlate = formState.licensePlate
      .trim()
      .toUpperCase();
    const euroClass = formState.euroClass.trim() || "Euro 6";
    const fuelConsumption =
      formState.defaultFuelConsumptionLPer100Km
        .trim()
        .replace(",", ".");

    if (!name) {
      setErrorMessage("Въведи име на камиона.");
      return;
    }

    if (!licensePlate) {
      setErrorMessage("Въведи регистрационен номер.");
      return;
    }

    if (
      !fuelConsumption ||
      !Number.isFinite(Number(fuelConsumption)) ||
      Number(fuelConsumption) < 0
    ) {
      setErrorMessage(
        "Въведи валиден разход гориво L/100 km.",
      );
      return;
    }

    const monthlyLeaseCost = normalizeMoneyForRequest(
      formState.monthlyLeaseCost,
    );
    const monthlyInsuranceCost = normalizeMoneyForRequest(
      formState.monthlyInsuranceCost,
    );
    const monthlyRoadTaxCost = normalizeMoneyForRequest(
      formState.monthlyRoadTaxCost,
    );
    const monthlyOtherFixedCost = normalizeMoneyForRequest(
      formState.monthlyOtherFixedCost,
    );

    if (
      monthlyLeaseCost === null ||
      monthlyInsuranceCost === null ||
      monthlyRoadTaxCost === null ||
      monthlyOtherFixedCost === null
    ) {
      setErrorMessage(
        "Всички постоянни разходи трябва да са положителни числа или 0.",
      );
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/trucks", {
        method: isEditing ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: formState.id,
          name,
          licensePlate,
          vin: formState.vin.trim() || null,
          status: formState.status,
          euroClass,
          defaultFuelConsumptionLPer100Km: fuelConsumption,
          monthlyLeaseCost,
          monthlyInsuranceCost,
          monthlyRoadTaxCost,
          monthlyOtherFixedCost,
          notes: formState.notes.trim() || null,
        }),
      });

      const responseData =
        (await response.json().catch(() => null)) as
          | TrucksApiResponse
          | null;

      if (!response.ok || !responseData?.truck) {
        throw new Error(
          responseData?.error ??
            "Камионът не можа да бъде записан.",
        );
      }

      setTrucks((currentTrucks) => {
        if (!isEditing) {
          return [...currentTrucks, responseData.truck!];
        }

        return currentTrucks.map((truck) =>
          truck.id === responseData.truck!.id
            ? responseData.truck!
            : truck,
        );
      });

      setFormState(EMPTY_FORM_STATE);
      setSuccessMessage(
        isEditing
          ? "Камионът е обновен."
          : "Новият камион е добавен.",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Камионът не можа да бъде записан.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleEdit(truck: TruckRow): void {
    setFormState({
      id: truck.id,
      name: truck.name,
      licensePlate: truck.licensePlate,
      vin: truck.vin ?? "",
      status: normalizeStatusForForm(truck.status),
      euroClass: truck.euroClass || "Euro 6",
      defaultFuelConsumptionLPer100Km: String(
        truck.defaultFuelConsumptionLPer100Km,
      ),
      monthlyLeaseCost: String(truck.monthlyLeaseCost),
      monthlyInsuranceCost: String(truck.monthlyInsuranceCost),
      monthlyRoadTaxCost: String(truck.monthlyRoadTaxCost),
      monthlyOtherFixedCost: String(truck.monthlyOtherFixedCost),
      notes: truck.notes ?? "",
    });
    setErrorMessage(null);
    setSuccessMessage(null);
  }

  function handleCancelEdit(): void {
    setFormState(EMPTY_FORM_STATE);
    setErrorMessage(null);
    setSuccessMessage(null);
  }

  const currentFormMonthlyTotal =
    (normalizeMoneyForRequest(formState.monthlyLeaseCost) ?? 0) +
    (normalizeMoneyForRequest(formState.monthlyInsuranceCost) ??
      0) +
    (normalizeMoneyForRequest(formState.monthlyRoadTaxCost) ??
      0) +
    (normalizeMoneyForRequest(formState.monthlyOtherFixedCost) ??
      0);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-400 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950">
              Управление на камиони
            </h2>

            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
              Тук се добавят и редактират камионите, които после
              се използват в Courses и Dashboard weekly reports.
              Регистрационният номер се записва в седмичния отчет
              като snapshot към момента на генериране.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard"
              className="inline-flex h-9 items-center justify-center rounded-md border border-slate-400 bg-white px-3 text-sm font-semibold text-slate-800 transition hover:border-slate-500 hover:bg-slate-100"
            >
              Към Dashboard
            </Link>

            <Link
              href="/courses"
              className="inline-flex h-9 items-center justify-center rounded-md border border-slate-400 bg-white px-3 text-sm font-semibold text-slate-800 transition hover:border-slate-500 hover:bg-slate-100"
            >
              Към Courses
            </Link>
          </div>
        </div>

        {(errorMessage || successMessage) && (
          <div className="mt-4">
            {errorMessage && (
              <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                {errorMessage}
              </p>
            )}

            {successMessage && (
              <p className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                {successMessage}
              </p>
            )}
          </div>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-5">
        <MetricCard label="Всички" value={String(totals.all)} />
        <MetricCard
          label="Active"
          value={String(totals.active)}
        />
        <MetricCard
          label="Maintenance"
          value={String(totals.maintenance)}
        />
        <MetricCard
          label="Inactive"
          value={String(totals.inactive)}
        />
        <MetricCard
          label="Месечни fixed costs"
          value={formatMoney(totals.monthlyFixedCost)}
        />
      </section>

      <section className="grid gap-6 2xl:grid-cols-[460px_1fr]">
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-400 bg-white p-4 shadow-sm"
        >
          <div>
            <h2 className="text-base font-bold text-slate-950">
              {isEditing ? "Редакция на камион" : "Нов камион"}
            </h2>

            <p className="mt-1 text-sm text-slate-600">
              Попълни основните данни и месечните постоянни
              разходи.
            </p>
          </div>

          <div className="mt-4 space-y-4">
            <label className="flex flex-col gap-1 text-sm font-semibold text-slate-800">
              Име
              <input
                type="text"
                value={formState.name}
                onChange={(event) =>
                  setFormState((currentState) => ({
                    ...currentState,
                    name: event.target.value,
                  }))
                }
                placeholder="Saleks 1"
                className="h-10 rounded-md border border-slate-400 bg-white px-3 text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm font-semibold text-slate-800">
              Регистрационен номер
              <input
                type="text"
                value={formState.licensePlate}
                onChange={(event) =>
                  setFormState((currentState) => ({
                    ...currentState,
                    licensePlate:
                      event.target.value.toUpperCase(),
                  }))
                }
                placeholder="04-BRS-7"
                className="h-10 rounded-md border border-slate-400 bg-white px-3 text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm font-semibold text-slate-800">
              VIN
              <input
                type="text"
                value={formState.vin}
                onChange={(event) =>
                  setFormState((currentState) => ({
                    ...currentState,
                    vin: event.target.value.toUpperCase(),
                  }))
                }
                placeholder="WMA..."
                className="h-10 rounded-md border border-slate-400 bg-white px-3 text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-1">
              <label className="flex flex-col gap-1 text-sm font-semibold text-slate-800">
                Статус
                <select
                  value={formState.status}
                  onChange={(event) =>
                    setFormState((currentState) => ({
                      ...currentState,
                      status:
                        event.target.value as TruckStatusValue,
                    }))
                  }
                  className="h-10 rounded-md border border-slate-400 bg-white px-3 text-slate-950 shadow-sm outline-none transition hover:border-slate-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                >
                  {TRUCK_STATUSES.map((status) => (
                    <option
                      key={status.value}
                      value={status.value}
                    >
                      {status.label}
                    </option>
                  ))}
                </select>

                <span className="text-xs font-normal text-slate-500">
                  {
                    TRUCK_STATUSES.find(
                      (status) =>
                        status.value === formState.status,
                    )?.description
                  }
                </span>
              </label>

              <label className="flex flex-col gap-1 text-sm font-semibold text-slate-800">
                Euro class
                <select
                  value={formState.euroClass}
                  onChange={(event) =>
                    setFormState((currentState) => ({
                      ...currentState,
                      euroClass: event.target.value,
                    }))
                  }
                  className="h-10 rounded-md border border-slate-400 bg-white px-3 text-slate-950 shadow-sm outline-none transition hover:border-slate-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                >
                  {EURO_CLASSES.map((euroClass) => (
                    <option
                      key={euroClass}
                      value={euroClass}
                    >
                      {euroClass}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="flex flex-col gap-1 text-sm font-semibold text-slate-800">
              Разход гориво по подразбиране
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    formState.defaultFuelConsumptionLPer100Km
                  }
                  onChange={(event) =>
                    setFormState((currentState) => ({
                      ...currentState,
                      defaultFuelConsumptionLPer100Km:
                        event.target.value,
                    }))
                  }
                  placeholder="Напр. 28"
                  className="h-10 w-full rounded-md border border-slate-400 bg-white px-3 pr-20 text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                />

                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-slate-500">
                  L/100 km
                </span>
              </div>
            </label>

            <div className="rounded-xl border border-slate-300 bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-slate-950">
                  Месечни постоянни разходи
                </h3>

                <span className="text-sm font-bold text-emerald-700">
                  {formatMoney(currentFormMonthlyTotal)}
                </span>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2 2xl:grid-cols-1">
                <MoneyInput
                  label="Лизинг / наем"
                  value={formState.monthlyLeaseCost}
                  onChange={(value) =>
                    setFormState((currentState) => ({
                      ...currentState,
                      monthlyLeaseCost: value,
                    }))
                  }
                />

                <MoneyInput
                  label="Застраховка"
                  value={formState.monthlyInsuranceCost}
                  onChange={(value) =>
                    setFormState((currentState) => ({
                      ...currentState,
                      monthlyInsuranceCost: value,
                    }))
                  }
                />

                <MoneyInput
                  label="Пътен данък"
                  value={formState.monthlyRoadTaxCost}
                  onChange={(value) =>
                    setFormState((currentState) => ({
                      ...currentState,
                      monthlyRoadTaxCost: value,
                    }))
                  }
                />

                <MoneyInput
                  label="Други fixed costs"
                  value={formState.monthlyOtherFixedCost}
                  onChange={(value) =>
                    setFormState((currentState) => ({
                      ...currentState,
                      monthlyOtherFixedCost: value,
                    }))
                  }
                />
              </div>

              <p className="mt-3 text-xs leading-5 text-slate-500">
                Тези стойности още не се разпределят върху курсове.
                Следващата задача ще ги свърже с profit
                calculation.
              </p>
            </div>

            <label className="flex flex-col gap-1 text-sm font-semibold text-slate-800">
              Бележки
              <textarea
                value={formState.notes}
                onChange={(event) =>
                  setFormState((currentState) => ({
                    ...currentState,
                    notes: event.target.value,
                  }))
                }
                rows={3}
                placeholder="Напр. Beequip lease, chassis notes, service notes..."
                className="rounded-md border border-slate-400 bg-white px-3 py-2 text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
              />
            </label>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex h-10 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving
                ? "Записва..."
                : isEditing
                  ? "Запази промени"
                  : "Добави камион"}
            </button>

            {isEditing && (
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={isSaving}
                className="inline-flex h-10 items-center justify-center rounded-md border border-slate-400 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Откажи
              </button>
            )}
          </div>
        </form>

        <section className="rounded-2xl border border-slate-400 bg-white shadow-sm">
          <div className="border-b border-slate-300 px-4 py-4">
            <h2 className="text-base font-bold text-slate-950">
              Камиони
            </h2>

            <p className="mt-1 text-sm text-slate-600">
              Списъкът се използва от Course Table и weekly
              Dashboard.
            </p>
          </div>

          {sortedTrucks.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm font-medium text-slate-700">
                Няма добавени камиони.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px] border-collapse text-left text-sm">
                <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="border-b border-slate-300 px-4 py-3">
                      Камион
                    </th>
                    <th className="border-b border-slate-300 px-4 py-3">
                      Рег. номер
                    </th>
                    <th className="border-b border-slate-300 px-4 py-3">
                      Статус
                    </th>
                    <th className="border-b border-slate-300 px-4 py-3">
                      Euro
                    </th>
                    <th className="border-b border-slate-300 px-4 py-3 text-right">
                      Гориво
                    </th>
                    <th className="border-b border-slate-300 px-4 py-3 text-right">
                      Fixed / месец
                    </th>
                    <th className="border-b border-slate-300 px-4 py-3 text-right">
                      Fixed / ден
                    </th>
                    <th className="border-b border-slate-300 px-4 py-3">
                      Обновен
                    </th>
                    <th className="border-b border-slate-300 px-4 py-3 text-right">
                      Действия
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {sortedTrucks.map((truck) => {
                    const monthlyFixedCost =
                      getMonthlyFixedCost(truck);

                    return (
                      <tr
                        key={truck.id}
                        className="hover:bg-slate-50"
                      >
                        <td className="border-b border-slate-200 px-4 py-3">
                          <div className="font-semibold text-slate-950">
                            {truck.name}
                          </div>

                          <div className="text-xs text-slate-500">
                            VIN: {truck.vin ?? "—"}
                          </div>

                          {truck.notes && (
                            <div className="mt-1 max-w-56 truncate text-xs text-slate-500">
                              {truck.notes}
                            </div>
                          )}
                        </td>

                        <td className="border-b border-slate-200 px-4 py-3 font-medium text-slate-900">
                          {truck.licensePlate}
                        </td>

                        <td className="border-b border-slate-200 px-4 py-3">
                          <TruckStatusBadge status={truck.status} />
                        </td>

                        <td className="border-b border-slate-200 px-4 py-3 text-slate-700">
                          {truck.euroClass}
                        </td>

                        <td className="border-b border-slate-200 px-4 py-3 text-right text-slate-700">
                          {truck.defaultFuelConsumptionLPer100Km.toFixed(
                            2,
                          )}{" "}
                          L/100 km
                        </td>

                        <td className="border-b border-slate-200 px-4 py-3 text-right font-semibold text-slate-900">
                          {formatMoney(monthlyFixedCost)}
                        </td>

                        <td className="border-b border-slate-200 px-4 py-3 text-right text-slate-700">
                          {formatMoney(monthlyFixedCost / 30)}
                        </td>

                        <td className="border-b border-slate-200 px-4 py-3 text-xs text-slate-600">
                          {formatDateTime(truck.updatedAt)}
                        </td>

                        <td className="border-b border-slate-200 px-4 py-3">
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => handleEdit(truck)}
                              className="inline-flex h-8 items-center justify-center rounded-md border border-slate-400 bg-white px-3 text-xs font-semibold text-slate-800 transition hover:border-slate-500 hover:bg-slate-100"
                            >
                              Редактирай
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>
    </div>
  );
}

function MoneyInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-semibold text-slate-800">
      {label}
      <div className="relative">
        <input
          type="number"
          min="0"
          step="0.01"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="0.00"
          className="h-10 w-full rounded-md border border-slate-400 bg-white px-3 pr-10 text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
        />

        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-slate-500">
          €
        </span>
      </div>
    </label>
  );
}

function TruckStatusBadge({ status }: { status: string }) {
  const normalizedStatus = normalizeStatusForForm(status);

  const className =
    normalizedStatus === "ACTIVE"
      ? "bg-emerald-100 text-emerald-800"
      : normalizedStatus === "MAINTENANCE"
        ? "bg-amber-100 text-amber-800"
        : normalizedStatus === "SOLD"
          ? "bg-slate-200 text-slate-700"
          : "bg-red-100 text-red-800";

  return (
    <span
      className={[
        "inline-flex rounded-full px-2 py-1 text-xs font-semibold",
        className,
      ].join(" ")}
    >
      {normalizedStatus}
    </span>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-400 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold text-slate-950">
        {value}
      </p>
    </div>
  );
}

function getMonthlyFixedCost(truck: TruckRow): number {
  return (
    truck.monthlyLeaseCost +
    truck.monthlyInsuranceCost +
    truck.monthlyRoadTaxCost +
    truck.monthlyOtherFixedCost
  );
}

function normalizeMoneyForRequest(value: string): number | null {
  const normalizedValue = value.trim().replace(",", ".");

  if (!normalizedValue) {
    return 0;
  }

  const parsedValue = Number(normalizedValue);

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    return null;
  }

  return Math.round((parsedValue + Number.EPSILON) * 100) / 100;
}

function normalizeStatusForForm(status: string): TruckStatusValue {
  if (
    status === "ACTIVE" ||
    status === "INACTIVE" ||
    status === "MAINTENANCE" ||
    status === "SOLD"
  ) {
    return status;
  }

  return "ACTIVE";
}

function formatMoney(value: number): string {
  return `€${value.toFixed(2)}`;
}

function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("bg-BG", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}