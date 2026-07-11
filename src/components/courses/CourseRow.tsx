"use client";

import { useMemo, useState } from "react";

import {
  calculateCourse,
  type CoursePricingMethod,
} from "@/lib/calculations/calculateCourse";
import { calculationSettings } from "@/lib/settings/calculationSettings";

import AddressAutocomplete, {
  type AddressOption,
} from "./AddressAutocomplete";
import CourseTypeSelect from "./CourseTypeSelect";
import CustomerSelect, {
  type CustomerOption,
} from "./CustomerSelect";
import StatusBadge from "./StatusBadge";
import TruckSelect, {
  type TruckOption,
} from "./TruckSelect";

export type CourseRowData = {
  id: number;
  truckId: string;
  customerId: string;
  courseType: string;
  pickupAddressId: string;
  loadingUnloadingAddressId: string;
  extraAddressId: string;
  returnAddressId: string;
  totalKm: string;
  billableKm: string;
  containerNumber: string;
  waitingMinutes: string;
  price: string;
  tollFee: string;
  portFee: string;
  fuelCost: string;
  totalCost: string;
  profit: string;
  status: string;
};

export type EditableCourseField = Exclude<
  keyof CourseRowData,
  "id"
>;

type AddressField =
  | "pickupAddressId"
  | "loadingUnloadingAddressId"
  | "extraAddressId"
  | "returnAddressId";

export type CourseColumn = {
  key: EditableCourseField;
  label: string;
  inputType?: "text" | "number";
  placeholder?: string;
  min?: number;
  step?: number;
  readOnly?: boolean;
  width: number;
};

type ResolvedPricing = {
  method: CoursePricingMethod;
  pricePerKm: number | null;
  fixedPrice: number | null;
  isAutomatic: boolean;
};

const ADDRESS_FIELDS: readonly AddressField[] = [
  "pickupAddressId",
  "loadingUnloadingAddressId",
  "extraAddressId",
  "returnAddressId",
];

export const COURSE_COLUMNS: readonly CourseColumn[] = [
  {
    key: "truckId",
    label: "Камион",
    width: 170,
  },
  {
    key: "customerId",
    label: "Клиент",
    width: 170,
  },
  {
    key: "courseType",
    label: "Тип",
    width: 140,
  },
  {
    key: "pickupAddressId",
    label: "Взимане",
    placeholder: "Търси адрес за взимане",
    width: 240,
  },
  {
    key: "loadingUnloadingAddressId",
    label: "Товарене / разтоварване",
    placeholder: "Търси адрес на клиента",
    width: 280,
  },
  {
    key: "extraAddressId",
    label: "Екстра адрес",
    placeholder: "Търси екстра адрес",
    width: 240,
  },
  {
    key: "returnAddressId",
    label: "Връщане",
    placeholder: "Търси адрес за връщане",
    width: 240,
  },
  {
    key: "totalKm",
    label: "Км",
    inputType: "number",
    placeholder: "0",
    min: 0,
    step: 0.1,
    width: 110,
  },
  {
    key: "billableKm",
    label: "Платими км",
    inputType: "number",
    placeholder: "0",
    min: 0,
    step: 0.1,
    width: 125,
  },
  {
    key: "containerNumber",
    label: "Контейнер",
    placeholder: "ABCD 123456-7",
    width: 175,
  },
  {
    key: "waitingMinutes",
    label: "Престой (мин)",
    inputType: "number",
    placeholder: "0",
    min: 0,
    step: 1,
    width: 130,
  },
  {
    key: "price",
    label: "Цена (€)",
    inputType: "number",
    placeholder: "0.00",
    min: 0,
    step: 0.01,
    width: 120,
  },
  {
    key: "tollFee",
    label: "Тол (€)",
    inputType: "number",
    placeholder: "0.00",
    min: 0,
    step: 0.01,
    width: 110,
  },
  {
    key: "portFee",
    label: "Пристанище (€)",
    inputType: "number",
    placeholder: "0.00",
    min: 0,
    step: 0.01,
    width: 140,
  },
  {
    key: "fuelCost",
    label: "Гориво (€)",
    inputType: "number",
    placeholder: "Автоматично",
    readOnly: true,
    width: 130,
  },
  {
    key: "totalCost",
    label: "Разходи (€)",
    inputType: "number",
    placeholder: "Автоматично",
    readOnly: true,
    width: 140,
  },
  {
    key: "profit",
    label: "Печалба (€)",
    inputType: "number",
    placeholder: "Автоматично",
    readOnly: true,
    width: 135,
  },
  {
    key: "status",
    label: "Статус",
    placeholder: "Автоматично",
    readOnly: true,
    width: 160,
  },
];

type CourseRowProps = {
  rowNumber: number;
  initialRow: CourseRowData;
  truckOptions: readonly TruckOption[];
  customerOptions: readonly CustomerOption[];
  addressOptions: readonly AddressOption[];
  onSave: (row: CourseRowData) => void;
};

export default function CourseRow({
  rowNumber,
  initialRow,
  truckOptions,
  customerOptions,
  addressOptions,
  onSave,
}: CourseRowProps) {
  const [draft, setDraft] =
    useState<CourseRowData>(initialRow);

  const [isSaved, setIsSaved] = useState(false);

  const selectedCustomer = useMemo(
    () =>
      customerOptions.find(
        (customer) => customer.id === draft.customerId,
      ),
    [customerOptions, draft.customerId],
  );

  const selectedTruck = useMemo(
    () =>
      truckOptions.find(
        (truck) => truck.id === draft.truckId,
      ),
    [truckOptions, draft.truckId],
  );

  const pricing = useMemo(
    () =>
      resolveCustomerPricing(
        selectedCustomer,
        draft.courseType,
      ),
    [selectedCustomer, draft.courseType],
  );

  const calculation = useMemo(() => {
    const totalKm = parseRequiredNumber(draft.totalKm);

    const billableKm = parseRequiredNumber(
      draft.billableKm,
    );

    if (totalKm === null || billableKm === null) {
      return null;
    }

    const manualPrice = parseRequiredNumber(draft.price);

    const settings = {
      ...calculationSettings,

      fuel: {
        ...calculationSettings.fuel,
        consumptionLitersPer100Km:
          selectedTruck
            ?.defaultFuelConsumptionLPer100Km ??
          calculationSettings.fuel
            .consumptionLitersPer100Km,
      },

      msi: {
        ...calculationSettings.msi,
        pricePerKm:
          pricing.pricePerKm ??
          calculationSettings.msi.pricePerKm,
      },
    };

    try {
      return calculateCourse({
        routeLegs: [
          {
            distanceKm: totalKm,
            tollCost: 0,
            isBillable: true,
          },
        ],

        billableKmLogic: "MANUAL",
        pricingMethod: pricing.method,

        manualBillableKm: billableKm,

        fixedPrice:
          pricing.fixedPrice ?? undefined,

        manualPrice:
          pricing.method === "MANUAL"
            ? manualPrice ?? undefined
            : undefined,

        manualTollOverride: parseOptionalNumber(
          draft.tollFee,
        ),

        waitingMinutes: parseOptionalNumber(
          draft.waitingMinutes,
        ),

        portCost: parseOptionalNumber(draft.portFee),

        settings,
      });
    } catch {
      return null;
    }
  }, [draft, pricing, selectedTruck]);

  function handleCellChange(
    field: EditableCourseField,
    value: string,
  ): void {
    setDraft((currentDraft) => ({
      ...currentDraft,
      [field]: value,
    }));

    setIsSaved(false);
  }

  function handleSave(): void {
    const savedRow: CourseRowData = {
      ...draft,

      price:
        calculation?.price !== null &&
        calculation?.price !== undefined
          ? formatMoney(calculation.price)
          : draft.price,

      fuelCost:
        calculation?.costs.fuelCost !== undefined
          ? formatMoney(calculation.costs.fuelCost)
          : "",

      totalCost:
        calculation?.costs.totalCost !== undefined
          ? formatMoney(calculation.costs.totalCost)
          : "",

      profit:
        calculation?.profit !== null &&
        calculation?.profit !== undefined
          ? formatMoney(calculation.profit)
          : "",

      status: calculation?.status ?? "",
    };

    setDraft(savedRow);
    onSave(savedRow);
    setIsSaved(true);
  }

  return (
    <tr className="group hover:bg-slate-50">
      <td className="sticky left-0 z-10 border-b border-r border-slate-200 bg-white px-3 py-2 text-center text-slate-500 group-hover:bg-slate-50">
        {rowNumber}
      </td>

      {COURSE_COLUMNS.map((column) => (
        <td
          key={column.key}
          style={{
            width: column.width,
            minWidth: column.width,
          }}
          className="border-b border-r border-slate-200 p-1"
        >
          {column.key === "truckId" ? (
            <TruckSelect
              value={draft.truckId}
              trucks={truckOptions}
              rowNumber={rowNumber}
              onChange={(truckId) =>
                handleCellChange("truckId", truckId)
              }
            />
          ) : column.key === "customerId" ? (
            <CustomerSelect
              value={draft.customerId}
              customers={customerOptions}
              rowNumber={rowNumber}
              onChange={(customerId) =>
                handleCellChange(
                  "customerId",
                  customerId,
                )
              }
            />
          ) : column.key === "courseType" ? (
            <CourseTypeSelect
              value={draft.courseType}
              rowNumber={rowNumber}
              onChange={(courseType) =>
                handleCellChange(
                  "courseType",
                  courseType,
                )
              }
            />
          ) : isAddressField(column.key) ? (
            <AddressAutocomplete
              value={draft[column.key]}
              addresses={addressOptions}
              label={column.label}
              rowNumber={rowNumber}
              placeholder={column.placeholder}
              onChange={(addressId) =>
                handleCellChange(
                  column.key,
                  addressId,
                )
              }
            />
          ) : column.key === "price" ? (
            <input
              type="number"
              value={
                pricing.isAutomatic
                  ? calculation?.price !== null &&
                    calculation?.price !== undefined
                    ? formatMoney(calculation.price)
                    : ""
                  : draft.price
              }
              min={0}
              step={0.01}
              readOnly={pricing.isAutomatic}
              placeholder={
                pricing.isAutomatic
                  ? "Автоматично"
                  : "0.00"
              }
              aria-label={`Цена (€), ред ${rowNumber}`}
              onChange={(event) =>
                handleCellChange(
                  "price",
                  event.target.value,
                )
              }
              className={[
                "h-10 w-full rounded border px-2 outline-none transition",
                pricing.isAutomatic
                  ? "cursor-not-allowed border-transparent bg-slate-50 text-slate-500"
                  : "border-transparent bg-transparent text-slate-900 hover:border-slate-200 focus:border-slate-400 focus:bg-white",
              ].join(" ")}
            />
          ) : column.key === "fuelCost" ? (
            <input
              type="text"
              value={
                calculation?.costs.fuelCost !== undefined
                  ? formatMoney(
                      calculation.costs.fuelCost,
                    )
                  : ""
              }
              readOnly
              placeholder="Автоматично"
              aria-label={`Гориво, ред ${rowNumber}`}
              className="h-10 w-full cursor-not-allowed rounded border border-transparent bg-slate-50 px-2 text-slate-500 outline-none"
            />
          ) : column.key === "totalCost" ? (
            <input
              type="text"
              value={
                calculation?.costs.totalCost !== undefined
                  ? formatMoney(
                      calculation.costs.totalCost,
                    )
                  : ""
              }
              readOnly
              placeholder="Автоматично"
              aria-label={`Разходи, ред ${rowNumber}`}
              className="h-10 w-full cursor-not-allowed rounded border border-transparent bg-slate-50 px-2 text-slate-500 outline-none"
            />
          ) : column.key === "profit" ? (
            <input
              type="text"
              value={
                calculation?.profit !== null &&
                calculation?.profit !== undefined
                  ? formatMoney(calculation.profit)
                  : ""
              }
              readOnly
              placeholder="Автоматично"
              aria-label={`Печалба, ред ${rowNumber}`}
              className="h-10 w-full cursor-not-allowed rounded border border-transparent bg-slate-50 px-2 text-slate-500 outline-none"
            />
          ) : column.key === "status" ? (
            <div className="flex h-10 w-full items-center justify-center px-1">
              <StatusBadge
                status={calculation?.status}
              />
            </div>
          ) : (
            <input
              type={column.inputType ?? "text"}
              value={draft[column.key]}
              min={column.min}
              step={column.step}
              readOnly={column.readOnly}
              placeholder={column.placeholder}
              aria-label={`${column.label}, ред ${rowNumber}`}
              onChange={(event) =>
                handleCellChange(
                  column.key,
                  event.target.value,
                )
              }
              className={[
                "h-10 w-full rounded border px-2 outline-none transition",
                column.readOnly
                  ? "cursor-not-allowed border-transparent bg-slate-50 text-slate-500"
                  : "border-transparent bg-transparent text-slate-900 hover:border-slate-200 focus:border-slate-400 focus:bg-white",
              ].join(" ")}
            />
          )}
        </td>
      ))}

      <td className="sticky right-[120px] z-10 w-[130px] min-w-[130px] border-b border-r border-slate-200 bg-white px-3 py-2 group-hover:bg-slate-50">
        <div className="flex flex-col items-start gap-1">
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex h-9 items-center justify-center rounded-md bg-slate-900 px-3 text-sm font-medium text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            Save
          </button>

          {isSaved && (
            <span className="text-xs font-medium text-emerald-600">
              Saved
            </span>
          )}
        </div>
      </td>

      <td className="sticky right-0 z-10 w-[120px] min-w-[120px] border-b border-slate-200 bg-white px-3 py-2 group-hover:bg-slate-50">
        <button
          type="button"
          disabled
          title="Детайлният изглед ще бъде добавен в следваща задача."
          className="inline-flex h-9 cursor-not-allowed items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-400"
        >
          Детайли
        </button>
      </td>
    </tr>
  );
}

function resolveCustomerPricing(
  customer: CustomerOption | undefined,
  courseType: string,
): ResolvedPricing {
  if (!customer) {
    return {
      method: "MANUAL",
      pricePerKm: null,
      fixedPrice: null,
      isAutomatic: false,
    };
  }

  if (courseType === "SHUNT") {
    const shuntTariff = customer.tariffs.find(
      (tariff) =>
        tariff.type === "SHUNT" &&
        tariff.fixedPrice !== null,
    );

    if (
      shuntTariff &&
      shuntTariff.fixedPrice !== null
    ) {
      return {
        method: "FIXED_PRICE",
        pricePerKm: null,
        fixedPrice: shuntTariff.fixedPrice,
        isAutomatic: true,
      };
    }
  }

  const tableTariff = customer.tariffs.find(
    (tariff) =>
      tariff.type === "FIXED_TABLE_UPPER_BOUND" ||
      tariff.type === "DISTANCE_TABLE",
  );

  if (tableTariff) {
    return {
      method: "VEPCO",
      pricePerKm: null,
      fixedPrice: null,
      isAutomatic: true,
    };
  }

  const pricePerKmTariff = customer.tariffs.find(
    (tariff) =>
      tariff.type === "PRICE_PER_KM" &&
      tariff.pricePerKm !== null,
  );

  if (
    pricePerKmTariff &&
    pricePerKmTariff.pricePerKm !== null
  ) {
    return {
      method: "MSI",
      pricePerKm: pricePerKmTariff.pricePerKm,
      fixedPrice: null,
      isAutomatic: true,
    };
  }

  const fixedPriceTariff = customer.tariffs.find(
    (tariff) =>
      tariff.type === "FIXED_PRICE" &&
      tariff.fixedPrice !== null,
  );

  if (
    fixedPriceTariff &&
    fixedPriceTariff.fixedPrice !== null
  ) {
    return {
      method: "FIXED_PRICE",
      pricePerKm: null,
      fixedPrice: fixedPriceTariff.fixedPrice,
      isAutomatic: true,
    };
  }

  return {
    method: "MANUAL",
    pricePerKm: null,
    fixedPrice: null,
    isAutomatic: false,
  };
}

function parseRequiredNumber(
  value: string,
): number | null {
  if (value.trim() === "") {
    return null;
  }

  const parsedValue = Number(value);

  if (
    !Number.isFinite(parsedValue) ||
    parsedValue < 0
  ) {
    return null;
  }

  return parsedValue;
}

function parseOptionalNumber(value: string): number {
  if (value.trim() === "") {
    return 0;
  }

  const parsedValue = Number(value);

  if (
    !Number.isFinite(parsedValue) ||
    parsedValue < 0
  ) {
    return 0;
  }

  return parsedValue;
}

function formatMoney(value: number): string {
  return value.toFixed(2);
}

function isAddressField(
  field: EditableCourseField,
): field is AddressField {
  return (
    ADDRESS_FIELDS as readonly EditableCourseField[]
  ).includes(field);
}