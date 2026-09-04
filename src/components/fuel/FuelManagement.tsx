"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { useCan } from "@/components/auth/AuthContext";

export type FuelTruckOption = {
  id: string;
  name: string;
  licensePlate: string;
  status: string;
};

export type FuelEntryRow = {
  id: string;
  truckId: string;
  truckName: string;
  truckLicensePlate: string;
  truckStatus: string;
  entryDate: string;
  odometerKm: number;
  distanceKm: number | null;
  dieselLiters: number;
  dieselTotalAmount: number;
  dieselPricePerLiter: number | null;
  adBlueLiters: number;
  adBlueTotalAmount: number;
  adBluePricePerLiter: number | null;
  consumptionLPer100Km: number | null;
  stationName: string | null;
  location: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

type FuelSummary = {
  entryCount: number;
  dieselLiters: number;
  dieselTotalAmount: number;
  dieselAveragePricePerLiter: number | null;
  adBlueLiters: number;
  adBlueTotalAmount: number;
  adBlueAveragePricePerLiter: number | null;
  distanceKm: number;
  averageConsumptionLPer100Km: number | null;
};

type FuelApiResponse = {
  entries?: FuelEntryRow[];
  entry?: FuelEntryRow;
  summary?: FuelSummary;
  error?: string;
};

type TrucksApiResponse = {
  truck?: {
    id: string;
    name: string;
    licensePlate: string;
    status: string;
  };
  error?: string;
};

type FuelEntryFormState = {
  truckId: string;
  entryDate: string;
  odometerKm: string;
  dieselLiters: string;
  dieselTotalAmount: string;
  adBlueLiters: string;
  adBlueTotalAmount: string;
  stationName: string;
  location: string;
  notes: string;
};

type TruckFormState = {
  name: string;
  licensePlate: string;
  vin: string;
  euroClass: string;
  defaultFuelConsumptionLPer100Km: string;
  notes: string;
};

type FuelManagementProps = {
  initialTrucks: readonly FuelTruckOption[];
  initialFromDate: string;
  initialToDate: string;
};

const EMPTY_SUMMARY: FuelSummary = {
  entryCount: 0,
  dieselLiters: 0,
  dieselTotalAmount: 0,
  dieselAveragePricePerLiter: null,
  adBlueLiters: 0,
  adBlueTotalAmount: 0,
  adBlueAveragePricePerLiter: null,
  distanceKm: 0,
  averageConsumptionLPer100Km: null,
};

const EMPTY_TRUCK_FORM_STATE: TruckFormState = {
  name: "",
  licensePlate: "",
  vin: "",
  euroClass: "Euro 6",
  defaultFuelConsumptionLPer100Km: "30",
  notes: "",
};

export default function FuelManagement({
  initialTrucks,
  initialFromDate,
  initialToDate,
}: FuelManagementProps) {
  const canWriteFuel = useCan("fuel:write");
  const canWriteTrucks = useCan("trucks:write");

  const [trucks, setTrucks] = useState<FuelTruckOption[]>([
    ...initialTrucks,
  ]);
  const [selectedTruckId, setSelectedTruckId] = useState("ALL");
  const [fromDate, setFromDate] = useState(initialFromDate);
  const [toDate, setToDate] = useState(initialToDate);
  const [entries, setEntries] = useState<FuelEntryRow[]>([]);
  const [summary, setSummary] = useState<FuelSummary>(EMPTY_SUMMARY);
  const [entryForm, setEntryForm] = useState<FuelEntryFormState>(() =>
    createEmptyFuelEntryForm(initialTrucks[0]?.id ?? ""),
  );
  const [truckForm, setTruckForm] =
    useState<TruckFormState>(EMPTY_TRUCK_FORM_STATE);
  const [isLoadingEntries, setIsLoadingEntries] = useState(false);
  const [isSavingEntry, setIsSavingEntry] = useState(false);
  const [isSavingTruck, setIsSavingTruck] = useState(false);
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(
    null,
  );
  const [editingEntryId, setEditingEntryId] = useState<string | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(
    null,
  );

  useEffect(() => {
    void handleLoadEntries();
  }, []);

  const sortedTrucks = useMemo(
    () =>
      [...trucks].sort((firstTruck, secondTruck) =>
        formatTruckLabel(firstTruck).localeCompare(
          formatTruckLabel(secondTruck),
          "bg-BG",
        ),
      ),
    [trucks],
  );

  const selectedTruck = useMemo(
    () =>
      selectedTruckId === "ALL"
        ? null
        : sortedTrucks.find((truck) => truck.id === selectedTruckId) ??
          null,
    [selectedTruckId, sortedTrucks],
  );

  const isEditingEntry = editingEntryId !== null;

  const dieselPricePreview = calculateUnitPriceFromStrings(
    entryForm.dieselTotalAmount,
    entryForm.dieselLiters,
  );

  const adBluePricePreview = calculateUnitPriceFromStrings(
    entryForm.adBlueTotalAmount,
    entryForm.adBlueLiters,
  );

  async function handleLoadEntries(): Promise<void> {
    setIsLoadingEntries(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const params = new URLSearchParams();

      if (selectedTruckId !== "ALL") {
        params.set("truckId", selectedTruckId);
      }

      if (fromDate) {
        params.set("fromDate", fromDate);
      }

      if (toDate) {
        params.set("toDate", toDate);
      }

      const response = await fetch("/api/fuel?" + params.toString(), {
        cache: "no-store",
      });

      const responseData =
        (await response.json().catch(() => null)) as
          | FuelApiResponse
          | null;

      if (!response.ok) {
        throw new Error(
          responseData?.error ??
            "Fuel записите не можаха да бъдат заредени.",
        );
      }

      setEntries(responseData?.entries ?? []);
      setSummary(responseData?.summary ?? EMPTY_SUMMARY);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Fuel записите не можаха да бъдат заредени.",
      );
    } finally {
      setIsLoadingEntries(false);
    }
  }

  async function handleAddFuelEntry(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (!canWriteFuel) {
      setErrorMessage("Твоята роля няма право да добавя fuel записи.");
      setSuccessMessage(null);
      return;
    }

    if (!entryForm.truckId) {
      setErrorMessage("Избери камион за зареждането.");
      return;
    }

    setIsSavingEntry(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/fuel", {
        method: isEditingEntry ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: editingEntryId,
          truckId: entryForm.truckId,
          entryDate: entryForm.entryDate,
          odometerKm: normalizeDecimalInput(entryForm.odometerKm),
          dieselLiters: normalizeDecimalInput(entryForm.dieselLiters),
          dieselTotalAmount: normalizeDecimalInput(
            entryForm.dieselTotalAmount,
          ),
          adBlueLiters: normalizeDecimalInput(entryForm.adBlueLiters),
          adBlueTotalAmount: normalizeDecimalInput(
            entryForm.adBlueTotalAmount,
          ),
          stationName: entryForm.stationName.trim() || null,
          location: entryForm.location.trim() || null,
          notes: entryForm.notes.trim() || null,
        }),
      });

      const responseData =
        (await response.json().catch(() => null)) as
          | FuelApiResponse
          | null;

      if (!response.ok || !responseData?.entry) {
        throw new Error(
          responseData?.error ??
            (isEditingEntry
              ? "Fuel записът не можа да бъде обновен."
              : "Fuel записът не можа да бъде добавен."),
        );
      }

      setEntryForm(
        createEmptyFuelEntryForm(entryForm.truckId),
      );
      setEditingEntryId(null);

      await handleLoadEntries();

      setSuccessMessage(
        isEditingEntry
          ? "Fuel записът е обновен."
          : "Fuel записът е добавен.",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Fuel записът не можа да бъде добавен.",
      );
    } finally {
      setIsSavingEntry(false);
    }
  }

  async function handleAddTruck(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (!canWriteTrucks) {
      setErrorMessage("Твоята роля няма право да добавя камиони.");
      setSuccessMessage(null);
      return;
    }

    const name = truckForm.name.trim();
    const licensePlate = truckForm.licensePlate.trim().toUpperCase();

    if (!name) {
      setErrorMessage("Въведи име на камиона.");
      return;
    }

    if (!licensePlate) {
      setErrorMessage("Въведи регистрационен номер.");
      return;
    }

    setIsSavingTruck(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/trucks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          licensePlate,
          vin: truckForm.vin.trim() || null,
          status: "ACTIVE",
          euroClass: truckForm.euroClass.trim() || "Euro 6",
          defaultFuelConsumptionLPer100Km:
            normalizeDecimalInput(
              truckForm.defaultFuelConsumptionLPer100Km,
            ) || "30",
          monthlyLeaseCost: 0,
          monthlyInsuranceCost: 0,
          monthlyRoadTaxCost: 0,
          monthlyOtherFixedCost: 0,
          notes: truckForm.notes.trim() || null,
        }),
      });

      const responseData =
        (await response.json().catch(() => null)) as
          | TrucksApiResponse
          | null;

      if (!response.ok || !responseData?.truck) {
        throw new Error(
          responseData?.error ?? "Камионът не можа да бъде добавен.",
        );
      }

      const createdTruck = {
        id: responseData.truck.id,
        name: responseData.truck.name,
        licensePlate: responseData.truck.licensePlate,
        status: responseData.truck.status,
      };

      setTrucks((currentTrucks) => [...currentTrucks, createdTruck]);
      setSelectedTruckId(createdTruck.id);
      setEntryForm((currentForm) => ({
        ...currentForm,
        truckId: createdTruck.id,
      }));
      setTruckForm(EMPTY_TRUCK_FORM_STATE);
      setSuccessMessage(
        "Камионът е добавен и вече може да се използва във Fuel.",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Камионът не можа да бъде добавен.",
      );
    } finally {
      setIsSavingTruck(false);
    }
  }

  function handleEditEntry(entry: FuelEntryRow): void {
    if (!canWriteFuel) {
      setErrorMessage("Твоята роля няма право да редактира fuel записи.");
      setSuccessMessage(null);
      return;
    }

    setEditingEntryId(entry.id);
    setEntryForm({
      truckId: entry.truckId,
      entryDate: formatDateInputValue(new Date(entry.entryDate)),
      odometerKm: formatNumber(entry.odometerKm),
      dieselLiters: formatNumber(entry.dieselLiters),
      dieselTotalAmount: formatNumber(entry.dieselTotalAmount),
      adBlueLiters: formatNumber(entry.adBlueLiters),
      adBlueTotalAmount: formatNumber(entry.adBlueTotalAmount),
      stationName: entry.stationName ?? "",
      location: entry.location ?? "",
      notes: entry.notes ?? "",
    });
    setErrorMessage(null);
    setSuccessMessage(null);
  }

  function handleCancelEntryEdit(): void {
    setEditingEntryId(null);
    setEntryForm(
      createEmptyFuelEntryForm(entryForm.truckId),
    );
    setErrorMessage(null);
    setSuccessMessage(null);
  }

  async function handleDeleteEntry(entry: FuelEntryRow): Promise<void> {
    if (!canWriteFuel) {
      setErrorMessage("Твоята роля няма право да изтрива fuel записи.");
      setSuccessMessage(null);
      return;
    }

    const confirmed = window.confirm(
      "Сигурен ли си, че искаш да изтриеш този fuel запис?",
    );

    if (!confirmed) {
      return;
    }

    setDeletingEntryId(entry.id);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/fuel", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: entry.id,
        }),
      });

      const responseData =
        (await response.json().catch(() => null)) as
          | FuelApiResponse
          | null;

      if (!response.ok) {
        throw new Error(
          responseData?.error ??
            "Fuel записът не можа да бъде изтрит.",
        );
      }

      await handleLoadEntries();

      setSuccessMessage("Fuel записът е изтрит.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Fuel записът не можа да бъде изтрит.",
      );
    } finally {
      setDeletingEntryId(null);
    }
  }

  return (
    <div className="space-y-6">
      {(errorMessage || successMessage) && (
        <section>
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
        </section>
      )}

      <section className="rounded-2xl border border-slate-400 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_1fr_auto] md:items-end">
          <label className="flex flex-col gap-1 text-sm font-semibold text-slate-800">
            Камион
            <select
              value={selectedTruckId}
              onChange={(event) => setSelectedTruckId(event.target.value)}
              className="h-10 rounded-md border border-slate-400 bg-white px-3 text-slate-950 shadow-sm outline-none transition hover:border-slate-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
            >
              <option value="ALL">Всички камиони</option>

              {sortedTrucks.map((truck) => (
                <option key={truck.id} value={truck.id}>
                  {formatTruckLabel(truck)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm font-semibold text-slate-800">
            От дата
            <input
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              className="h-10 rounded-md border border-slate-400 bg-white px-3 text-slate-950 shadow-sm outline-none transition hover:border-slate-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-semibold text-slate-800">
            До дата
            <input
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              className="h-10 rounded-md border border-slate-400 bg-white px-3 text-slate-950 shadow-sm outline-none transition hover:border-slate-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
            />
          </label>

          <button
            type="button"
            onClick={() => void handleLoadEntries()}
            disabled={isLoadingEntries}
            className="inline-flex h-10 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Филтрирай
          </button>
        </div>

        {selectedTruck && (
          <p className="mt-3 text-sm text-slate-600">
            Активен филтър:{" "}
            <strong className="text-slate-950">
              {formatTruckLabel(selectedTruck)}
            </strong>
          </p>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Fuel записи"
          value={String(summary.entryCount)}
        />
        <MetricCard
          label="Дизел"
          value={formatLiters(summary.dieselLiters)}
          description={formatMoney(summary.dieselTotalAmount)}
        />
        <MetricCard
          label="Средна дизел цена/L"
          value={formatNullableMoney(summary.dieselAveragePricePerLiter)}
        />
        <MetricCard
          label="Среден разход"
          value={formatNullableConsumption(
            summary.averageConsumptionLPer100Km,
          )}
          description={formatKilometers(summary.distanceKm)}
        />
        <MetricCard
          label="AdBlue"
          value={formatLiters(summary.adBlueLiters)}
          description={formatMoney(summary.adBlueTotalAmount)}
        />
        <MetricCard
          label="Средна AdBlue цена/L"
          value={formatNullableMoney(summary.adBlueAveragePricePerLiter)}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <div className="space-y-6">
          <form
            onSubmit={handleAddFuelEntry}
            className="rounded-2xl border border-slate-400 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-bold text-slate-950">
                {isEditingEntry
                  ? "Редакция на зареждане"
                  : "Добави зареждане"}
              </h2>

              {isEditingEntry && (
                <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700">
                  Edit mode
                </span>
              )}
            </div>

            {!canWriteFuel && (
              <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
                Твоята роля може да преглежда Fuel, но не може да
                добавя или изтрива fuel записи.
              </p>
            )}

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm font-semibold text-slate-800 md:col-span-2">
                Камион
                <select
                  value={entryForm.truckId}
                  onChange={(event) =>
                    setEntryForm((currentForm) => ({
                      ...currentForm,
                      truckId: event.target.value,
                    }))
                  }
                  disabled={!canWriteFuel || sortedTrucks.length === 0}
                  className="h-10 rounded-md border border-slate-400 bg-white px-3 text-slate-950 shadow-sm outline-none transition hover:border-slate-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                >
                  {sortedTrucks.length === 0 ? (
                    <option value="">Няма камиони</option>
                  ) : (
                    sortedTrucks.map((truck) => (
                      <option key={truck.id} value={truck.id}>
                        {formatTruckLabel(truck)}
                      </option>
                    ))
                  )}
                </select>
              </label>

              <FuelInput
                label="Дата"
                type="date"
                value={entryForm.entryDate}
                disabled={!canWriteFuel}
                onChange={(value) =>
                  setEntryForm((currentForm) => ({
                    ...currentForm,
                    entryDate: value,
                  }))
                }
              />

              <FuelInput
                label="Километри на таблото"
                value={entryForm.odometerKm}
                placeholder="222897"
                disabled={!canWriteFuel}
                onChange={(value) =>
                  setEntryForm((currentForm) => ({
                    ...currentForm,
                    odometerKm: value,
                  }))
                }
              />

              <FuelInput
                label="Дизел литри"
                value={entryForm.dieselLiters}
                placeholder="630.03"
                disabled={!canWriteFuel}
                onChange={(value) =>
                  setEntryForm((currentForm) => ({
                    ...currentForm,
                    dieselLiters: value,
                  }))
                }
              />

              <FuelInput
                label="Дизел общо €"
                value={entryForm.dieselTotalAmount}
                placeholder="1362.75"
                disabled={!canWriteFuel}
                onChange={(value) =>
                  setEntryForm((currentForm) => ({
                    ...currentForm,
                    dieselTotalAmount: value,
                  }))
                }
              />

              <FuelInput
                label="AdBlue литри"
                value={entryForm.adBlueLiters}
                placeholder="0"
                disabled={!canWriteFuel}
                onChange={(value) =>
                  setEntryForm((currentForm) => ({
                    ...currentForm,
                    adBlueLiters: value,
                  }))
                }
              />

              <FuelInput
                label="AdBlue общо €"
                value={entryForm.adBlueTotalAmount}
                placeholder="0"
                disabled={!canWriteFuel}
                onChange={(value) =>
                  setEntryForm((currentForm) => ({
                    ...currentForm,
                    adBlueTotalAmount: value,
                  }))
                }
              />

              <FuelInput
                label="Бензиностанция"
                value={entryForm.stationName}
                placeholder="Q8, Shell, IDS..."
                disabled={!canWriteFuel}
                onChange={(value) =>
                  setEntryForm((currentForm) => ({
                    ...currentForm,
                    stationName: value,
                  }))
                }
              />

              <FuelInput
                label="Място"
                value={entryForm.location}
                placeholder="Hoogstraten, Rotterdam..."
                disabled={!canWriteFuel}
                onChange={(value) =>
                  setEntryForm((currentForm) => ({
                    ...currentForm,
                    location: value,
                  }))
                }
              />

              <label className="flex flex-col gap-1 text-sm font-semibold text-slate-800 md:col-span-2">
                Бележка
                <textarea
                  value={entryForm.notes}
                  onChange={(event) =>
                    setEntryForm((currentForm) => ({
                      ...currentForm,
                      notes: event.target.value,
                    }))
                  }
                  disabled={!canWriteFuel}
                  rows={3}
                  className="rounded-md border border-slate-400 bg-white px-3 py-2 text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                />
              </label>
            </div>

            <div className="mt-4 rounded-lg border border-slate-300 bg-slate-50 p-3 text-sm text-slate-700">
              <div>
                Дизел €/L:{" "}
                <strong className="text-slate-950">
                  {formatNullableMoney(dieselPricePreview)}
                </strong>
              </div>

              <div className="mt-1">
                AdBlue €/L:{" "}
                <strong className="text-slate-950">
                  {formatNullableMoney(adBluePricePreview)}
                </strong>
              </div>
            </div>

            <button
              type="submit"
              disabled={
                !canWriteFuel ||
                isSavingEntry ||
                sortedTrucks.length === 0
              }
              className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSavingEntry
                ? "Записва..."
                : isEditingEntry
                  ? "Запази промените"
                  : "Добави зареждане"}
            </button>

            {isEditingEntry && (
              <button
                type="button"
                onClick={handleCancelEntryEdit}
                disabled={isSavingEntry}
                className="mt-2 inline-flex h-10 w-full items-center justify-center rounded-md border border-slate-400 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Откажи редакцията
              </button>
            )}
          </form>

          <form
            onSubmit={handleAddTruck}
            className="rounded-2xl border border-slate-400 bg-white p-4 shadow-sm"
          >
            <h2 className="text-base font-bold text-slate-950">
              Добави камион във Fuel
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-600">
              Камионът се добавя в общата Trucks база и после ще се
              вижда и в Trucks страницата.
            </p>

            {!canWriteTrucks && (
              <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
                Твоята роля няма право да добавя камиони.
              </p>
            )}

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <FuelInput
                label="Име"
                value={truckForm.name}
                placeholder="Saleks 1"
                disabled={!canWriteTrucks}
                onChange={(value) =>
                  setTruckForm((currentForm) => ({
                    ...currentForm,
                    name: value,
                  }))
                }
              />

              <FuelInput
                label="Регистрационен номер"
                value={truckForm.licensePlate}
                placeholder="04-BRS-7"
                disabled={!canWriteTrucks}
                onChange={(value) =>
                  setTruckForm((currentForm) => ({
                    ...currentForm,
                    licensePlate: value.toUpperCase(),
                  }))
                }
              />

              <FuelInput
                label="VIN"
                value={truckForm.vin}
                placeholder="WMA..."
                disabled={!canWriteTrucks}
                onChange={(value) =>
                  setTruckForm((currentForm) => ({
                    ...currentForm,
                    vin: value.toUpperCase(),
                  }))
                }
              />

              <FuelInput
                label="Euro class"
                value={truckForm.euroClass}
                placeholder="Euro 6"
                disabled={!canWriteTrucks}
                onChange={(value) =>
                  setTruckForm((currentForm) => ({
                    ...currentForm,
                    euroClass: value,
                  }))
                }
              />

              <FuelInput
                label="Разход по подразбиране L/100"
                value={truckForm.defaultFuelConsumptionLPer100Km}
                placeholder="30"
                disabled={!canWriteTrucks}
                onChange={(value) =>
                  setTruckForm((currentForm) => ({
                    ...currentForm,
                    defaultFuelConsumptionLPer100Km: value,
                  }))
                }
              />

              <FuelInput
                label="Бележка"
                value={truckForm.notes}
                placeholder="По желание"
                disabled={!canWriteTrucks}
                onChange={(value) =>
                  setTruckForm((currentForm) => ({
                    ...currentForm,
                    notes: value,
                  }))
                }
              />
            </div>

            <button
              type="submit"
              disabled={!canWriteTrucks || isSavingTruck}
              className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-md border border-sky-300 bg-sky-50 px-4 text-sm font-semibold text-sky-800 shadow-sm transition hover:border-sky-400 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSavingTruck ? "Записва..." : "Добави камион"}
            </button>
          </form>
        </div>

        <section className="min-w-0 rounded-2xl border border-slate-400 bg-white shadow-sm">
          <div className="border-b border-slate-300 px-4 py-4">
            <h2 className="text-base font-bold text-slate-950">
              Зареждания
            </h2>

            <p className="mt-1 text-sm text-slate-600">
              По подразбиране се показва цялата история. Използвай
              датите само когато ти трябва конкретен период.
            </p>
          </div>

          {entries.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm font-medium text-slate-700">
                Няма fuel записи за избрания филтър.
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Добави първо зареждане или промени филтрите.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] border-collapse text-left text-sm">
                <thead className="bg-slate-100 uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="border-b border-slate-300 px-2 py-2">
                      Дата
                    </th>
                    <th className="border-b border-slate-300 px-2 py-2">
                      Камион
                    </th>
                    <th className="border-b border-slate-300 px-2 py-2 text-right">
                      Километри
                    </th>
                    <th className="border-b border-slate-300 px-2 py-2 text-right">
                      Дизел
                    </th>
                    <th className="border-b border-slate-300 px-2 py-2 text-right">
                      AdBlue
                    </th>
                    <th className="border-b border-slate-300 px-2 py-2 text-right">
                      Разход
                    </th>
                    <th className="border-b border-slate-300 px-2 py-2">
                      Място / бележка
                    </th>
                    <th className="border-b border-slate-300 px-2 py-2 text-right">
                      Действия
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50">
                      <td className="border-b border-slate-200 px-2 py-2 text-slate-700">
                        {formatDate(entry.entryDate)}
                      </td>

                      <td className="border-b border-slate-200 px-2 py-2">
                        <div className="font-semibold text-slate-950">
                          {entry.truckName}
                        </div>
                        <div className="text-xs text-slate-500">
                          {entry.truckLicensePlate}
                        </div>
                      </td>

                      <td className="border-b border-slate-200 px-2 py-2 text-right text-slate-700">
                        <div className="font-semibold text-slate-950">
                          {formatKilometers(entry.odometerKm)}
                        </div>
                        <div className="text-xs text-slate-500">
                          Изминати:{" "}
                          {formatNullableKilometers(entry.distanceKm)}
                        </div>
                      </td>

                      <td className="border-b border-slate-200 px-2 py-2 text-right text-slate-700">
                        <div>{formatLiters(entry.dieselLiters)}</div>
                        <div className="text-xs text-slate-500">
                          {formatNullableMoney(entry.dieselPricePerLiter)}
                          /L
                        </div>
                        <div className="font-semibold text-slate-950">
                          {formatMoney(entry.dieselTotalAmount)}
                        </div>
                      </td>

                      <td className="border-b border-slate-200 px-2 py-2 text-right text-slate-700">
                        <div>{formatLiters(entry.adBlueLiters)}</div>
                        <div className="text-xs text-slate-500">
                          {formatNullableMoney(entry.adBluePricePerLiter)}
                          /L
                        </div>
                        <div>{formatMoney(entry.adBlueTotalAmount)}</div>
                      </td>

                      <td className="border-b border-slate-200 px-2 py-2 text-right font-semibold text-slate-950">
                        {formatNullableConsumption(
                          entry.consumptionLPer100Km,
                        )}
                      </td>

                      <td className="max-w-56 border-b border-slate-200 px-2 py-2 text-slate-700">
                        <div className="font-medium text-slate-900">
                          {entry.stationName ?? "—"}
                        </div>
                        {entry.location && (
                          <div className="text-xs text-slate-500">
                            {entry.location}
                          </div>
                        )}
                        {entry.notes && (
                          <div className="mt-1 line-clamp-2 text-xs text-slate-500">
                            {entry.notes}
                          </div>
                        )}
                      </td>

                      <td className="border-b border-slate-200 px-2 py-2 text-right">
                        {canWriteFuel ? (
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleEditEntry(entry)}
                              disabled={isSavingEntry || deletingEntryId === entry.id}
                              className="inline-flex h-8 items-center justify-center rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => void handleDeleteEntry(entry)}
                              disabled={deletingEntryId === entry.id}
                              className="inline-flex h-8 items-center justify-center rounded-md border border-red-300 bg-red-50 px-2 text-xs font-semibold text-red-700 transition hover:border-red-400 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {deletingEntryId === entry.id
                                ? "..."
                                : "Изтрий"}
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
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

function FuelInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "date";
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-semibold text-slate-800">
      {label}
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-md border border-slate-400 bg-white px-3 text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
      />
    </label>
  );
}

function MetricCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-400 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-slate-950">
        {value}
      </p>
      {description && (
        <p className="mt-1 text-sm font-medium text-slate-500">
          {description}
        </p>
      )}
    </div>
  );
}

function createEmptyFuelEntryForm(truckId: string): FuelEntryFormState {
  return {
    truckId,
    entryDate: formatDateInputValue(new Date()),
    odometerKm: "",
    dieselLiters: "",
    dieselTotalAmount: "",
    adBlueLiters: "0",
    adBlueTotalAmount: "0",
    stationName: "",
    location: "",
    notes: "",
  };
}

function formatTruckLabel(truck: FuelTruckOption): string {
  return truck.name + " / " + truck.licensePlate;
}

function normalizeDecimalInput(value: string): string {
  return value.trim().replace(",", ".");
}

function calculateUnitPriceFromStrings(
  totalAmountValue: string,
  litersValue: string,
): number | null {
  const totalAmount = Number(normalizeDecimalInput(totalAmountValue));
  const liters = Number(normalizeDecimalInput(litersValue));

  if (
    !Number.isFinite(totalAmount) ||
    !Number.isFinite(liters) ||
    liters <= 0
  ) {
    return null;
  }

  return roundMoney(totalAmount / liters);
}

function formatMoney(value: number): string {
  return "€" + value.toFixed(2);
}

function formatNullableMoney(value: number | null): string {
  return value === null ? "—" : formatMoney(value);
}

function formatLiters(value: number): string {
  return formatNumber(value) + " L";
}

function formatKilometers(value: number): string {
  return formatNumber(value) + " km";
}

function formatNullableKilometers(value: number | null): string {
  return value === null ? "—" : formatKilometers(value);
}

function formatNullableConsumption(value: number | null): string {
  return value === null ? "—" : formatNumber(value) + " L/100";
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return "0";
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("bg-BG", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return year + "-" + month + "-" + day;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
