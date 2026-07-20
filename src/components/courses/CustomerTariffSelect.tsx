"use client";

import type { CustomerTariffOption } from "./CustomerSelect";

type CustomerTariffSelectProps = {
  value: string;
  tariffs: readonly CustomerTariffOption[];
  hasCustomer: boolean;
  hasAutomaticTableTariff: boolean;
  rowNumber: number;
  onChange: (customerTariffId: string) => void;
};

export default function CustomerTariffSelect({
  value,
  tariffs,
  hasCustomer,
  hasAutomaticTableTariff,
  rowNumber,
  onChange,
}: CustomerTariffSelectProps) {
  const isDisabled = !hasCustomer || tariffs.length === 0;

  return (
    <select
      value={isDisabled ? "" : value}
      disabled={isDisabled}
      aria-label={`Тарифа, ред ${rowNumber}`}
      onChange={(event) => onChange(event.target.value)}
      className={[
        "h-10 w-full rounded border px-2 text-slate-900 outline-none transition",
        isDisabled
          ? "cursor-not-allowed border-slate-300 bg-slate-100 text-slate-500"
          : "border-transparent bg-transparent hover:border-slate-200 focus:border-slate-400 focus:bg-white",
      ].join(" ")}
    >
      {!hasCustomer ? (
        <option value="">Първо избери клиент</option>
      ) : tariffs.length === 0 && hasAutomaticTableTariff ? (
        <option value="">Автоматична тарифна таблица</option>
      ) : tariffs.length === 0 ? (
        <option value="">Няма тарифи за избор</option>
      ) : (
        <>
          <option value="">Избери тарифа</option>

          {tariffs.map((tariff) => (
            <option key={tariff.id} value={tariff.id}>
              {formatCustomerTariffOptionLabel(tariff)}
            </option>
          ))}
        </>
      )}
    </select>
  );
}

export function formatCustomerTariffOptionLabel(
  tariff: CustomerTariffOption,
): string {
  const priceLabel = getTariffPriceLabel(tariff);
  const rangeLabel = getTariffRangeLabel(tariff);
  const typeLabel = getTariffTypeLabel(tariff.type);

  return [tariff.name, typeLabel, rangeLabel, priceLabel]
    .filter(Boolean)
    .join(" — ");
}

function getTariffPriceLabel(
  tariff: CustomerTariffOption,
): string {
  if (tariff.type === "PRICE_PER_KM" && tariff.pricePerKm !== null) {
    return `${formatNumber(tariff.pricePerKm)} €/км`;
  }

  if (
    (tariff.type === "FIXED_PRICE" || tariff.type === "SHUNT") &&
    tariff.fixedPrice !== null
  ) {
    return `${formatMoney(tariff.fixedPrice)} €`;
  }

  if (tariff.type === "WAITING_TIME" && tariff.waitingHourlyRate !== null) {
    return `${formatMoney(tariff.waitingHourlyRate)} €/час`;
  }

  return "";
}

function getTariffRangeLabel(tariff: CustomerTariffOption): string {
  if (tariff.minKm === null && tariff.maxKm === null) {
    return "";
  }

  if (tariff.minKm !== null && tariff.maxKm !== null) {
    return `${formatNumber(tariff.minKm)}–${formatNumber(tariff.maxKm)} км`;
  }

  if (tariff.minKm !== null) {
    return `от ${formatNumber(tariff.minKm)} км`;
  }

  if (tariff.maxKm !== null) {
    return `до ${formatNumber(tariff.maxKm)} км`;
  }

  return "";
}

function getTariffTypeLabel(type: string): string {
  switch (type) {
    case "FIXED_TABLE_UPPER_BOUND":
      return "Таблица";

    case "DISTANCE_TABLE":
      return "Дистанционна таблица";

    case "PRICE_PER_KM":
      return "Цена / км";

    case "FIXED_PRICE":
      return "Фикс цена";

    case "SHUNT":
      return "Шунт";

    case "WAITING_TIME":
      return "Престой";

    case "MANUAL":
      return "Ръчно";

    default:
      return type;
  }
}

function formatMoney(value: number): string {
  return value.toFixed(2);
}

function formatNumber(value: number): string {
  if (Number.isInteger(value)) {
    return String(value);
  }

  return String(Math.round(value * 100) / 100);
}