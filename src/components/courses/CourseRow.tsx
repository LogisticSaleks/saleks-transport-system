"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

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
  type AddressSelectionValue,
} from "./AddressAutocomplete";
import CourseDetailsPanel from "./CourseDetailsPanel";
import CourseTypeSelect from "./CourseTypeSelect";
import CustomerSelect, {
  type CustomerOption,
  type CustomerTariffOption,
} from "./CustomerSelect";
import CustomerTariffSelect, {
  formatCustomerTariffOptionLabel,
} from "./CustomerTariffSelect";
import ManualMarker from "./ManualMarker";
import StatusBadge from "./StatusBadge";
import TruckSelect, {
  type TruckOption,
} from "./TruckSelect";

export type CourseRowData = {
  id: number;
  databaseId: string | null;
  filterDate: string;
  truckId: string;
  customerId: string;
  customerTariffId: string;
  tariffNameAtBooking?: string;
  tariffTypeAtBooking?: string;
  pricingMethodAtBooking?: string;
  pricePerKmAtBooking?: string;
  fixedPriceAtBooking?: string;
  waitingHourlyRateAtBooking?: string;
  billableKmLogicAtBooking?: string;
  portFeeIncludedAtBooking?: string;
  pricingSnapshotCreatedAt?: string;
  courseType: string;
  pickupAddressId: string;
  pickupAddressText: string;
  loadingUnloadingAddressId: string;
  loadingUnloadingAddressText: string;
  extraAddressId: string;
  extraAddressText: string;
  returnAddressId: string;
  returnAddressText: string;
  totalKm: string;
  billableKm: string;
  kmSource: string;
  manualKmOverride: string;
  kmOverrideNotes: string;
  containerNumber: string;
  waitingMinutes: string;
  price: string;
  tollFee: string;
  portFee: string;
  settlementAmount: string;
  settlementStatus: string;
  settlementCheckedAt: string;
  settlementReference: string;
  settlementNotes: string;
  fuelCost: string;
  totalCost: string;
  profit: string;
  status: string;
};

type NonEditableCourseField =
  | "id"
  | "databaseId"
  | "filterDate"
  | "tariffNameAtBooking"
  | "tariffTypeAtBooking"
  | "pricingMethodAtBooking"
  | "pricePerKmAtBooking"
  | "fixedPriceAtBooking"
  | "waitingHourlyRateAtBooking"
  | "billableKmLogicAtBooking"
  | "portFeeIncludedAtBooking"
  | "pricingSnapshotCreatedAt";

export type EditableCourseField = Exclude<
  keyof CourseRowData,
  NonEditableCourseField
>;

type AddressField =
  | "pickupAddressId"
  | "loadingUnloadingAddressId"
  | "extraAddressId"
  | "returnAddressId";

type AddressTextField =
  | "pickupAddressText"
  | "loadingUnloadingAddressText"
  | "extraAddressText"
  | "returnAddressText";

type ManualKmField =
  | "totalKm"
  | "billableKm";

type SettlementStatusValue =
  | "NOT_CHECKED"
  | "OK"
  | "UNDERPAID"
  | "OVERPAID"
  | "DISPUTED";

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

type CourseStopPayload = {
  sequence: number;
  type:
    | "PICKUP"
    | "LOAD_UNLOAD"
    | "EXTRA"
    | "RETURN";
  addressId: string | null;
  addressText: string | null;
  label: string | null;
  notes: string | null;
};

type CourseCostPayload = {
  truckId: string | null;
  type:
    | "FUEL"
    | "TOLL"
    | "PORT_FEE"
    | "OTHER";
  description: string;
  amount: number;
  notes: string | null;
};

type CourseApiResponse = {
  course?: {
    id?: string;
    plannedDate?: string | null;
    createdAt?: string;
    tariffNameAtBooking?: string | null;
    tariffTypeAtBooking?: string | null;
    pricingMethodAtBooking?: string | null;
    pricePerKmAtBooking?: number | string | null;
    fixedPriceAtBooking?: number | string | null;
    waitingHourlyRateAtBooking?: number | string | null;
    billableKmLogicAtBooking?: string | null;
    portFeeIncludedAtBooking?: boolean | null;
    pricingSnapshotCreatedAt?: string | null;
    settlementAmount?: number | string | null;
    settlementStatus?: string | null;
    settlementCheckedAt?: string | null;
    settlementReference?: string | null;
    settlementNotes?: string | null;
  };
  error?: string;
};

type RouteCalculationApiResponse = {
  route?: {
    distanceKm?: number | string | null;
    durationMinutes?: number | string | null;
    tollCost?: number | string | null;
    notes?: string | null;
    warnings?: string[];
    cache?: {
      hit?: boolean;
    };
  };
  error?: string;
};

type RouteCalculationCoordinate = {
  latitude: number;
  longitude: number;
};

type RouteCalculationStopPayload = {
  type: "ORIGIN" | "VIA" | "DESTINATION";
  addressId: string | null;
  label: string | null;
  coordinate: RouteCalculationCoordinate | null;
};

const ADDRESS_FIELDS: readonly AddressField[] = [
  "pickupAddressId",
  "loadingUnloadingAddressId",
  "extraAddressId",
  "returnAddressId",
];

const ADDRESS_TEXT_FIELD_BY_ID: Record<
  AddressField,
  AddressTextField
> = {
  pickupAddressId: "pickupAddressText",
  loadingUnloadingAddressId:
    "loadingUnloadingAddressText",
  extraAddressId: "extraAddressText",
  returnAddressId: "returnAddressText",
};

const MANUAL_KM_FIELDS: readonly ManualKmField[] = [
  "totalKm",
  "billableKm",
];

const ROUTE_CALCULATION_KM_SOURCE = "PTV";
const MANUAL_KM_SOURCE = "MANUAL";

const SETTLEMENT_STATUSES: readonly {
  value: SettlementStatusValue;
  label: string;
}[] = [
  {
    value: "NOT_CHECKED",
    label: "Not checked",
  },
  {
    value: "OK",
    label: "OK",
  },
  {
    value: "UNDERPAID",
    label: "Underpaid",
  },
  {
    value: "OVERPAID",
    label: "Overpaid",
  },
  {
    value: "DISPUTED",
    label: "Disputed",
  },
];

export const COURSE_COLUMNS: readonly CourseColumn[] = [
  {
    key: "truckId",
    label: "Курс",
    width: 220,
  },
  {
    key: "pickupAddressId",
    label: "Маршрут",
    width: 380,
  },
  {
    key: "totalKm",
    label: "Км / Тол",
    width: 190,
  },
  {
    key: "price",
    label: "Финанси",
    width: 230,
  },
  {
    key: "status",
    label: "Статус",
    width: 150,
  },
];

const EDIT_COLUMNS: readonly CourseColumn[] = [
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
    key: "customerTariffId",
    label: "Тарифа",
    width: 210,
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
    key: "settlementAmount",
    label: "Призната сума (€)",
    inputType: "number",
    placeholder: "0.00",
    min: 0,
    step: 0.01,
    width: 150,
  },
  {
    key: "settlementReference",
    label: "Settlement ref",
    placeholder: "Week / statement",
    width: 170,
  },
  {
    key: "settlementStatus",
    label: "Settlement status",
    width: 160,
  },
  {
    key: "settlementNotes",
    label: "Settlement notes",
    placeholder: "Причина за разлика",
    width: 240,
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
  fixedCostAllocationCourseCount: number;
  customerOptions: readonly CustomerOption[];
  addressOptions: readonly AddressOption[];
  onChange: (row: CourseRowData) => void;
  onSave: (row: CourseRowData) => void;
  onDelete: (rowId: number) => void;
};

export default function CourseRow({
  rowNumber,
  initialRow,
  truckOptions,
  fixedCostAllocationCourseCount,
  customerOptions,
  addressOptions,
  onChange,
  onSave,
  onDelete,
}: CourseRowProps) {
  const [draft, setDraft] =
    useState<CourseRowData>(initialRow);

  const [isSaved, setIsSaved] =
    useState(false);

  const [isSaving, setIsSaving] =
    useState(false);

  const [isDeleting, setIsDeleting] =
    useState(false);

  const [saveError, setSaveError] =
    useState<string | null>(null);

  const [
    isCalculatingRoute,
    setIsCalculatingRoute,
  ] = useState(false);

  const [
    routeCalculationError,
    setRouteCalculationError,
  ] = useState<string | null>(null);

  const [
    routeCalculationInfo,
    setRouteCalculationInfo,
  ] = useState<string | null>(null);

  const [isDetailsOpen, setIsDetailsOpen] =
    useState(false);

  const [isEditOpen, setIsEditOpen] =
    useState(initialRow.databaseId === null);

  const selectedCustomer = useMemo(
    () =>
      customerOptions.find(
        (customer) =>
          customer.id === draft.customerId,
      ),
    [customerOptions, draft.customerId],
  );

  const selectableCustomerTariffs = useMemo(
    () =>
      getSelectableTariffsForCourse(
        selectedCustomer,
        draft.courseType,
      ),
    [selectedCustomer, draft.courseType],
  );

  const hasAutomaticTableTariff = useMemo(
    () => hasTableTariff(selectedCustomer),
    [selectedCustomer],
  );

  const selectedCustomerTariff = useMemo(
    () =>
      selectedCustomer?.tariffs.find(
        (tariff) =>
          tariff.id === draft.customerTariffId,
      ),
    [selectedCustomer, draft.customerTariffId],
  );

  const selectedTruck = useMemo(
    () =>
      truckOptions.find(
        (truck) =>
          truck.id === draft.truckId,
      ),
    [truckOptions, draft.truckId],
  );

  const selectedTruckMonthlyFixedCost = useMemo(() => {
    if (!selectedTruck) {
      return 0;
    }

    return (
      selectedTruck.monthlyLeaseCost +
      selectedTruck.monthlyInsuranceCost +
      selectedTruck.monthlyRoadTaxCost +
      selectedTruck.monthlyOtherFixedCost
    );
  }, [selectedTruck]);

  const selectedTruckDailyFixedCost = useMemo(
    () =>
      Math.round(
        (selectedTruckMonthlyFixedCost / 30 + Number.EPSILON) *
          100,
      ) / 100,
    [selectedTruckMonthlyFixedCost],
  );

  const allocatedTruckFixedCost = useMemo(() => {
    const divisor =
      Number.isFinite(fixedCostAllocationCourseCount) &&
      fixedCostAllocationCourseCount > 0
        ? fixedCostAllocationCourseCount
        : 1;

    return (
      Math.round(
        (selectedTruckDailyFixedCost / divisor + Number.EPSILON) *
          100,
      ) / 100
    );
  }, [
    fixedCostAllocationCourseCount,
    selectedTruckDailyFixedCost,
  ]);

  const pricing = useMemo(
    () =>
      resolveCustomerPricing({
        customer: selectedCustomer,
        selectedTariff: selectedCustomerTariff,
        courseType: draft.courseType,
        selectableTariffs: selectableCustomerTariffs,
      }),
    [
      selectedCustomer,
      selectedCustomerTariff,
      draft.courseType,
      selectableCustomerTariffs,
    ],
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
        draft.customerTariffId,
        draft.courseType,
        draft.pickupAddressId,
        draft.pickupAddressText,
        draft.loadingUnloadingAddressId,
        draft.loadingUnloadingAddressText,
        draft.extraAddressId,
        draft.extraAddressText,
        draft.returnAddressId,
        draft.returnAddressText,
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

  const inputWarnings = useMemo(() => {
    const warnings = buildCourseInputWarnings({
      hasCourseData,
      hasSelectedCustomer:
        selectedCustomer !== undefined,
      hasActiveTariff: pricing.hasTariff,
      pricingMethod: pricing.method,
      courseType: draft.courseType,
      totalKm: totalKmValue,
      billableKm: billableKmValue,
      tollValue: draft.tollFee,
    });

    const tariffSelectionWarning =
      buildTariffSelectionWarning({
        customer: selectedCustomer,
        courseType: draft.courseType,
        customerTariffId: draft.customerTariffId,
        selectableTariffs: selectableCustomerTariffs,
      });

    if (tariffSelectionWarning) {
      warnings.push(tariffSelectionWarning);
    }

    return warnings;
  }, [
    hasCourseData,
    selectedCustomer,
    pricing,
    draft.courseType,
    draft.customerTariffId,
    draft.tollFee,
    selectableCustomerTariffs,
    totalKmValue,
    billableKmValue,
  ]);

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

        truckFixedCost:
          allocatedTruckFixedCost,

        /*
         * Предупрежденията се показват отделно и не
         * заменят финансовия статус на курса.
         */
        requiresReview: false,

        settings,
      });
    } catch {
      return null;
    }
  }, [
    draft,
    pricing,
    selectedTruck,
    allocatedTruckFixedCost,
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

  const tableWarnings = displayWarnings.filter(
    (warning) => !shouldHideWarningInCourseOverview(warning),
  );

  const displayStatus: PricingStatus | null =
    calculation?.status ??
    (displayWarnings.length > 0
      ? "NEEDS_REVIEW"
      : null);

  const routeStopCount = useMemo(
    () =>
      buildRouteCalculationStops(
        draft,
        addressOptions,
      ).length,
    [draft, addressOptions],
  );

  const canCalculateRoute =
    routeStopCount >= 2;

  const extraChargesValue =
    calculateExtraCharges(
      calculation?.revenue,
      calculation?.price,
      calculation?.waiting.waitingCost,
    );

  const expectedRevenue =
    calculation?.revenue ??
    effectivePrice;

  const settlementAmountValue =
    parseNullableNumber(
      draft.settlementAmount,
    );

  const settlementDifference =
    calculateSettlementDifference({
      settlementAmount:
        settlementAmountValue,
      expectedRevenue,
    });

  const calculatedSettlementStatus =
    calculateSettlementStatus({
      currentStatus: draft.settlementStatus,
      settlementAmount:
        settlementAmountValue,
      settlementDifference,
    });

  const calculatedRow = useMemo<CourseRowData>(
    () => ({
      ...draft,

      price:
        effectivePrice !== null
          ? formatMoney(effectivePrice)
          : draft.price,

      fuelCost:
        calculation?.costs.fuelCost !== undefined
          ? formatMoney(
              calculation.costs.fuelCost,
            )
          : "",

      totalCost:
        calculation?.costs.totalCost !== undefined
          ? formatMoney(
              calculation.costs.totalCost,
            )
          : "",

      profit:
        calculation?.profit !== null &&
        calculation?.profit !== undefined
          ? formatMoney(calculation.profit)
          : "",

      settlementStatus:
        calculatedSettlementStatus,

      status: displayStatus ?? "",
    }),
    [
      draft,
      effectivePrice,
      calculation,
      displayStatus,
      calculatedSettlementStatus,
    ],
  );

  const hasSavedCourseRecalculationNotice =
    useMemo(
      () =>
        draft.databaseId !== null &&
        !isSaved &&
        hasCalculatedFinancialDifference(
          draft,
          calculatedRow,
        ),
      [draft, calculatedRow, isSaved],
    );

  useEffect(() => {
    onChange(calculatedRow);
  }, [calculatedRow, onChange]);

  const panelId =
    `course-details-panel-${draft.id}`;

  function handleCellChange(
    field: EditableCourseField,
    value: string,
  ): void {
    setDraft((currentDraft) => {
      const nextDraft = {
        ...currentDraft,
        [field]: value,
      };

      if (
        field === "totalKm" ||
        field === "billableKm" ||
        field === "tollFee"
      ) {
        return markRouteValuesAsManual(
          nextDraft,
          field,
        );
      }

      return nextDraft;
    });

    markDraftAsChanged();
  }

  function handleCustomerChange(customerId: string): void {
    const nextCustomer = customerOptions.find(
      (customer) => customer.id === customerId,
    );

    setDraft((currentDraft) => ({
      ...currentDraft,
      customerId,
      customerTariffId: getDefaultCustomerTariffId(
        nextCustomer,
        currentDraft.courseType,
      ),
    }));

    markDraftAsChanged();
  }

  function handleCourseTypeChange(courseType: string): void {
    setDraft((currentDraft) => {
      const currentCustomer = customerOptions.find(
        (customer) =>
          customer.id === currentDraft.customerId,
      );

      const selectableTariffs =
        getSelectableTariffsForCourse(
          currentCustomer,
          courseType,
        );

      const currentTariffIsStillValid =
        selectableTariffs.some(
          (tariff) =>
            tariff.id ===
            currentDraft.customerTariffId,
        );

      return {
        ...currentDraft,
        courseType,
        customerTariffId:
          currentTariffIsStillValid
            ? currentDraft.customerTariffId
            : getDefaultCustomerTariffId(
                currentCustomer,
                courseType,
              ),
      };
    });

    markDraftAsChanged();
  }

  function markDraftAsChanged(): void {
    setIsSaved(false);
    setSaveError(null);
    setRouteCalculationError(null);
    setRouteCalculationInfo(null);
  }

  function handleAddressChange(
    field: AddressField,
    value: AddressSelectionValue,
  ): void {
    const textField = ADDRESS_TEXT_FIELD_BY_ID[field];

    setDraft((currentDraft) => ({
      ...currentDraft,
      [field]: value.addressId,
      [textField]: value.inputValue,
    }));

    setIsSaved(false);
    setSaveError(null);
    setRouteCalculationError(null);
    setRouteCalculationInfo(null);
  }

  async function handleCalculateRoute(): Promise<void> {
    setRouteCalculationError(null);
    setRouteCalculationInfo(null);
    setSaveError(null);

    const routeStops =
      buildRouteCalculationStops(
        draft,
        addressOptions,
      );

    if (routeStops.length < 2) {
      setRouteCalculationError(
        "Избери поне два адреса за изчисляване на маршрут.",
      );
      return;
    }

    setIsCalculatingRoute(true);
    setIsSaved(false);

    try {
      const response = await fetch(
        "/api/routes/calculate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            providerId: "ptv",
            skipCache: false,
            stops: routeStops,
            vehicle: {
              grossWeightKg: 40000,
              axleCount: 5,
              euroClass: "EURO_6",
            },
            currency: "EUR",
            includeCountryBreakdown: true,
          }),
        },
      );

      const responseData =
        (await response
          .json()
          .catch(() => null)) as
          | RouteCalculationApiResponse
          | null;

      if (!response.ok) {
        throw new Error(
          responseData?.error ??
            "Изчисляването на маршрута не можа да бъде изпълнено.",
        );
      }

      const route = responseData?.route;

      if (!route) {
        throw new Error(
          "Маршрутният API не върна резултат.",
        );
      }

      const distanceKm =
        parseApiNumber(route.distanceKm);

      if (distanceKm === null) {
        throw new Error(
          "Маршрутният API не върна валидни километри.",
        );
      }

      const tollCost =
        parseApiNumber(route.tollCost) ?? 0;

      const formattedDistance =
        formatDistanceKm(distanceKm);

      const formattedToll =
        formatMoney(tollCost);

      setDraft((currentDraft) =>
        markRouteValuesAsPtv({
          ...currentDraft,
          totalKm: formattedDistance,
          billableKm:
            currentDraft.billableKm.trim() === "" &&
            shouldAutoFillBillableKm(
              pricing.method,
            )
              ? formattedDistance
              : currentDraft.billableKm,
          tollFee: formattedToll,
        }, {
          distanceKm,
          tollCost,
          cacheHit: route.cache?.hit === true,
          notes: route.notes ?? null,
          warnings: route.warnings ?? [],
        }),
      );

      setRouteCalculationInfo(
        `${formattedDistance} км / ${formattedToll} € тол${
          route.cache?.hit === true ? " / cache" : ""
        }`,
      );
    } catch (error) {
      setRouteCalculationError(
        error instanceof Error
          ? error.message
          : "Изчисляването на маршрута не можа да бъде изпълнено.",
      );
    } finally {
      setIsCalculatingRoute(false);
    }
  }

  async function handleSave(): Promise<void> {
    setIsSaved(false);
    setSaveError(null);

    const validationError =
      validateCourseForSave(draft);

    if (validationError) {
      setSaveError(validationError);
      return;
    }

    const tariffSelectionError =
      validateTariffSelectionForSave(
        selectedCustomer,
        draft,
      );

    if (tariffSelectionError) {
      setSaveError(tariffSelectionError);
      return;
    }

    const totalKm =
      parseRequiredNumber(draft.totalKm);

    const billableKm =
      parseRequiredNumber(draft.billableKm);

    if (
      totalKm === null ||
      billableKm === null
    ) {
      setSaveError(
        "Общите и платимите километри трябва да бъдат валидни числа.",
      );
      return;
    }

    if (
      draft.settlementAmount.trim() !== "" &&
      parseNullableNonNegativeNumber(
        draft.settlementAmount,
      ) === null
    ) {
      setSaveError(
        "Признатата сума трябва да бъде валидно неотрицателно число.",
      );
      return;
    }

    const nonBillableKm = Math.max(
      totalKm - billableKm,
      0,
    );

    const stops = buildCourseStops(
      draft,
      addressOptions,
    );

    const costs = buildCourseCosts({
      truckId: draft.truckId,
      fuelCost:
        calculation?.costs.fuelCost ?? 0,
      tollCost:
        calculation?.costs.tollCost ??
        parseOptionalNumber(draft.tollFee),
      portCost:
        calculation?.costs.portCost ??
        parseOptionalNumber(draft.portFee),
      truckFixedCost:
        calculation?.costs.truckFixedCost ?? 0,
      otherCosts:
        calculation?.costs.otherCosts ?? 0,
    });

    const requestBody = {
      ...(draft.databaseId
        ? { id: draft.databaseId }
        : {}),

      customerId: draft.customerId,
      customerTariffId:
        draft.customerTariffId || null,
      truckId: draft.truckId || null,
      courseType: draft.courseType,

      pickupAddressId:
        draft.pickupAddressId || null,
      deliveryAddressId:
        draft.loadingUnloadingAddressId || null,

      status: "DRAFT",
      containerNumber:
        draft.containerNumber.trim() || null,

      totalKm,
      billableKm,
      nonBillableKm,

      kmSource:
        draft.kmSource.trim() ||
        MANUAL_KM_SOURCE,
      manualKmOverride:
        parseNullableBoolean(
          draft.manualKmOverride,
        ) ?? true,
      kmOverrideNotes:
        draft.kmOverrideNotes.trim() || null,

      agreedPrice: effectivePrice,

      waitingHours:
        parseOptionalNumber(
          draft.waitingMinutes,
        ) / 60,

      waitingAmount:
        calculation?.waiting.waitingCost ?? 0,

      portFeeAmount:
        parseNullableNumber(draft.portFee),

      settlementAmount:
        parseNullableNumber(
          draft.settlementAmount,
        ),
      settlementStatus:
        calculatedSettlementStatus,
      settlementReference:
        draft.settlementReference.trim() ||
        null,
      settlementNotes:
        draft.settlementNotes.trim() || null,

      stops,
      costs,
    };

    setIsSaving(true);

    try {
      const response = await fetch(
        "/api/courses",
        {
          method: draft.databaseId
            ? "PATCH"
            : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        },
      );

      const responseData =
        (await response
          .json()
          .catch(() => null)) as
          | CourseApiResponse
          | null;

      if (!response.ok) {
        throw new Error(
          responseData?.error ??
            "Курсът не можа да бъде записан.",
        );
      }

      const databaseId =
        responseData?.course?.id;

      if (!databaseId) {
        throw new Error(
          "API не върна id на записания курс.",
        );
      }

      const savedRow: CourseRowData = {
        ...calculatedRow,
        databaseId,
        filterDate: resolveSavedCourseDate(
          responseData?.course,
          draft.filterDate,
        ),
        ...buildCourseSnapshotFromApiResponse(
          responseData?.course,
          calculatedRow,
        ),
      };

      setDraft(savedRow);
      onSave(savedRow);
      setIsSaved(true);
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Курсът не можа да бъде записан.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(): Promise<void> {
    if (!draft.databaseId) {
      return;
    }

    const courseLabel =
      draft.containerNumber.trim() ||
      `ред ${rowNumber}`;

    const confirmed = window.confirm(
      `Сигурен ли си, че искаш да изтриеш курс ${courseLabel}? Това действие не може да бъде отменено.`,
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setIsSaved(false);
    setSaveError(null);

    try {
      const response = await fetch(
        `/api/courses?id=${encodeURIComponent(
          draft.databaseId,
        )}`,
        {
          method: "DELETE",
        },
      );

      const responseData =
        (await response
          .json()
          .catch(() => null)) as
          | {
              deleted?: boolean;
              error?: string;
            }
          | null;

      if (!response.ok) {
        throw new Error(
          responseData?.error ??
            "Курсът не можа да бъде изтрит.",
        );
      }

      if (!responseData?.deleted) {
        throw new Error(
          "API не потвърди изтриването на курса.",
        );
      }

      onDelete(draft.id);
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Курсът не можа да бъде изтрит.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  function renderEditorControl(column: CourseColumn) {
    if (column.key === "truckId") {
      return (
        <TruckSelect
          value={draft.truckId}
          trucks={truckOptions}
          rowNumber={rowNumber}
          onChange={(truckId) =>
            handleCellChange("truckId", truckId)
          }
        />
      );
    }

    if (column.key === "customerId") {
      return (
        <CustomerSelect
          value={draft.customerId}
          customers={customerOptions}
          rowNumber={rowNumber}
          onChange={handleCustomerChange}
        />
      );
    }

    if (column.key === "customerTariffId") {
      return (
        <CustomerTariffSelect
          value={draft.customerTariffId}
          tariffs={selectableCustomerTariffs}
          hasCustomer={selectedCustomer !== undefined}
          hasAutomaticTableTariff={hasAutomaticTableTariff}
          rowNumber={rowNumber}
          onChange={(customerTariffId) =>
            handleCellChange(
              "customerTariffId",
              customerTariffId,
            )
          }
        />
      );
    }

    if (column.key === "courseType") {
      return (
        <CourseTypeSelect
          value={draft.courseType}
          rowNumber={rowNumber}
          onChange={handleCourseTypeChange}
        />
      );
    }

    if (isAddressField(column.key)) {
      return (
        <AddressAutocomplete
          value={draft[column.key]}
          inputValue={
            draft[
              ADDRESS_TEXT_FIELD_BY_ID[column.key]
            ]
          }
          addresses={addressOptions}
          label={column.label}
          rowNumber={rowNumber}
          placeholder={column.placeholder}
          onChange={(addressValue) =>
            handleAddressChange(
              column.key as AddressField,
              addressValue,
            )
          }
        />
      );
    }

    if (isManualKmField(column.key)) {
      return (
        <NumberInputWithMarker
          value={draft[column.key]}
          label={column.label}
          rowNumber={rowNumber}
          placeholder={column.placeholder}
          min={column.min}
          step={column.step}
          showMarker={
            draft[column.key].trim() !== ""
          }
          onChange={(value) =>
            handleCellChange(column.key, value)
          }
        />
      );
    }

    if (column.key === "price") {
      return (
        <NumberInputWithMarker
          value={
            pricing.isAutomatic
              ? calculation?.price !== null &&
                calculation?.price !== undefined
                ? formatMoney(calculation.price)
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
          readOnly={pricing.isAutomatic}
          showMarker={
            !pricing.isAutomatic &&
            draft.price.trim() !== ""
          }
          onChange={(value) =>
            handleCellChange("price", value)
          }
        />
      );
    }

    if (column.key === "tollFee") {
      return (
        <NumberInputWithMarker
          value={draft.tollFee}
          label={column.label}
          rowNumber={rowNumber}
          placeholder={column.placeholder}
          min={column.min}
          step={column.step}
          showMarker={draft.tollFee.trim() !== ""}
          onChange={(value) =>
            handleCellChange("tollFee", value)
          }
        />
      );
    }

    if (column.key === "fuelCost") {
      return (
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
          className="h-10 w-full cursor-not-allowed rounded border border-transparent bg-slate-100 px-2 text-slate-500 outline-none"
        />
      );
    }

    if (column.key === "totalCost") {
      return (
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
          className="h-10 w-full cursor-not-allowed rounded border border-transparent bg-slate-100 px-2 text-slate-500 outline-none"
        />
      );
    }

    if (column.key === "profit") {
      return (
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
          className="h-10 w-full cursor-not-allowed rounded border border-transparent bg-slate-100 px-2 text-slate-500 outline-none"
        />
      );
    }

    if (column.key === "settlementStatus") {
      return (
        <SettlementStatusSelect
          value={draft.settlementStatus}
          rowNumber={rowNumber}
          onChange={(value) =>
            handleCellChange(
              "settlementStatus",
              value,
            )
          }
        />
      );
    }

    if (column.key === "status") {
      return (
        <div className="flex h-10 w-full items-center justify-start px-1">
          <StatusBadge status={displayStatus} />
        </div>
      );
    }

    return (
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
          "h-10 w-full rounded-md border px-3 outline-none transition shadow-sm",
          column.readOnly
            ? "cursor-not-allowed border-slate-300 bg-slate-200 text-slate-700"
            : "border-slate-400 bg-white text-slate-950 hover:border-slate-500 focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-200",
        ].join(" ")}
      />
    );
  }

  const truckSummary = selectedTruck
    ? `${selectedTruck.name} — ${selectedTruck.licensePlate}`
    : "—";

  const customerSummary =
    selectedCustomer?.name ?? "—";

  const tariffSummary =
    selectedCustomerTariff !== undefined
      ? formatCustomerTariffOptionLabel(
          selectedCustomerTariff,
        )
      : hasAutomaticTableTariff
        ? "Автоматична тарифна таблица"
        : "—";

  const courseTypeSummary =
    getCourseTypeLabel(draft.courseType) || "—";

  const pickupSummary =
    getAddressLabel(
      addressOptions,
      draft.pickupAddressId,
      draft.pickupAddressText,
    ) || "—";

  const loadingSummary =
    getAddressLabel(
      addressOptions,
      draft.loadingUnloadingAddressId,
      draft.loadingUnloadingAddressText,
    ) || "—";

  const extraSummary = getAddressLabel(
    addressOptions,
    draft.extraAddressId,
    draft.extraAddressText,
  );

  const returnSummary = getAddressLabel(
    addressOptions,
    draft.returnAddressId,
    draft.returnAddressText,
  );

  return (
    <>
      <tr className="group align-top">
        <td
          className={[
            "rounded-l-xl border-y border-l-4 border-r border-slate-400 bg-white px-3 py-4 text-center text-sm font-semibold text-slate-600 shadow-md group-hover:bg-slate-100",
            getCourseRowAccentClass(displayStatus),
          ].join(" ")}
        >
          {rowNumber}
        </td>

        <td className="border-y border-r border-slate-400 bg-white px-3 py-4 shadow-md group-hover:bg-slate-100">
          <div className="space-y-1">
            <SummaryLine
              label="Камион"
              value={truckSummary}
            />
            <SummaryLine
              label="Клиент"
              value={customerSummary}
            />
            <SummaryLine
              label="Тарифа"
              value={tariffSummary}
            />
            <SummaryLine
              label="Тип"
              value={courseTypeSummary}
            />
            {draft.containerNumber.trim() !== "" && (
              <SummaryLine
                label="Контейнер"
                value={draft.containerNumber}
              />
            )}
          </div>
        </td>

        <td className="border-y border-r border-slate-400 bg-white px-3 py-4 shadow-md group-hover:bg-slate-100">
          <div className="space-y-1 text-xs leading-5 text-slate-700">
            <RouteSummaryLine
              label="От"
              value={pickupSummary}
            />
            <RouteSummaryLine
              label="До"
              value={loadingSummary}
            />
            {extraSummary !== "" && (
              <RouteSummaryLine
                label="Екстра"
                value={extraSummary}
              />
            )}
            {returnSummary !== "" && (
              <RouteSummaryLine
                label="Връщане"
                value={returnSummary}
              />
            )}
          </div>
        </td>

        <td className="border-y border-r border-slate-400 bg-white px-3 py-4 shadow-md group-hover:bg-slate-100">
          <div className="space-y-1">
            <SummaryLine
              label="Общо"
              value={
                draft.totalKm.trim() !== ""
                  ? `${draft.totalKm} км`
                  : "—"
              }
            />
            <SummaryLine
              label="Платими"
              value={
                draft.billableKm.trim() !== ""
                  ? `${draft.billableKm} км`
                  : "—"
              }
            />
            <SummaryLine
              label="Тол"
              value={
                draft.tollFee.trim() !== ""
                  ? `${draft.tollFee} €`
                  : "—"
              }
            />
            <SummaryLine
              label="Източник"
              value={getKmSourceLabel(draft)}
            />
          </div>
        </td>

        <td className="border-y border-r border-slate-400 bg-white px-3 py-4 shadow-md group-hover:bg-slate-100">
          <div className="space-y-1">
            <SummaryLine
              label="Цена"
              value={
                effectivePrice !== null
                  ? `${formatMoney(effectivePrice)} €`
                  : draft.price.trim() !== ""
                    ? `${draft.price} €`
                    : "—"
              }
            />
            <SummaryLine
              label="Призната"
              value={
                settlementAmountValue !== null
                  ? `${formatMoney(
                      settlementAmountValue,
                    )} €`
                  : "—"
              }
            />
            <SummaryLine
              label="Разлика"
              value={
                settlementDifference !== null
                  ? `${formatMoney(
                      settlementDifference,
                    )} €`
                  : "—"
              }
              tone={getSettlementDifferenceTone(
                settlementDifference,
              )}
            />
            <SummaryLine
              label="Разход"
              value={
                calculation?.costs.totalCost !==
                undefined
                  ? `${formatMoney(
                      calculation.costs.totalCost,
                    )} €`
                  : "—"
              }
            />
            <SummaryLine
              label="Печалба"
              value={
                calculation?.profit !== null &&
                calculation?.profit !== undefined
                  ? `${formatMoney(
                      calculation.profit,
                    )} €`
                  : "—"
              }
              tone={
                calculation?.profit !== null &&
                calculation?.profit !== undefined
                  ? calculation.profit >= 0
                    ? "positive"
                    : "negative"
                  : "default"
              }
            />
          </div>
        </td>

        <td className="border-y border-r border-slate-400 bg-white px-3 py-4 shadow-md group-hover:bg-slate-100">
          <div className="space-y-2">
            <SettlementStatusBadge
              status={
                calculatedSettlementStatus
              }
            />

            <StatusBadge status={displayStatus} />

            {tableWarnings.length > 0 && (
              <div
                title={tableWarnings.join("\n")}
                className="space-y-1 text-xs text-amber-700"
              >
                <span className="block font-medium">
                  {formatWarningCount(tableWarnings.length)}
                </span>

                <span className="block max-w-[190px] leading-4">
                  {tableWarnings[0]}
                </span>
              </div>
            )}
          </div>
        </td>

        <td className="rounded-r-xl border-y border-r border-slate-400 bg-white px-3 py-4 shadow-md group-hover:bg-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCalculateRoute}
              disabled={
                isCalculatingRoute ||
                isSaving ||
                isDeleting ||
                !canCalculateRoute
              }
              aria-busy={isCalculatingRoute}
              title={
                canCalculateRoute
                  ? "Изчисли маршрут с PTV"
                  : "Избери поне два адреса"
              }
              className="inline-flex h-9 items-center justify-center rounded-md border border-sky-300 bg-sky-50 px-3 text-sm font-medium text-sky-800 transition hover:border-sky-400 hover:bg-sky-100 focus:outline-none focus:ring-2 focus:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCalculatingRoute
                ? "Изчислява..."
                : "Маршрут"}
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || isDeleting}
              aria-busy={isSaving}
              className="inline-flex h-9 items-center justify-center rounded-md bg-slate-900 px-3 text-sm font-medium text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving
                ? "Записване..."
                : draft.databaseId
                  ? "Обнови"
                  : "Запази"}
            </button>

            <button
              type="button"
              aria-expanded={isEditOpen}
              onClick={() =>
                setIsEditOpen(
                  (currentValue) =>
                    !currentValue,
                )
              }
              className="inline-flex h-9 items-center justify-center rounded-md border border-slate-500 bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              {isEditOpen
                ? "Затвори"
                : "Редакция"}
            </button>

            <button
              type="button"
              aria-expanded={isDetailsOpen}
              aria-controls={panelId}
              onClick={() => setIsDetailsOpen(true)}
              className="inline-flex h-9 items-center justify-center rounded-md border border-slate-500 bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              Детайли
            </button>

            {draft.databaseId && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSaving || isDeleting}
                aria-busy={isDeleting}
                className="inline-flex h-9 items-center justify-center rounded-md border border-red-300 bg-white px-3 text-sm font-medium text-red-700 transition hover:border-red-400 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeleting
                  ? "Изтриване..."
                  : "Изтрий"}
              </button>
            )}
          </div>

          <div className="mt-2 space-y-1">
            {isSaved && (
              <span className="block text-xs font-medium text-emerald-600">
                Запазено в базата
              </span>
            )}

            {hasSavedCourseRecalculationNotice && (
              <span className="block rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-medium leading-4 text-amber-800">
                Разходите са преизчислени — натисни Обнови, за да се запишат.
              </span>
            )}

            {saveError && (
              <span className="block text-xs font-medium leading-4 text-red-600">
                {saveError}
              </span>
            )}

            {routeCalculationError && (
              <span className="block text-xs font-medium leading-4 text-red-600">
                {routeCalculationError}
              </span>
            )}

            {routeCalculationInfo &&
              !routeCalculationError && (
                <span className="block text-xs font-medium leading-4 text-sky-700">
                  {routeCalculationInfo}
                </span>
              )}
          </div>
        </td>
      </tr>

      {isEditOpen && (
        <tr className="align-top">
          <td
            colSpan={COURSE_COLUMNS.length + 2}
            className="rounded-xl border-2 border-slate-500 bg-slate-300 px-4 py-4 shadow-lg"
          >
            <div className="rounded-lg border border-slate-500 bg-slate-100 p-4 shadow-lg">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    Редакция на курс #{rowNumber}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Всички полета са тук, без хоризонтално местене.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="inline-flex h-9 items-center justify-center rounded-md border border-slate-500 bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  Затвори редакцията
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {EDIT_COLUMNS.map((column) => (
                  <EditField
                    key={column.key}
                    label={column.label}
                    className={
                      isAddressField(column.key)
                        ? "xl:col-span-2"
                        : ""
                    }
                  >
                    {renderEditorControl(column)}
                  </EditField>
                ))}
              </div>
            </div>
          </td>
        </tr>
      )}

      <CourseDetailsPanel
        isOpen={isDetailsOpen}
        panelId={panelId}
        rowNumber={rowNumber}
        truckLabel={truckSummary === "—" ? "" : truckSummary}
        customerLabel={selectedCustomer?.name ?? ""}
        courseTypeLabel={getCourseTypeLabel(draft.courseType)}
        containerNumber={draft.containerNumber}
        pickupAddressLabel={pickupSummary === "—" ? "" : pickupSummary}
        loadingUnloadingAddressLabel={
          loadingSummary === "—" ? "" : loadingSummary
        }
        extraAddressLabel={extraSummary}
        returnAddressLabel={returnSummary}
        totalKm={totalKmValue}
        billableKm={billableKmValue}
        nonBillableKm={nonBillableKmValue}
        baseClientPrice={effectivePrice}
        pricingSnapshotTariffName={draft.tariffNameAtBooking ?? ""}
        pricingSnapshotTariffType={draft.tariffTypeAtBooking ?? ""}
        pricingSnapshotPricingMethod={draft.pricingMethodAtBooking ?? ""}
        pricingSnapshotPricePerKm={parseNullableNumber(
          draft.pricePerKmAtBooking ?? "",
        )}
        pricingSnapshotFixedPrice={parseNullableNumber(
          draft.fixedPriceAtBooking ?? "",
        )}
        pricingSnapshotWaitingHourlyRate={parseNullableNumber(
          draft.waitingHourlyRateAtBooking ?? "",
        )}
        pricingSnapshotBillableKmLogic={
          draft.billableKmLogicAtBooking ?? ""
        }
        pricingSnapshotPortFeeIncluded={parseNullableBoolean(
          draft.portFeeIncludedAtBooking ?? "",
        )}
        pricingSnapshotCreatedAt={
          draft.pricingSnapshotCreatedAt ?? ""
        }
        waitingMinutes={parseNullableNumber(draft.waitingMinutes)}
        waitingChargedToClient={
          calculation?.waiting.waitingCost ?? null
        }
        extraCharges={extraChargesValue}
        totalRevenue={calculation?.revenue ?? null}
        fuelCost={calculation?.costs.fuelCost ?? null}
        tollCost={
          calculation?.costs.tollCost ??
          parseNullableNumber(draft.tollFee)
        }
        truckCost={calculation?.costs.truckFixedCost ?? null}
        truckDailyFixedCost={selectedTruckDailyFixedCost}
        truckFixedCostAllocationCourseCount={
          fixedCostAllocationCourseCount
        }
        waitingCost={calculation?.waiting.waitingCost ?? null}
        portCost={
          calculation?.costs.portCost ??
          parseNullableNumber(draft.portFee)
        }
        otherCosts={calculation?.costs.otherCosts ?? null}
        totalCost={calculation?.costs.totalCost ?? null}
        profit={calculation?.profit ?? null}
        profitMargin={calculation?.profitMargin ?? null}
        status={displayStatus}
        warnings={displayWarnings}
        onClose={() => setIsDetailsOpen(false)}
      />
    </>
  );
}

function hasCalculatedFinancialDifference(
  savedRow: CourseRowData,
  calculatedRow: CourseRowData,
): boolean {
  const financialFields: readonly (keyof Pick<
    CourseRowData,
    "price" | "fuelCost" | "totalCost" | "profit"
  >)[] = [
    "price",
    "fuelCost",
    "totalCost",
    "profit",
  ];

  return financialFields.some(
    (field) =>
      normalizeFinancialComparisonValue(savedRow[field]) !==
      normalizeFinancialComparisonValue(calculatedRow[field]),
  );
}

function normalizeFinancialComparisonValue(
  value: string,
): string {
  const trimmedValue = value.trim();

  if (trimmedValue === "") {
    return "";
  }

  const parsedValue = Number(trimmedValue);

  if (!Number.isFinite(parsedValue)) {
    return trimmedValue;
  }

  return parsedValue.toFixed(2);
}

function getCourseRowAccentClass(
  status: PricingStatus | null,
): string {
  switch (status) {
    case "PROFITABLE":
      return "border-l-emerald-400";

    case "LOW_PROFIT":
      return "border-l-amber-400";

    case "BREAK_EVEN":
      return "border-l-sky-400";

    case "LOSS":
      return "border-l-red-400";

    case "NEEDS_REVIEW":
      return "border-l-orange-400";

    default:
      return "border-l-slate-300";
  }
}

function shouldHideWarningInCourseOverview(
  warning: string,
): boolean {
  return warning
    .toLocaleLowerCase("en-US")
    .startsWith("vepco round trip:");
}

function formatWarningCount(count: number): string {
  return count === 1
    ? "1 предупреждение"
    : `${count} предупреждения`;
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
          "h-10 w-full rounded-md border px-3 pr-12 outline-none transition shadow-sm",
          readOnly
            ? "cursor-not-allowed border-slate-300 bg-slate-200 text-slate-700"
            : "border-slate-400 bg-white text-slate-950 hover:border-slate-500 focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-200",
        ].join(" ")}
      />

      <ManualMarker
        visible={showMarker}
        fieldLabel={label}
      />
    </div>
  );
}


function SettlementStatusSelect({
  value,
  rowNumber,
  onChange,
}: {
  value: string;
  rowNumber: number;
  onChange: (value: string) => void;
}) {
  return (
    <select
      value={
        isSettlementStatus(value)
          ? value
          : "NOT_CHECKED"
      }
      aria-label={`Settlement status, ред ${rowNumber}`}
      onChange={(event) =>
        onChange(event.target.value)
      }
      className="h-10 w-full rounded-md border border-slate-400 bg-white px-3 text-slate-950 shadow-sm outline-none transition hover:border-slate-500 focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-200"
    >
      {SETTLEMENT_STATUSES.map((status) => (
        <option
          key={status.value}
          value={status.value}
        >
          {status.label}
        </option>
      ))}
    </select>
  );
}

function SettlementStatusBadge({
  status,
}: {
  status: SettlementStatusValue;
}) {
  const label =
    getSettlementStatusLabel(status);

  const className =
    getSettlementStatusClassName(status);

  return (
    <span
      className={[
        "inline-flex rounded-full border px-2 py-1 text-xs font-semibold",
        className,
      ].join(" ")}
    >
      {label}
    </span>
  );
}

type SummaryTone = "default" | "positive" | "negative";

function SummaryLine({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: SummaryTone;
}) {
  return (
    <div className="flex items-start justify-between gap-2 text-xs leading-5">
      <span className="shrink-0 text-slate-500">
        {label}
      </span>
      <span
        className={[
          "min-w-0 break-words text-right font-medium",
          tone === "positive"
            ? "text-emerald-700"
            : tone === "negative"
              ? "text-red-700"
              : "text-slate-900",
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  );
}

function RouteSummaryLine({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="grid grid-cols-[56px_1fr] gap-2">
      <span className="text-slate-500">{label}</span>
      <span className="min-w-0 break-words font-medium text-slate-900">
        {value}
      </span>
    </div>
  );
}

function EditField({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label
      className={[
        "flex min-w-0 flex-col gap-1.5 text-sm font-semibold text-slate-800",
        className,
      ].join(" ")}
    >
      <span>{label}</span>
      {children}
    </label>
  );
}

function markRouteValuesAsPtv(
  row: CourseRowData,
  routeResult: {
    distanceKm: number;
    tollCost: number;
    cacheHit: boolean;
    notes: string | null;
    warnings: readonly string[];
  },
): CourseRowData {
  return {
    ...row,
    kmSource: ROUTE_CALCULATION_KM_SOURCE,
    manualKmOverride: "false",
    kmOverrideNotes:
      buildPtvKmOverrideNotes(routeResult),
  };
}

function markRouteValuesAsManual(
  row: CourseRowData,
  changedField: EditableCourseField,
): CourseRowData {
  return {
    ...row,
    kmSource: MANUAL_KM_SOURCE,
    manualKmOverride: "true",
    kmOverrideNotes:
      buildManualKmOverrideNotes(
        changedField,
      ),
  };
}

function buildPtvKmOverrideNotes({
  distanceKm,
  tollCost,
  cacheHit,
  notes,
  warnings,
}: {
  distanceKm: number;
  tollCost: number;
  cacheHit: boolean;
  notes: string | null;
  warnings: readonly string[];
}): string {
  return [
    `Route calculated by PTV at ${new Date().toISOString()}.`,
    `Distance: ${formatDistanceKm(distanceKm)} km.`,
    `Toll: ${formatMoney(tollCost)} EUR.`,
    `Cache hit: ${cacheHit ? "yes" : "no"}.`,
    notes ? `PTV notes: ${notes}` : null,
    warnings.length > 0
      ? `PTV warnings: ${warnings.join(" | ")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildManualKmOverrideNotes(
  changedField: EditableCourseField,
): string {
  return [
    `Route values changed manually at ${new Date().toISOString()}.`,
    `Changed field: ${changedField}.`,
  ].join("\n");
}

function getKmSourceLabel(
  row: CourseRowData,
): string {
  const kmSource =
    row.kmSource.trim() ||
    MANUAL_KM_SOURCE;

  const isManualOverride =
    parseNullableBoolean(
      row.manualKmOverride,
    ) ?? true;

  if (
    kmSource === ROUTE_CALCULATION_KM_SOURCE &&
    !isManualOverride
  ) {
    return "PTV";
  }

  if (
    kmSource === ROUTE_CALCULATION_KM_SOURCE &&
    isManualOverride
  ) {
    return "PTV + ръчна промяна";
  }

  return "Ръчно";
}

function buildRouteCalculationStops(
  row: CourseRowData,
  addresses: readonly AddressOption[],
): RouteCalculationStopPayload[] {
  const candidates = [
    {
      addressId: row.pickupAddressId,
      addressText: row.pickupAddressText,
    },
    {
      addressId:
        row.loadingUnloadingAddressId,
      addressText:
        row.loadingUnloadingAddressText,
    },
    {
      addressId: row.extraAddressId,
      addressText: row.extraAddressText,
    },
    {
      addressId: row.returnAddressId,
      addressText: row.returnAddressText,
    },
  ].filter((candidate) =>
    hasAddressValue(
      candidate.addressId,
      candidate.addressText,
    ),
  );

  return candidates.map((candidate, index) => {
    const selectedAddress = getAddressById(
      addresses,
      candidate.addressId,
    );

    return {
      type: getRouteStopType(
        index,
        candidates.length,
      ),
      addressId:
        candidate.addressId.trim() || null,
      label:
        getAddressLabel(
          addresses,
          candidate.addressId,
          candidate.addressText,
        ) || null,
      coordinate:
        buildRouteCalculationCoordinate(
          selectedAddress,
        ),
    };
  });
}

function buildRouteCalculationCoordinate(
  address: AddressOption | null,
): RouteCalculationCoordinate | null {
  if (
    !address ||
    address.latitude === null ||
    address.longitude === null
  ) {
    return null;
  }

  if (
    !Number.isFinite(address.latitude) ||
    !Number.isFinite(address.longitude)
  ) {
    return null;
  }

  return {
    latitude: address.latitude,
    longitude: address.longitude,
  };
}

function getAddressById(
  addresses: readonly AddressOption[],
  addressId: string,
): AddressOption | null {
  const normalizedAddressId =
    addressId.trim();

  if (normalizedAddressId === "") {
    return null;
  }

  return (
    addresses.find(
      (option) =>
        option.id === normalizedAddressId,
    ) ?? null
  );
}

function getRouteStopType(
  index: number,
  stopCount: number,
): RouteCalculationStopPayload["type"] {
  if (index === 0) {
    return "ORIGIN";
  }

  if (index === stopCount - 1) {
    return "DESTINATION";
  }

  return "VIA";
}

function shouldAutoFillBillableKm(
  pricingMethod: CoursePricingMethod,
): boolean {
  return pricingMethod !== "VEPCO";
}

function parseApiNumber(
  value: number | string | null | undefined,
): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const parsedValue = Number(value);

  return Number.isFinite(parsedValue)
    ? parsedValue
    : null;
}

function formatDistanceKm(value: number): string {
  const roundedValue =
    Math.round(value * 100) / 100;

  return Number.isInteger(roundedValue)
    ? String(roundedValue)
    : String(roundedValue);
}

function resolveCustomerPricing({
  customer,
  selectedTariff,
  courseType,
  selectableTariffs,
}: {
  customer: CustomerOption | undefined;
  selectedTariff: CustomerTariffOption | undefined;
  courseType: string;
  selectableTariffs: readonly CustomerTariffOption[];
}): ResolvedPricing {
  if (!customer) {
    return {
      method: "MANUAL",
      pricePerKm: null,
      fixedPrice: null,
      isAutomatic: false,
      hasTariff: false,
    };
  }

  if (selectedTariff) {
    return resolvePricingFromTariff(selectedTariff);
  }

  if (selectableTariffs.length === 1) {
    const onlyTariff = selectableTariffs[0];

    if (onlyTariff) {
      return resolvePricingFromTariff(onlyTariff);
    }
  }

  if (selectableTariffs.length > 1) {
    return {
      method: "MANUAL",
      pricePerKm: null,
      fixedPrice: null,
      isAutomatic: false,
      hasTariff: true,
    };
  }

  if (courseType === "SHUNT") {
    const shuntTariff = customer.tariffs.find(
      (tariff) =>
        tariff.type === "SHUNT" &&
        tariff.fixedPrice !== null,
    );

    if (shuntTariff) {
      return resolvePricingFromTariff(shuntTariff);
    }
  }

  const tableTariff = customer.tariffs.find(
    (tariff) => isTableTariff(tariff),
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

  return {
    method: "MANUAL",
    pricePerKm: null,
    fixedPrice: null,
    isAutomatic: false,
    hasTariff: false,
  };
}

function resolvePricingFromTariff(
  tariff: CustomerTariffOption,
): ResolvedPricing {
  if (
    tariff.type === "PRICE_PER_KM" &&
    tariff.pricePerKm !== null
  ) {
    return {
      method: "MSI",
      pricePerKm: tariff.pricePerKm,
      fixedPrice: null,
      isAutomatic: true,
      hasTariff: true,
    };
  }

  if (
    (tariff.type === "FIXED_PRICE" || tariff.type === "SHUNT") &&
    tariff.fixedPrice !== null
  ) {
    return {
      method: "FIXED_PRICE",
      pricePerKm: null,
      fixedPrice: tariff.fixedPrice,
      isAutomatic: true,
      hasTariff: true,
    };
  }

  if (isTableTariff(tariff)) {
    return {
      method: "VEPCO",
      pricePerKm: null,
      fixedPrice: null,
      isAutomatic: true,
      hasTariff: true,
    };
  }

  return {
    method: "MANUAL",
    pricePerKm: null,
    fixedPrice: null,
    isAutomatic: false,
    hasTariff: true,
  };
}

function getSelectableTariffsForCourse(
  customer: CustomerOption | undefined,
  courseType: string,
): CustomerTariffOption[] {
  if (!customer) {
    return [];
  }

  if (courseType === "SHUNT") {
    const shuntTariffs = customer.tariffs.filter(
      (tariff) =>
        tariff.type === "SHUNT" &&
        tariff.fixedPrice !== null,
    );

    if (shuntTariffs.length > 0) {
      return shuntTariffs;
    }
  }

  return customer.tariffs.filter((tariff) =>
    isCourseSelectableTariff(tariff),
  );
}

function isCourseSelectableTariff(
  tariff: CustomerTariffOption,
): boolean {
  if (
    tariff.type === "PRICE_PER_KM" &&
    tariff.pricePerKm !== null
  ) {
    return true;
  }

  if (
    tariff.type === "FIXED_PRICE" &&
    tariff.fixedPrice !== null
  ) {
    return true;
  }

  if (tariff.type === "MANUAL") {
    return true;
  }

  return false;
}

function getDefaultCustomerTariffId(
  customer: CustomerOption | undefined,
  courseType: string,
): string {
  const selectableTariffs = getSelectableTariffsForCourse(
    customer,
    courseType,
  );

  if (selectableTariffs.length !== 1) {
    return "";
  }

  return selectableTariffs[0]?.id ?? "";
}

function hasTableTariff(
  customer: CustomerOption | undefined,
): boolean {
  return (
    customer?.tariffs.some((tariff) =>
      isTableTariff(tariff),
    ) ?? false
  );
}

function isTableTariff(
  tariff: CustomerTariffOption,
): boolean {
  return (
    tariff.type === "FIXED_TABLE_UPPER_BOUND" ||
    tariff.type === "DISTANCE_TABLE"
  );
}

function buildTariffSelectionWarning({
  customer,
  courseType,
  customerTariffId,
  selectableTariffs,
}: {
  customer: CustomerOption | undefined;
  courseType: string;
  customerTariffId: string;
  selectableTariffs: readonly CustomerTariffOption[];
}): string | null {
  if (!customer) {
    return null;
  }

  if (customerTariffId.trim() !== "") {
    const selectedTariff = customer.tariffs.find(
      (tariff) => tariff.id === customerTariffId,
    );

    if (!selectedTariff) {
      return "Избраната тарифа не принадлежи на избрания клиент.";
    }

    const selectedTariffIsValidForCourse =
      selectableTariffs.some(
        (tariff) => tariff.id === customerTariffId,
      );

    if (
      !selectedTariffIsValidForCourse &&
      !isTableTariff(selectedTariff)
    ) {
      return "Избраната тарифа не е валидна за този тип курс.";
    }

    return null;
  }

  if (selectableTariffs.length > 1) {
    return "Клиентът има повече от една активна тарифа. Избери конкретна тарифа.";
  }

  if (
    selectableTariffs.length === 0 &&
    !hasTableTariff(customer) &&
    courseType.trim() !== ""
  ) {
    return "Клиентът няма активна тарифа за този тип курс.";
  }

  return null;
}

function calculateSettlementDifference({
  settlementAmount,
  expectedRevenue,
}: {
  settlementAmount: number | null;
  expectedRevenue: number | null;
}): number | null {
  if (
    settlementAmount === null ||
    expectedRevenue === null
  ) {
    return null;
  }

  return roundMoney(
    settlementAmount - expectedRevenue,
  );
}

function calculateSettlementStatus({
  currentStatus,
  settlementAmount,
  settlementDifference,
}: {
  currentStatus: string;
  settlementAmount: number | null;
  settlementDifference: number | null;
}): SettlementStatusValue {
  if (currentStatus === "DISPUTED") {
    return "DISPUTED";
  }

  if (settlementAmount === null) {
    return "NOT_CHECKED";
  }

  if (settlementDifference === null) {
    return "NOT_CHECKED";
  }

  if (Math.abs(settlementDifference) < 0.01) {
    return "OK";
  }

  return settlementDifference < 0
    ? "UNDERPAID"
    : "OVERPAID";
}

function getSettlementDifferenceTone(
  difference: number | null,
): SummaryTone {
  if (difference === null) {
    return "default";
  }

  if (difference < -0.005) {
    return "negative";
  }

  if (difference > 0.005) {
    return "positive";
  }

  return "default";
}

function getSettlementStatusLabel(
  status: SettlementStatusValue,
): string {
  switch (status) {
    case "NOT_CHECKED":
      return "Not checked";

    case "OK":
      return "OK";

    case "UNDERPAID":
      return "Underpaid";

    case "OVERPAID":
      return "Overpaid";

    case "DISPUTED":
      return "Disputed";

    default:
      return status;
  }
}

function getSettlementStatusClassName(
  status: SettlementStatusValue,
): string {
  switch (status) {
    case "OK":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "UNDERPAID":
      return "border-red-200 bg-red-50 text-red-700";

    case "OVERPAID":
      return "border-sky-200 bg-sky-50 text-sky-700";

    case "DISPUTED":
      return "border-purple-200 bg-purple-50 text-purple-700";

    case "NOT_CHECKED":
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

function isSettlementStatus(
  value: string,
): value is SettlementStatusValue {
  return SETTLEMENT_STATUSES.some(
    (status) => status.value === value,
  );
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

function parseNullableNonNegativeNumber(
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

function parseNullableBoolean(
  value: string,
): boolean | null {
  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return null;
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
  addressText: string,
): string {
  if (addressId.trim() === "") {
    return addressText.trim();
  }

  const address = addresses.find(
    (option) => option.id === addressId,
  );

  if (!address) {
    return addressText.trim();
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

type BuildCourseCostsInput = {
  truckId: string;
  fuelCost: number;
  tollCost: number;
  portCost: number;
  truckFixedCost: number;
  otherCosts: number;
};

function validateCourseForSave(
  row: CourseRowData,
): string | null {
  if (row.truckId.trim() === "") {
    return "Избери камион.";
  }

  if (row.customerId.trim() === "") {
    return "Избери клиент.";
  }

  if (
    row.courseType !== "ROUND_TRIP" &&
    row.courseType !== "SHUNT"
  ) {
    return "Избери тип на курса.";
  }

  if (
    !hasAddressValue(
      row.pickupAddressId,
      row.pickupAddressText,
    )
  ) {
    return "Избери или въведи адрес за взимане.";
  }

  if (
    !hasAddressValue(
      row.loadingUnloadingAddressId,
      row.loadingUnloadingAddressText,
    )
  ) {
    return "Избери или въведи адрес за товарене или разтоварване.";
  }

  if (parseRequiredNumber(row.totalKm) === null) {
    return "Въведи общите километри.";
  }

  if (
    parseRequiredNumber(row.billableKm) === null
  ) {
    return "Въведи платимите километри.";
  }

  return null;
}

function validateTariffSelectionForSave(
  customer: CustomerOption | undefined,
  row: CourseRowData,
): string | null {
  if (!customer) {
    return null;
  }

  const selectableTariffs = getSelectableTariffsForCourse(
    customer,
    row.courseType,
  );

  return buildTariffSelectionWarning({
    customer,
    courseType: row.courseType,
    customerTariffId: row.customerTariffId,
    selectableTariffs,
  });
}


function buildCourseStops(
  row: CourseRowData,
  addresses: readonly AddressOption[],
): CourseStopPayload[] {
  const candidates = [
    {
      type: "PICKUP" as const,
      addressId: row.pickupAddressId,
      addressText: row.pickupAddressText,
    },
    {
      type: "LOAD_UNLOAD" as const,
      addressId:
        row.loadingUnloadingAddressId,
      addressText:
        row.loadingUnloadingAddressText,
    },
    {
      type: "EXTRA" as const,
      addressId: row.extraAddressId,
      addressText: row.extraAddressText,
    },
    {
      type: "RETURN" as const,
      addressId: row.returnAddressId,
      addressText: row.returnAddressText,
    },
  ];

  return candidates
    .filter((candidate) =>
      hasAddressValue(
        candidate.addressId,
        candidate.addressText,
      ),
    )
    .map((candidate, index) => {
      const selectedAddressName =
        getAddressName(
          addresses,
          candidate.addressId,
        );

      const freeText =
        candidate.addressText.trim();

      return {
        sequence: index + 1,
        type: candidate.type,
        addressId:
          candidate.addressId.trim() || null,
        addressText:
          candidate.addressId.trim() !== ""
            ? null
            : freeText || null,
        label:
          (selectedAddressName ?? freeText) ||
          null,
        notes: null,
      };
    });
}

function hasAddressValue(
  addressId: string,
  addressText: string,
): boolean {
  return (
    addressId.trim() !== "" ||
    addressText.trim() !== ""
  );
}

function buildCourseCosts({
  truckId,
  fuelCost,
  tollCost,
  portCost,
  truckFixedCost,
  otherCosts,
}: BuildCourseCostsInput): CourseCostPayload[] {
  const costs: CourseCostPayload[] = [];

  addCourseCost(
    costs,
    truckId,
    "FUEL",
    "Гориво",
    fuelCost,
  );

  addCourseCost(
    costs,
    truckId,
    "TOLL",
    "Пътни такси",
    tollCost,
  );

  addCourseCost(
    costs,
    truckId,
    "PORT_FEE",
    "Пристанищна такса",
    portCost,
  );

  addCourseCost(
    costs,
    truckId,
    "OTHER",
    "Фиксиран разход за камиона",
    truckFixedCost,
  );

  addCourseCost(
    costs,
    truckId,
    "OTHER",
    "Други разходи",
    otherCosts,
  );

  return costs;
}

function addCourseCost(
  costs: CourseCostPayload[],
  truckId: string,
  type: CourseCostPayload["type"],
  description: string,
  amount: number,
): void {
  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    return;
  }

  costs.push({
    truckId: truckId || null,
    type,
    description,
    amount: roundMoney(amount),
    notes: null,
  });
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function getAddressName(
  addresses: readonly AddressOption[],
  addressId: string,
): string | null {
  const address = addresses.find(
    (option) => option.id === addressId,
  );

  return address?.name ?? null;
}

function buildCourseSnapshotFromApiResponse(
  course:
    | CourseApiResponse["course"]
    | undefined,
  fallbackRow: CourseRowData,
): Pick<
  CourseRowData,
  | "tariffNameAtBooking"
  | "tariffTypeAtBooking"
  | "pricingMethodAtBooking"
  | "pricePerKmAtBooking"
  | "fixedPriceAtBooking"
  | "waitingHourlyRateAtBooking"
  | "billableKmLogicAtBooking"
  | "portFeeIncludedAtBooking"
  | "pricingSnapshotCreatedAt"
  | "settlementAmount"
  | "settlementStatus"
  | "settlementCheckedAt"
  | "settlementReference"
  | "settlementNotes"
> {
  return {
    tariffNameAtBooking:
      course?.tariffNameAtBooking ??
      fallbackRow.tariffNameAtBooking ??
      "",
    tariffTypeAtBooking:
      course?.tariffTypeAtBooking ??
      fallbackRow.tariffTypeAtBooking ??
      "",
    pricingMethodAtBooking:
      course?.pricingMethodAtBooking ??
      fallbackRow.pricingMethodAtBooking ??
      "",
    pricePerKmAtBooking:
      formatApiSnapshotNumber(
        course?.pricePerKmAtBooking,
        fallbackRow.pricePerKmAtBooking,
      ),
    fixedPriceAtBooking:
      formatApiSnapshotNumber(
        course?.fixedPriceAtBooking,
        fallbackRow.fixedPriceAtBooking,
      ),
    waitingHourlyRateAtBooking:
      formatApiSnapshotNumber(
        course?.waitingHourlyRateAtBooking,
        fallbackRow.waitingHourlyRateAtBooking,
      ),
    billableKmLogicAtBooking:
      course?.billableKmLogicAtBooking ??
      fallbackRow.billableKmLogicAtBooking ??
      "",
    portFeeIncludedAtBooking:
      course?.portFeeIncludedAtBooking === null ||
      course?.portFeeIncludedAtBooking === undefined
        ? fallbackRow.portFeeIncludedAtBooking ?? ""
        : String(course.portFeeIncludedAtBooking),
    pricingSnapshotCreatedAt:
      course?.pricingSnapshotCreatedAt ??
      fallbackRow.pricingSnapshotCreatedAt ??
      "",

    settlementAmount:
      formatApiMoney(
        course?.settlementAmount,
        fallbackRow.settlementAmount,
      ),
    settlementStatus:
      course?.settlementStatus ??
      fallbackRow.settlementStatus ??
      "NOT_CHECKED",
    settlementCheckedAt:
      course?.settlementCheckedAt ??
      fallbackRow.settlementCheckedAt ??
      "",
    settlementReference:
      course?.settlementReference ??
      fallbackRow.settlementReference ??
      "",
    settlementNotes:
      course?.settlementNotes ??
      fallbackRow.settlementNotes ??
      "",
  };
}

function formatApiMoney(
  value: number | string | null | undefined,
  fallbackValue: string | undefined,
): string {
  if (value === null || value === undefined || value === "") {
    return fallbackValue ?? "";
  }

  const parsedValue = Number(value);

  return Number.isFinite(parsedValue)
    ? formatMoney(parsedValue)
    : fallbackValue ?? "";
}

function formatApiSnapshotNumber(
  value: number | string | null | undefined,
  fallbackValue: string | undefined,
): string {
  if (value === null || value === undefined || value === "") {
    return fallbackValue ?? "";
  }

  const parsedValue = Number(value);

  return Number.isFinite(parsedValue)
    ? String(parsedValue)
    : fallbackValue ?? "";
}

function resolveSavedCourseDate(
  course:
    | CourseApiResponse["course"]
    | undefined,
  fallbackDate: string,
): string {
  const sourceDate =
    course?.plannedDate ??
    course?.createdAt;

  if (
    typeof sourceDate === "string" &&
    sourceDate.length >= 10
  ) {
    return sourceDate.slice(0, 10);
  }

  if (fallbackDate.trim() !== "") {
    return fallbackDate;
  }

  const now = new Date();

  const timezoneOffset =
    now.getTimezoneOffset() * 60_000;

  return new Date(
    now.getTime() - timezoneOffset,
  )
    .toISOString()
    .slice(0, 10);
}