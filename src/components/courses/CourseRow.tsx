"use client";

import { useMemo, useState } from "react";

import {
  calculateCourse,
  type CoursePricingMethod,
} from "@/lib/calculations/calculateCourse";
import type { PricingStatus } from "@/lib/calculations/calculatePricingStatus";
import {
  buildCourseDisplayWarnings,
  buildCourseInputWarnings,
} from "@/lib/calculations/courseWarnings";
import { calculationSettings } from "@/lib/settings/calculationSettings";

import AddressAutocomplete, {
  type AddressOption,
} from "./AddressAutocomplete";
import CourseDetailsPanel from "./CourseDetailsPanel";
import CourseTypeSelect from "./CourseTypeSelect";
import CustomerSelect, {
  type CustomerOption,
} from "./CustomerSelect";
import ManualMarker from "./ManualMarker";
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

type ManualKmField =
  | "totalKm"
  | "billableKm";

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
  hasTariff: boolean;
};

type NumberInputWithMarkerProps = {
  value: string;
  label: string;
  rowNumber: number;
  placeholder?: string;
  min?: number;
  step?: number;
  readOnly?: boolean;
  showMarker: boolean;
  onChange?: (value: string) => void;
};

const ADDRESS_FIELDS: readonly AddressField[] = [
  "pickupAddressId",
  "loadingUnloadingAddressId",
  "extraAddressId",
  "returnAddressId",
];

const MANUAL_KM_FIELDS: readonly ManualKmField[] = [
  "totalKm",
  "billableKm",
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

  const [isSaved, setIsSaved] =
    useState(false);

  const [isDetailsOpen, setIsDetailsOpen] =
    useState(false);

  const selectedCustomer = useMemo(
    () =>
      customerOptions.find(
        (customer) =>
          customer.id === draft.customerId,
      ),
    [customerOptions, draft.customerId],
  );

  const selectedTruck = useMemo(
    () =>
      truckOptions.find(
        (truck) =>
          truck.id === draft.truckId,
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

  const totalKmValue =
    parseNullableNumber(draft.totalKm);

  const billableKmValue =
    parseNullableNumber(draft.billableKm);

  const nonBillableKmValue =
    totalKmValue !== null &&
    billableKmValue !== null
      ? Math.max(
          totalKmValue - billableKmValue,
          0,
        )
      : null;

  const hasCourseData = useMemo(
    () =>
      [
        draft.truckId,
        draft.customerId,
        draft.courseType,
        draft.pickupAddressId,
        draft.loadingUnloadingAddressId,
        draft.extraAddressId,
        draft.returnAddressId,
        draft.totalKm,
        draft.billableKm,
        draft.containerNumber,
        draft.waitingMinutes,
        draft.price,
        draft.tollFee,
        draft.portFee,
      ].some(
        (value) => value.trim() !== "",
      ),
    [draft],
  );

  const inputWarnings = useMemo(
    () =>
      buildCourseInputWarnings({
        hasCourseData,
        hasSelectedCustomer:
          selectedCustomer !== undefined,
        hasActiveTariff: pricing.hasTariff,
        pricingMethod: pricing.method,
        courseType: draft.courseType,
        totalKm: totalKmValue,
        billableKm: billableKmValue,
        tollValue: draft.tollFee,
      }),
    [
      hasCourseData,
      selectedCustomer,
      pricing,
      draft.courseType,
      draft.tollFee,
      totalKmValue,
      billableKmValue,
    ],
  );

  const calculation = useMemo(() => {
    const totalKm =
      parseRequiredNumber(draft.totalKm);

    const billableKm =
      parseRequiredNumber(draft.billableKm);

    if (
      totalKm === null ||
      billableKm === null
    ) {
      return null;
    }

    const manualPrice =
      parseRequiredNumber(draft.price);

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

        manualTollOverride:
          parseOptionalNumber(
            draft.tollFee,
          ),

        waitingMinutes:
          parseOptionalNumber(
            draft.waitingMinutes,
          ),

        portCost:
          parseOptionalNumber(
            draft.portFee,
          ),

        requiresReview:
          inputWarnings.length > 0,

        settings,
      });
    } catch {
      return null;
    }
  }, [
    draft,
    pricing,
    selectedTruck,
    inputWarnings,
  ]);

  const effectivePrice =
    calculation?.price ??
    parseNullableNumber(draft.price);

  const displayWarnings = useMemo(
    () =>
      buildCourseDisplayWarnings({
        hasCourseData,
        inputWarnings,
        effectivePrice,
        engineWarnings:
          calculation?.warnings ?? [],
      }),
    [
      hasCourseData,
      inputWarnings,
      effectivePrice,
      calculation,
    ],
  );

  const displayStatus: PricingStatus | null =
    calculation?.status ??
    (displayWarnings.length > 0
      ? "NEEDS_REVIEW"
      : null);

  const extraChargesValue =
    calculateExtraCharges(
      calculation?.revenue,
      calculation?.price,
      calculation?.waiting.waitingCost,
    );

  const panelId =
    `course-details-panel-${draft.id}`;

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
        calculation?.costs.fuelCost !==
        undefined
          ? formatMoney(
              calculation.costs.fuelCost,
            )
          : "",

      totalCost:
        calculation?.costs.totalCost !==
        undefined
          ? formatMoney(
              calculation.costs.totalCost,
            )
          : "",

      profit:
        calculation?.profit !== null &&
        calculation?.profit !== undefined
          ? formatMoney(calculation.profit)
          : "",

      status: displayStatus ?? "",
    };

    setDraft(savedRow);
    onSave(savedRow);
    setIsSaved(true);
  }

  return (
    <>
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
                  handleCellChange(
                    "truckId",
                    truckId,
                  )
                }
              />
            ) : column.key ===
              "customerId" ? (
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
            ) : column.key ===
              "courseType" ? (
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
            ) : isAddressField(
                column.key,
              ) ? (
              <AddressAutocomplete
                value={draft[column.key]}
                addresses={addressOptions}
                label={column.label}
                rowNumber={rowNumber}
                placeholder={
                  column.placeholder
                }
                onChange={(addressId) =>
                  handleCellChange(
                    column.key,
                    addressId,
                  )
                }
              />
            ) : isManualKmField(
                column.key,
              ) ? (
              <NumberInputWithMarker
                value={draft[column.key]}
                label={column.label}
                rowNumber={rowNumber}
                placeholder={
                  column.placeholder
                }
                min={column.min}
                step={column.step}
                showMarker={
                  draft[
                    column.key
                  ].trim() !== ""
                }
                onChange={(value) =>
                  handleCellChange(
                    column.key,
                    value,
                  )
                }
              />
            ) : column.key === "price" ? (
              <NumberInputWithMarker
                value={
                  pricing.isAutomatic
                    ? calculation?.price !==
                        null &&
                      calculation?.price !==
                        undefined
                      ? formatMoney(
                          calculation.price,
                        )
                      : ""
                    : draft.price
                }
                label={column.label}
                rowNumber={rowNumber}
                placeholder={
                  pricing.isAutomatic
                    ? "Автоматично"
                    : "0.00"
                }
                min={0}
                step={0.01}
                readOnly={
                  pricing.isAutomatic
                }
                showMarker={
                  !pricing.isAutomatic &&
                  draft.price.trim() !== ""
                }
                onChange={(value) =>
                  handleCellChange(
                    "price",
                    value,
                  )
                }
              />
            ) : column.key ===
              "tollFee" ? (
              <NumberInputWithMarker
                value={draft.tollFee}
                label={column.label}
                rowNumber={rowNumber}
                placeholder={
                  column.placeholder
                }
                min={column.min}
                step={column.step}
                showMarker={
                  draft.tollFee.trim() !== ""
                }
                onChange={(value) =>
                  handleCellChange(
                    "tollFee",
                    value,
                  )
                }
              />
            ) : column.key ===
              "fuelCost" ? (
              <input
                type="text"
                value={
                  calculation?.costs
                    .fuelCost !== undefined
                    ? formatMoney(
                        calculation.costs
                          .fuelCost,
                      )
                    : ""
                }
                readOnly
                placeholder="Автоматично"
                aria-label={`Гориво, ред ${rowNumber}`}
                className="h-10 w-full cursor-not-allowed rounded border border-transparent bg-slate-50 px-2 text-slate-500 outline-none"
              />
            ) : column.key ===
              "totalCost" ? (
              <input
                type="text"
                value={
                  calculation?.costs
                    .totalCost !== undefined
                    ? formatMoney(
                        calculation.costs
                          .totalCost,
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
                  calculation?.profit !==
                    null &&
                  calculation?.profit !==
                    undefined
                    ? formatMoney(
                        calculation.profit,
                      )
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
                  status={displayStatus}
                />
              </div>
            ) : (
              <input
                type={
                  column.inputType ?? "text"
                }
                value={draft[column.key]}
                min={column.min}
                step={column.step}
                readOnly={column.readOnly}
                placeholder={
                  column.placeholder
                }
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
            aria-expanded={isDetailsOpen}
            aria-controls={panelId}
            onClick={() =>
              setIsDetailsOpen(true)
            }
            className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            Детайли
          </button>
        </td>
      </tr>

      <CourseDetailsPanel
        isOpen={isDetailsOpen}
        panelId={panelId}
        rowNumber={rowNumber}
        truckLabel={
          selectedTruck
            ? `${selectedTruck.name} — ${selectedTruck.licensePlate}`
            : ""
        }
        customerLabel={
          selectedCustomer?.name ?? ""
        }
        courseTypeLabel={
          getCourseTypeLabel(
            draft.courseType,
          )
        }
        containerNumber={
          draft.containerNumber
        }
        pickupAddressLabel={
          getAddressLabel(
            addressOptions,
            draft.pickupAddressId,
          )
        }
        loadingUnloadingAddressLabel={
          getAddressLabel(
            addressOptions,
            draft.loadingUnloadingAddressId,
          )
        }
        extraAddressLabel={
          getAddressLabel(
            addressOptions,
            draft.extraAddressId,
          )
        }
        returnAddressLabel={
          getAddressLabel(
            addressOptions,
            draft.returnAddressId,
          )
        }
        totalKm={totalKmValue}
        billableKm={billableKmValue}
        nonBillableKm={
          nonBillableKmValue
        }
        baseClientPrice={effectivePrice}
        waitingMinutes={
          parseNullableNumber(
            draft.waitingMinutes,
          )
        }
        waitingChargedToClient={
          calculation?.waiting
            .waitingCost ?? null
        }
        extraCharges={extraChargesValue}
        totalRevenue={
          calculation?.revenue ?? null
        }
        fuelCost={
          calculation?.costs.fuelCost ??
          null
        }
        tollCost={
          calculation?.costs.tollCost ??
          parseNullableNumber(
            draft.tollFee,
          )
        }
        truckCost={
          calculation?.costs
            .truckFixedCost ?? null
        }
        waitingCost={
          calculation?.waiting
            .waitingCost ?? null
        }
        portCost={
          calculation?.costs.portCost ??
          parseNullableNumber(
            draft.portFee,
          )
        }
        otherCosts={
          calculation?.costs
            .otherCosts ?? null
        }
        totalCost={
          calculation?.costs
            .totalCost ?? null
        }
        profit={
          calculation?.profit ?? null
        }
        profitMargin={
          calculation?.profitMargin ??
          null
        }
        status={displayStatus}
        warnings={displayWarnings}
        onClose={() =>
          setIsDetailsOpen(false)
        }
      />
    </>
  );
}

function NumberInputWithMarker({
  value,
  label,
  rowNumber,
  placeholder,
  min,
  step,
  readOnly = false,
  showMarker,
  onChange,
}: NumberInputWithMarkerProps) {
  return (
    <div className="relative">
      <input
        type="number"
        value={value}
        min={min}
        step={step}
        readOnly={readOnly}
        placeholder={placeholder}
        aria-label={`${label}, ред ${rowNumber}`}
        onChange={(event) =>
          onChange?.(event.target.value)
        }
        className={[
          "h-10 w-full rounded border px-2 pr-12 outline-none transition",
          readOnly
            ? "cursor-not-allowed border-transparent bg-slate-50 text-slate-500"
            : "border-transparent bg-transparent text-slate-900 hover:border-slate-200 focus:border-slate-400 focus:bg-white",
        ].join(" ")}
      />

      <ManualMarker
        visible={showMarker}
        fieldLabel={label}
      />
    </div>
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
      hasTariff: false,
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
        hasTariff: true,
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
      hasTariff: true,
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
      hasTariff: true,
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
      hasTariff: true,
    };
  }

  return {
    method: "MANUAL",
    pricePerKm: null,
    fixedPrice: null,
    isAutomatic: false,
    hasTariff: false,
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

function parseOptionalNumber(
  value: string,
): number {
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

function parseNullableNumber(
  value: string,
): number | null {
  if (value.trim() === "") {
    return null;
  }

  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    return null;
  }

  return parsedValue;
}

function calculateExtraCharges(
  totalRevenue:
    | number
    | null
    | undefined,
  baseClientPrice:
    | number
    | null
    | undefined,
  waitingChargedToClient:
    | number
    | undefined,
): number | null {
  if (
    totalRevenue === null ||
    totalRevenue === undefined ||
    baseClientPrice === null ||
    baseClientPrice === undefined ||
    waitingChargedToClient === undefined
  ) {
    return null;
  }

  const difference =
    totalRevenue -
    baseClientPrice -
    waitingChargedToClient;

  if (Math.abs(difference) < 0.005) {
    return 0;
  }

  return (
    Math.round(difference * 100) / 100
  );
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

function isManualKmField(
  field: EditableCourseField,
): field is ManualKmField {
  return (
    MANUAL_KM_FIELDS as readonly EditableCourseField[]
  ).includes(field);
}

function getCourseTypeLabel(
  courseType: string,
): string {
  switch (courseType) {
    case "ROUND_TRIP":
      return "Кръгов";

    case "SHUNT":
      return "Шунт";

    default:
      return "";
  }
}

function getAddressLabel(
  addresses: readonly AddressOption[],
  addressId: string,
): string {
  if (addressId.trim() === "") {
    return "";
  }

  const address = addresses.find(
    (option) => option.id === addressId,
  );

  if (!address) {
    return "";
  }

  const cityLine = [
    address.postalCode,
    address.city,
  ]
    .filter(Boolean)
    .join(" ");

  const addressParts = [
    address.street,
    cityLine,
    address.country,
  ].filter(Boolean);

  if (addressParts.length === 0) {
    return address.name;
  }

  return `${address.name} — ${addressParts.join(", ")}`;
}