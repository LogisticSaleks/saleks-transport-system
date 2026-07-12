"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import type { PricingStatus } from "@/lib/calculations/calculatePricingStatus";

import StatusBadge from "./StatusBadge";

type CourseDetailsPanelProps = {
  isOpen: boolean;
  panelId: string;
  rowNumber: number;

  truckLabel: string;
  customerLabel: string;
  courseTypeLabel: string;
  containerNumber: string;

  pickupAddressLabel: string;
  loadingUnloadingAddressLabel: string;
  extraAddressLabel: string;
  returnAddressLabel: string;

  totalKm: number | null;
  billableKm: number | null;
  nonBillableKm: number | null;

  price: number | null;
  waitingMinutes: number | null;
  revenue: number | null;

  fuelCost: number | null;
  tollCost: number | null;
  truckCost: number | null;
  waitingCost: number | null;
  portCost: number | null;
  otherCosts: number | null;
  totalCost: number | null;

  profit: number | null;
  profitMargin: number | null;
  status: PricingStatus | null;

  warnings: readonly string[];

  onClose: () => void;
};

type DetailItemProps = {
  label: string;
  value: string;
  fullWidth?: boolean;
};

export default function CourseDetailsPanel({
  isOpen,
  panelId,
  rowNumber,
  truckLabel,
  customerLabel,
  courseTypeLabel,
  containerNumber,
  pickupAddressLabel,
  loadingUnloadingAddressLabel,
  extraAddressLabel,
  returnAddressLabel,
  totalKm,
  billableKm,
  nonBillableKm,
  price,
  waitingMinutes,
  revenue,
  fuelCost,
  tollCost,
  truckCost,
  waitingCost,
  portCost,
  otherCosts,
  totalCost,
  profit,
  profitMargin,
  status,
  warnings,
  onClose,
}: CourseDetailsPanelProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isMounted || !isOpen) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Затвори детайлите за курса"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-slate-950/40 backdrop-blur-[1px]"
      />

      <aside
        id={panelId}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${panelId}-title`}
        className="absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-sm font-medium text-slate-500">
              Ред {rowNumber}
            </p>

            <h2
              id={`${panelId}-title`}
              className="mt-1 text-xl font-semibold text-slate-900"
            >
              Детайли за курса
            </h2>
          </div>

          <button
            type="button"
            aria-label="Затвори панела"
            title="Затвори"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white text-2xl leading-none text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            ×
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-6">
            <section className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Основна информация
                </h3>

                <StatusBadge status={status} />
              </div>

              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                <DetailItem
                  label="Камион"
                  value={displayText(truckLabel)}
                />

                <DetailItem
                  label="Клиент"
                  value={displayText(customerLabel)}
                />

                <DetailItem
                  label="Тип курс"
                  value={displayText(courseTypeLabel)}
                />

                <DetailItem
                  label="Контейнер"
                  value={displayText(containerNumber)}
                />
              </dl>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Маршрут
              </h3>

              <dl className="mt-4 grid gap-4">
                <DetailItem
                  label="Взимане"
                  value={displayText(pickupAddressLabel)}
                />

                <DetailItem
                  label="Товарене / разтоварване"
                  value={displayText(
                    loadingUnloadingAddressLabel,
                  )}
                />

                <DetailItem
                  label="Екстра адрес"
                  value={displayText(extraAddressLabel)}
                />

                <DetailItem
                  label="Връщане"
                  value={displayText(returnAddressLabel)}
                />
              </dl>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Kilometer breakdown
              </h3>

              <dl className="mt-4 grid gap-4 sm:grid-cols-3">
                <DetailItem
                  label="Total KM"
                  value={formatKm(totalKm)}
                />

                <DetailItem
                  label="Billable KM"
                  value={formatKm(billableKm)}
                />

                <DetailItem
                  label="Non-billable KM"
                  value={formatKm(nonBillableKm)}
                />
              </dl>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Приходи и престой
              </h3>

              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                <DetailItem
                  label="Цена на курса"
                  value={formatMoney(price)}
                />

                <DetailItem
                  label="Престой"
                  value={formatMinutes(waitingMinutes)}
                />

                <DetailItem
                  label="Общ приход"
                  value={formatMoney(revenue)}
                />
              </dl>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Cost breakdown
              </h3>

              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                <DetailItem
                  label="Fuel"
                  value={formatMoney(fuelCost)}
                />

                <DetailItem
                  label="Toll"
                  value={formatMoney(tollCost)}
                />

                <DetailItem
                  label="Truck cost"
                  value={formatMoney(truckCost)}
                />

                <DetailItem
                  label="Waiting"
                  value={formatMoney(waitingCost)}
                />

                <DetailItem
                  label="Port fee"
                  value={formatMoney(portCost)}
                />

                <DetailItem
                  label="Other costs"
                  value={formatMoney(otherCosts)}
                />

                <DetailItem
                  label="Total cost"
                  value={formatMoney(totalCost)}
                  fullWidth
                />
              </dl>

              <p className="mt-4 rounded-md bg-sky-50 px-3 py-2 text-xs leading-5 text-sky-700">
                Waiting в момента е начисление към клиента и
                участва в общия приход. То не се добавя към
                Total cost.
              </p>
            </section>

            <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Резултат
              </h3>

              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                <DetailItem
                  label="Печалба"
                  value={formatMoney(profit)}
                />

                <DetailItem
                  label="Марж"
                  value={formatPercent(profitMargin)}
                />
              </dl>
            </section>

            {warnings.length > 0 && (
              <section className="rounded-lg border border-sky-200 bg-sky-50 p-4">
                <h3 className="text-sm font-semibold text-sky-800">
                  Необходима проверка
                </h3>

                <ul className="mt-3 space-y-2 text-sm text-sky-700">
                  {warnings.map((warning, index) => (
                    <li
                      key={`${warning}-${index}`}
                      className="flex gap-2"
                    >
                      <span aria-hidden="true">•</span>
                      <span>{warning}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>

        <footer className="border-t border-slate-200 bg-white px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-full items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 sm:w-auto"
          >
            Затвори
          </button>
        </footer>
      </aside>
    </div>,
    document.body,
  );
}

function DetailItem({
  label,
  value,
  fullWidth = false,
}: DetailItemProps) {
  return (
    <div
      className={
        fullWidth
          ? "rounded-md border border-slate-200 bg-slate-50 p-3 sm:col-span-2"
          : ""
      }
    >
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </dt>

      <dd
        className={[
          "mt-1 break-words text-sm font-medium",
          fullWidth
            ? "text-base font-semibold text-slate-950"
            : "text-slate-900",
        ].join(" ")}
      >
        {value}
      </dd>
    </div>
  );
}

function displayText(value: string): string {
  return value.trim() === "" ? "—" : value;
}

function formatMoney(value: number | null): string {
  if (value === null) {
    return "—";
  }

  return `€${value.toFixed(2)}`;
}

function formatKm(value: number | null): string {
  if (value === null) {
    return "—";
  }

  return `${value.toFixed(1)} km`;
}

function formatMinutes(value: number | null): string {
  if (value === null) {
    return "—";
  }

  return `${value} мин.`;
}

function formatPercent(value: number | null): string {
  if (value === null) {
    return "—";
  }

  return `${value.toFixed(2)}%`;
}