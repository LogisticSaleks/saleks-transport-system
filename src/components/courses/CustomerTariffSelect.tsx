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
  const selectedTariff = tariffs.find(
    (tariff) => tariff.id === value,
  );

  return (
    <div className="space-y-1">
      <select
        value={isDisabled ? "" : value}
        disabled={isDisabled}
        aria-label={`Тарифа, ред ${rowNumber}`}
        onChange={(event) => onChange(event.target.value)}
        className={[
          "h-10 w-full rounded-md border px-2 text-slate-900 outline-none transition shadow-sm",
          isDisabled
            ? "cursor-not-allowed border-slate-300 bg-slate-100 text-slate-500"
            : "border-slate-400 bg-white hover:border-slate-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-200",
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
            <option value="">Избери конкретна тарифа</option>

            {tariffs.map((tariff) => (
              <option key={tariff.id} value={tariff.id}>
                {formatCustomerTariffOptionLabel(tariff)}
              </option>
            ))}
          </>
        )}
      </select>

      <p
        className={[
          "text-xs leading-4",
          hasCustomer && tariffs.length > 1 && value.trim() === ""
            ? "font-medium text-amber-700"
            : "text-slate-500",
        ].join(" ")}
      >
        {getTariffHelperText({
          hasCustomer,
          hasAutomaticTableTariff,
          tariffs,
          selectedTariff,
          value,
        })}
      </p>
    </div>
  );
}

export function formatCustomerTariffOptionLabel(
  tariff: CustomerTariffOption,
): string {
  const typeLabel = getTariffTypeLabel(tariff.type);
  const priceLabel = getTariffPriceLabel(tariff);
  const rangeLabel = getTariffRangeLabel(tariff);
  const billableLogicLabel = getBillableKmLogicLabel(
    tariff.billableKmLogic,
  );
  const portFeeLabel = tariff.portFeeIncluded
    ? "порт включен"
    : "";

  return [
    tariff.name,
    typeLabel,
    priceLabel,
    rangeLabel,
    billableLogicLabel,
    portFeeLabel,
  ]
    .filter(Boolean)
    .join(" — ");
}

function getTariffHelperText({
  hasCustomer,
  hasAutomaticTableTariff,
  tariffs,
  selectedTariff,
  value,
}: {
  hasCustomer: boolean;
  hasAutomaticTableTariff: boolean;
  tariffs: readonly CustomerTariffOption[];
  selectedTariff: CustomerTariffOption | undefined;
  value: string;
}): string {
  if (!hasCustomer) {
    return "Първо избери клиент, за да се заредят тарифите.";
  }

  if (tariffs.length === 0 && hasAutomaticTableTariff) {
    return "Цената ще се сметне автоматично по тарифната таблица на клиента.";
  }

  if (tariffs.length === 0) {
    return "Няма активна course-level тарифа. Цената ще остане ръчна.";
  }

  if (selectedTariff) {
    return `Избрана тарифа: ${formatCustomerTariffOptionLabel(selectedTariff)}`;
  }

  if (value.trim() !== "") {
    return "Избраната тарифа вече не е налична за този клиент или тип курс.";
  }

  if (tariffs.length === 1) {
    return "Има само една подходяща тарифа и тя може да бъде избрана автоматично.";
  }

  return "Клиентът има няколко активни тарифи. Избери точната тарифа за този курс.";
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

  if (
    tariff.type === "WAITING_TIME" &&
    tariff.waitingHourlyRate !== null
  ) {
    return `${formatMoney(tariff.waitingHourlyRate)} €/час`;
  }

  if (tariff.type === "MANUAL") {
    return "ръчна цена";
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
      return "Тарифна таблица";

    case "DISTANCE_TABLE":
      return "Дистанционна таблица";

    case "PRICE_PER_KM":
      return "Цена / км";

    case "FIXED_PRICE":
      return "Фиксирана цена";

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

function getBillableKmLogicLabel(logic: string): string {
  switch (logic) {
    case "TOTAL_ROUTE":
      return "цял маршрут";

    case "ONE_WAY":
      return "еднопосочно";

    case "SELECTED_LEGS":
      return "избрани отсечки";

    case "FIXED_PRICE":
      return "фиксирана цена";

    case "MANUAL":
      return "ръчни км";

    default:
      return logic;
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