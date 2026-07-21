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
  status: string;
  defaultFuelConsumptionL100Km: number | null;
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
  status: TruckStatusValue;
  defaultFuelConsumptionL100Km: string;
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

const EMPTY_FORM_STATE: TruckFormState = {
  id: null,
  name: "",
  licensePlate: "",
  status: "ACTIVE",
  defaultFuelConsumptionL100Km: "",
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

    if (!name) {
      setErrorMessage("Въведи име на камиона.");
      return;
    }

    if (!licensePlate) {
      setErrorMessage("Въведи регистрационен номер.");
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
          status: formState.status,
          defaultFuelConsumptionL100Km:
            formState.defaultFuelConsumptionL100Km.trim() === ""
              ? null
              : formState.defaultFuelConsumptionL100Km
                  .trim()
                  .replace(",", "."),
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
      status: normalizeStatusForForm(truck.status),
      defaultFuelConsumptionL100Km:
        truck.defaultFuelConsumptionL100Km === null
          ? ""
          : String(truck.defaultFuelConsumptionL100Km),
    });
    setErrorMessage(null);
    setSuccessMessage(null);
  }

  function handleCancelEdit(): void {
    setFormState(EMPTY_FORM_STATE);
    setErrorMessage(null);
    setSuccessMessage(null);
  }

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

      <section className="grid gap-4 md:grid-cols-4">
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
      </section>

      <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-400 bg-white p-4 shadow-sm"
        >
          <div>
            <h2 className="text-base font-bold text-slate-950">
              {isEditing ? "Редакция на камион" : "Нов камион"}
            </h2>

            <p className="mt-1 text-sm text-slate-600">
              Попълни основните данни за камиона.
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
                    licensePlate: event.target.value.toUpperCase(),
                  }))
                }
                placeholder="04-BRS-7"
                className="h-10 rounded-md border border-slate-400 bg-white px-3 text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm font-semibold text-slate-800">
              Статус
              <select
                value={formState.status}
                onChange={(event) =>
                  setFormState((currentState) => ({
                    ...currentState,
                    status: event.target.value as TruckStatusValue,
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
                    (status) => status.value === formState.status,
                  )?.description
                }
              </span>
            </label>

            <label className="flex flex-col gap-1 text-sm font-semibold text-slate-800">
              Разход гориво по подразбиране
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formState.defaultFuelConsumptionL100Km}
                  onChange={(event) =>
                    setFormState((currentState) => ({
                      ...currentState,
                      defaultFuelConsumptionL100Km:
                        event.target.value,
                    }))
                  }
                  placeholder="Напр. 32.50"
                  className="h-10 w-full rounded-md border border-slate-400 bg-white px-3 pr-20 text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                />

                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-slate-500">
                  L/100 km
                </span>
              </div>

              <span className="text-xs font-normal text-slate-500">
                Ако в schema няма поле за разход на камион, тази
                стойност няма да се запише. Таблицата пак ще работи
                с име, номер и статус.
              </span>
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
              <table className="w-full min-w-[820px] border-collapse text-left text-sm">
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
                    <th className="border-b border-slate-300 px-4 py-3 text-right">
                      Разход
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
                  {sortedTrucks.map((truck) => (
                    <tr
                      key={truck.id}
                      className="hover:bg-slate-50"
                    >
                      <td className="border-b border-slate-200 px-4 py-3">
                        <div className="font-semibold text-slate-950">
                          {truck.name}
                        </div>

                        <div className="text-xs text-slate-500">
                          ID: {truck.id}
                        </div>
                      </td>

                      <td className="border-b border-slate-200 px-4 py-3 font-medium text-slate-900">
                        {truck.licensePlate}
                      </td>

                      <td className="border-b border-slate-200 px-4 py-3">
                        <TruckStatusBadge status={truck.status} />
                      </td>

                      <td className="border-b border-slate-200 px-4 py-3 text-right text-slate-700">
                        {truck.defaultFuelConsumptionL100Km === null
                          ? "—"
                          : `${truck.defaultFuelConsumptionL100Km.toFixed(
                              2,
                            )} L/100 km`}
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
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>
    </div>
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