"use client";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";

import type { AddressOption } from "./AddressAutocomplete";
import CourseRow, {
  COURSE_COLUMNS,
  type CourseRowData,
} from "./CourseRow";
import CourseSummaryBar, {
  type CourseSummaryValues,
} from "./CourseSummaryBar";
import type { CustomerOption } from "./CustomerSelect";
import type { TruckOption } from "./TruckSelect";

type CourseTableProps = {
  trucks: readonly TruckOption[];
  customers: readonly CustomerOption[];
  addresses: readonly AddressOption[];
  initialCourses: readonly CourseRowData[];
};

function createEmptyCourseRow(
  id: number,
): CourseRowData {
  return {
    id,
    databaseId: null,
    filterDate: getTodayDate(),

    truckId: "",
    customerId: "",
    customerTariffId: "",
    courseType: "",

    pickupAddressId: "",
    pickupAddressText: "",

    loadingUnloadingAddressId: "",
    loadingUnloadingAddressText: "",

    extraAddressId: "",
    extraAddressText: "",

    returnAddressId: "",
    returnAddressText: "",

    totalKm: "",
    billableKm: "",

    kmSource: "MANUAL",
    manualKmOverride: "true",
    kmOverrideNotes: "",

    containerNumber: "",
    waitingMinutes: "",

    price: "",
    tollFee: "",
    portFee: "",

    settlementAmount: "",
    settlementStatus: "NOT_CHECKED",
    settlementCheckedAt: "",
    settlementReference: "",
    settlementNotes: "",

    fuelCost: "",
    totalCost: "",
    profit: "",
    status: "",
  };
}

export default function CourseTable({
  trucks,
  customers,
  addresses,
  initialCourses,
}: CourseTableProps) {
  const firstEmptyRowId =
    getNextRowId(initialCourses);

  const nextRowId = useRef(
    firstEmptyRowId + 1,
  );

  const [rows, setRows] = useState<
    CourseRowData[]
  >(() => [
    ...initialCourses,
    createEmptyCourseRow(firstEmptyRowId),
  ]);

  const [dateFrom, setDateFrom] =
    useState("");

  const [dateTo, setDateTo] =
    useState("");

  const [isExporting, setIsExporting] =
    useState(false);

  const [exportError, setExportError] =
    useState<string | null>(null);

  const fixedCostAllocationCounts = useMemo(
    () => buildFixedCostAllocationCounts(rows),
    [rows],
  );

  const visibleRows = useMemo(
    () =>
      rows.filter((row) => {
        /*
         * Празните редове винаги остават видими,
         * за да може да се въвежда нов курс.
         */
        if (row.databaseId === null) {
          return true;
        }

        if (
          dateFrom !== "" &&
          row.filterDate < dateFrom
        ) {
          return false;
        }

        if (
          dateTo !== "" &&
          row.filterDate > dateTo
        ) {
          return false;
        }

        return true;
      }),
    [rows, dateFrom, dateTo],
  );

  const savedCoursesCount = rows.filter(
    (row) => row.databaseId !== null,
  ).length;

  const visibleSavedRows = useMemo(
    () =>
      visibleRows.filter(
        (row) => row.databaseId !== null,
      ),
    [visibleRows],
  );

  const visibleSavedCoursesCount =
    visibleSavedRows.length;

  const settlementSummary = useMemo(
    () =>
      calculateSettlementSummary(
        visibleSavedRows,
      ),
    [visibleSavedRows],
  );

  const summary = useMemo(
    () =>
      calculateCourseSummary(
        visibleSavedRows,
      ),
    [visibleSavedRows],
  );

  function handleAddRow(): void {
    const newRowId = nextRowId.current;

    nextRowId.current += 1;

    setRows((currentRows) => [
      ...currentRows,
      createEmptyCourseRow(newRowId),
    ]);
  }

  const handleRowChange = useCallback(
    (changedRow: CourseRowData): void => {
      setRows((currentRows) =>
        currentRows.map((row) =>
          row.id === changedRow.id
            ? changedRow
            : row,
        ),
      );
    },
    [],
  );

  const handleSaveRow = useCallback(
    (savedRow: CourseRowData): void => {
      setRows((currentRows) =>
        currentRows.map((row) =>
          row.id === savedRow.id
            ? savedRow
            : row,
        ),
      );
    },
    [],
  );

  const handleDeleteRow = useCallback(
    (rowId: number): void => {
      setRows((currentRows) =>
        currentRows.filter(
          (row) => row.id !== rowId,
        ),
      );
    },
    [],
  );

  async function handleExport(): Promise<void> {
    if (visibleSavedRows.length === 0) {
      setExportError(
        "Няма записани курсове за експорт.",
      );
      return;
    }

    setIsExporting(true);
    setExportError(null);

    try {
      const exportRows = visibleSavedRows.map(
        (row) =>
          buildCourseExcelExportRow({
            row,
            trucks,
            customers,
            addresses,
          }),
      );

      const response = await fetch(
        "/api/courses/export",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            rows: exportRows,
            dateFrom:
              dateFrom || null,
            dateTo:
              dateTo || null,
          }),
        },
      );

      if (!response.ok) {
        const responseData =
          (await response
            .json()
            .catch(() => null)) as
            | {
                error?: string;
              }
            | null;

        throw new Error(
          responseData?.error ??
            "Excel файлът не можа да бъде създаден.",
        );
      }

      const fileBlob =
        await response.blob();

      const fileName =
        getDownloadFileName(
          response.headers.get(
            "Content-Disposition",
          ),
        ) ??
        `saleks-courses-${getTodayDate()}.xlsx`;

      downloadBlob(
        fileBlob,
        fileName,
      );
    } catch (error) {
      setExportError(
        error instanceof Error
          ? error.message
          : "Excel файлът не можа да бъде създаден.",
      );
    } finally {
      setIsExporting(false);
    }
  }

  function handleClearFilters(): void {
    setDateFrom("");
    setDateTo("");
    setExportError(null);
  }

  return (
    <section className="min-w-0 space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Курсове
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Добавяне и управление на транспортни курсове.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            От дата
            <input
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(event) =>
                setDateFrom(
                  event.target.value,
                )
              }
              className="h-10 rounded-md border border-slate-400 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            До дата
            <input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(event) =>
                setDateTo(
                  event.target.value,
                )
              }
              className="h-10 rounded-md border border-slate-400 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />
          </label>

          <button
            type="button"
            onClick={handleClearFilters}
            disabled={
              dateFrom === "" &&
              dateTo === ""
            }
            className="inline-flex h-10 items-center justify-center rounded-md border border-slate-400 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Изчисти филтъра
          </button>

          <button
            type="button"
            onClick={handleExport}
            disabled={
              isExporting ||
              visibleSavedRows.length === 0
            }
            aria-busy={isExporting}
            className="inline-flex h-10 items-center justify-center rounded-md border border-emerald-300 bg-emerald-50 px-4 text-sm font-medium text-emerald-800 transition hover:border-emerald-400 hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isExporting
              ? "Експортиране..."
              : "Експорт Excel"}
          </button>

          <button
            type="button"
            onClick={handleAddRow}
            className="inline-flex h-10 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            Add Row
          </button>
        </div>
      </div>

      <CourseSummaryBar summary={summary} />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
        <span>
          Показани записани курсове:{" "}
          <strong className="text-slate-900">
            {visibleSavedCoursesCount}
          </strong>
        </span>

        <span>
          Общо записани:{" "}
          <strong className="text-slate-900">
            {savedCoursesCount}
          </strong>
        </span>

        <span>
          Settlement checked:{" "}
          <strong className="text-slate-900">
            {settlementSummary.checked}
          </strong>
        </span>

        <span>
          Underpaid:{" "}
          <strong className="text-red-700">
            {settlementSummary.underpaid}
          </strong>
        </span>

        {(dateFrom !== "" ||
          dateTo !== "") && (
          <span className="font-medium text-sky-700">
            Активен филтър по дата
          </span>
        )}
      </div>

      {exportError && (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700"
        >
          {exportError}
        </p>
      )}

      <div className="w-full min-w-0 overflow-x-auto rounded-xl border border-slate-400 bg-slate-300 p-2 shadow-sm">
        <table className="w-full table-fixed border-separate border-spacing-y-3 text-sm">
          <thead className="bg-transparent">
            <tr>
              <th className="w-14 rounded-l-lg border-y border-l border-r border-slate-400 bg-slate-300 px-3 py-3 text-center font-semibold text-slate-700">
                #
              </th>

              {COURSE_COLUMNS.map(
                (column) => (
                  <th
                    key={column.key}
                    style={{
                      width: column.width,
                      minWidth:
                        column.width,
                    }}
                    className="whitespace-nowrap border-y border-r border-slate-400 bg-slate-300 px-3 py-3 text-left font-semibold text-slate-700"
                  >
                    {column.label}
                  </th>
                ),
              )}

              <th className="w-[220px] whitespace-nowrap rounded-r-lg border-y border-r border-slate-400 bg-slate-300 px-3 py-3 text-left font-semibold text-slate-700">
                Действия
              </th>
            </tr>
          </thead>

          <tbody>
            {visibleRows.map(
              (row, rowIndex) => (
                <CourseRow
                  key={row.id}
                  rowNumber={
                    rowIndex + 1
                  }
                  initialRow={row}
                  truckOptions={trucks}
                  fixedCostAllocationCourseCount={
                    getFixedCostAllocationCourseCount(
                      fixedCostAllocationCounts,
                      row,
                    )
                  }
                  customerOptions={
                    customers
                  }
                  addressOptions={
                    addresses
                  }
                  onChange={
                    handleRowChange
                  }
                  onSave={
                    handleSaveRow
                  }
                  onDelete={
                    handleDeleteRow
                  }
                />
              ),
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-500">
        Таблицата показва кратък преглед на курсовете. Натисни Редакция, за да отвориш всички полета на реда без хоризонтално местене. Филтърът използва планираната дата, а когато тя липсва — датата на създаване на курса.
      </p>
    </section>
  );
}


function buildFixedCostAllocationCounts(
  rows: readonly CourseRowData[],
): Map<string, number> {
  const counts = new Map<string, number>();

  for (const row of rows) {
    const key =
      createFixedCostAllocationKey(row);

    if (
      !key ||
      !isFixedCostAllocationRelevantRow(row)
    ) {
      continue;
    }

    counts.set(
      key,
      (counts.get(key) ?? 0) + 1,
    );
  }

  return counts;
}

function getFixedCostAllocationCourseCount(
  counts: ReadonlyMap<string, number>,
  row: CourseRowData,
): number {
  const key =
    createFixedCostAllocationKey(row);

  if (!key) {
    return 1;
  }

  return Math.max(counts.get(key) ?? 1, 1);
}

function createFixedCostAllocationKey(
  row: CourseRowData,
): string | null {
  const truckId = row.truckId.trim();
  const date = row.filterDate.trim();

  if (!truckId || !date) {
    return null;
  }

  return `${truckId}|${date}`;
}

function isFixedCostAllocationRelevantRow(
  row: CourseRowData,
): boolean {
  if (row.databaseId !== null) {
    return true;
  }

  return [
    row.customerId,
    row.customerTariffId,
    row.courseType,
    row.pickupAddressId,
    row.pickupAddressText,
    row.loadingUnloadingAddressId,
    row.loadingUnloadingAddressText,
    row.extraAddressId,
    row.extraAddressText,
    row.returnAddressId,
    row.returnAddressText,
    row.totalKm,
    row.billableKm,
    row.containerNumber,
  ].some((value) => value.trim() !== "");
}

function getNextRowId(
  rows: readonly CourseRowData[],
): number {
  const highestId = rows.reduce(
    (currentHighestId, row) =>
      Math.max(
        currentHighestId,
        row.id,
      ),
    0,
  );

  return highestId + 1;
}

function getTodayDate(): string {
  const now = new Date();

  const timezoneOffset =
    now.getTimezoneOffset() * 60_000;

  return new Date(
    now.getTime() - timezoneOffset,
  )
    .toISOString()
    .slice(0, 10);
}


function calculateSettlementSummary(
  rows: readonly CourseRowData[],
): {
  checked: number;
  underpaid: number;
} {
  let checked = 0;
  let underpaid = 0;

  for (const row of rows) {
    if (
      row.settlementStatus !== "NOT_CHECKED"
    ) {
      checked += 1;
    }

    if (
      row.settlementStatus === "UNDERPAID"
    ) {
      underpaid += 1;
    }
  }

  return {
    checked,
    underpaid,
  };
}

function calculateCourseSummary(
  rows: readonly CourseRowData[],
): CourseSummaryValues {
  let totalKm = 0;
  let billableKm = 0;
  let revenue = 0;
  let cost = 0;
  let profit = 0;

  for (const row of rows) {
    totalKm += parseSummaryNumber(
      row.totalKm,
    );

    billableKm += parseSummaryNumber(
      row.billableKm,
    );

    const rowCost =
      parseNullableSummaryNumber(
        row.totalCost,
      );

    const rowProfit =
      parseNullableSummaryNumber(
        row.profit,
      );

    const fallbackRevenue =
      parseSummaryNumber(row.price);

    const rowRevenue =
      rowCost !== null &&
      rowProfit !== null
        ? rowCost + rowProfit
        : fallbackRevenue;

    const effectiveCost = rowCost ?? 0;

    const effectiveProfit =
      rowProfit ??
      (rowRevenue - effectiveCost);

    revenue += rowRevenue;
    cost += effectiveCost;
    profit += effectiveProfit;
  }

  const averageMargin =
    revenue > 0
      ? (profit / revenue) * 100
      : 0;

  return {
    courseCount: rows.length,
    totalKm: roundSummaryValue(totalKm),
    billableKm:
      roundSummaryValue(billableKm),
    revenue: roundSummaryValue(revenue),
    cost: roundSummaryValue(cost),
    profit: roundSummaryValue(profit),
    averageMargin:
      roundSummaryValue(averageMargin),
  };
}

function parseSummaryNumber(
  value: string,
): number {
  return (
    parseNullableSummaryNumber(value) ?? 0
  );
}

function parseNullableSummaryNumber(
  value: string,
): number | null {
  if (value.trim() === "") {
    return null;
  }

  const parsedValue = Number(value);

  return Number.isFinite(parsedValue)
    ? parsedValue
    : null;
}

function roundSummaryValue(
  value: number,
): number {
  return Math.round(value * 100) / 100;
}


type BuildExcelExportRowInput = {
  row: CourseRowData;
  trucks: readonly TruckOption[];
  customers: readonly CustomerOption[];
  addresses: readonly AddressOption[];
};

type CourseExcelExportRow = {
  courseId: string;
  date: string;
  customer: string;
  truck: string;
  licensePlate: string;
  courseType: string;
  pickupAddress: string;
  loadingUnloadingAddress: string;
  extraAddress: string;
  returnAddress: string;
  containerNumber: string;
  totalKm: number;
  billableKm: number;
  nonBillableKm: number;
  waitingMinutes: number;
  basePrice: number;
  revenue: number;
  settlementAmount: number;
  settlementDifference: number;
  settlementStatus: string;
  settlementReference: string;
  settlementNotes: string;
  fuelCost: number;
  tollFee: number;
  portFee: number;
  totalCost: number;
  profit: number;
  margin: number;
  status: string;
};

function buildCourseExcelExportRow({
  row,
  trucks,
  customers,
  addresses,
}: BuildExcelExportRowInput): CourseExcelExportRow {
  const truck = trucks.find(
    (option) =>
      option.id === row.truckId,
  );

  const customer = customers.find(
    (option) =>
      option.id === row.customerId,
  );

  const totalKm =
    parseSummaryNumber(row.totalKm);

  const billableKm =
    parseSummaryNumber(row.billableKm);

  const totalCost =
    parseSummaryNumber(row.totalCost);

  const profit =
    parseSummaryNumber(row.profit);

  const fallbackBasePrice =
    parseSummaryNumber(row.price);

  const revenue =
    row.totalCost.trim() !== "" &&
    row.profit.trim() !== ""
      ? totalCost + profit
      : fallbackBasePrice;

  const margin =
    revenue > 0
      ? profit / revenue
      : 0;

  return {
    courseId: row.databaseId ?? "",
    date: row.filterDate,
    customer:
      customer?.name ?? "",
    truck:
      truck?.name ?? "",
    licensePlate:
      truck?.licensePlate ?? "",
    courseType:
      getCourseTypeExportLabel(
        row.courseType,
      ),

    pickupAddress:
      getAddressExportLabel(
        addresses,
        row.pickupAddressId,
        row.pickupAddressText,
      ),

    loadingUnloadingAddress:
      getAddressExportLabel(
        addresses,
        row.loadingUnloadingAddressId,
        row.loadingUnloadingAddressText,
      ),

    extraAddress:
      getAddressExportLabel(
        addresses,
        row.extraAddressId,
        row.extraAddressText,
      ),

    returnAddress:
      getAddressExportLabel(
        addresses,
        row.returnAddressId,
        row.returnAddressText,
      ),

    containerNumber:
      row.containerNumber.trim(),

    totalKm,
    billableKm,
    nonBillableKm: Math.max(
      totalKm - billableKm,
      0,
    ),

    waitingMinutes:
      parseSummaryNumber(
        row.waitingMinutes,
      ),

    basePrice: fallbackBasePrice,
    revenue,

    settlementAmount:
      parseSummaryNumber(
        row.settlementAmount,
      ),
    settlementDifference:
      calculateExportSettlementDifference({
        settlementAmount:
          parseNullableSummaryNumber(
            row.settlementAmount,
          ),
        revenue,
      }),
    settlementStatus:
      row.settlementStatus,
    settlementReference:
      row.settlementReference.trim(),
    settlementNotes:
      row.settlementNotes.trim(),

    fuelCost:
      parseSummaryNumber(
        row.fuelCost,
      ),

    tollFee:
      parseSummaryNumber(
        row.tollFee,
      ),

    portFee:
      parseSummaryNumber(
        row.portFee,
      ),

    totalCost,
    profit,
    margin,
    status: row.status,
  };
}

function calculateExportSettlementDifference({
  settlementAmount,
  revenue,
}: {
  settlementAmount: number | null;
  revenue: number;
}): number {
  if (settlementAmount === null) {
    return 0;
  }

  return roundSummaryValue(
    settlementAmount - revenue,
  );
}

function getCourseTypeExportLabel(
  courseType: string,
): string {
  switch (courseType) {
    case "ROUND_TRIP":
      return "Кръгов";

    case "SHUNT":
      return "Шунт";

    default:
      return courseType;
  }
}

function getAddressExportLabel(
  addresses: readonly AddressOption[],
  addressId: string,
  addressText: string,
): string {
  const typedLabel =
    addressText.trim();

  if (typedLabel !== "") {
    return typedLabel;
  }

  const address = addresses.find(
    (option) =>
      option.id === addressId,
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

  const details = [
    address.street,
    cityLine,
    address.country,
  ].filter(Boolean);

  if (details.length === 0) {
    return address.name;
  }

  return `${address.name} — ${details.join(", ")}`;
}

function getDownloadFileName(
  contentDisposition: string | null,
): string | null {
  if (!contentDisposition) {
    return null;
  }

  const utf8Match =
    contentDisposition.match(
      /filename\*=UTF-8''([^;]+)/i,
    );

  if (utf8Match?.[1]) {
    return decodeURIComponent(
      utf8Match[1],
    );
  }

  const basicMatch =
    contentDisposition.match(
      /filename="?([^";]+)"?/i,
    );

  return basicMatch?.[1] ?? null;
}

function downloadBlob(
  blob: Blob,
  fileName: string,
): void {
  const objectUrl =
    URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  link.href = objectUrl;
  link.download = fileName;
  link.style.display = "none";

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(objectUrl);
}