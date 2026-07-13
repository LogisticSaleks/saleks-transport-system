"use client";

import {
  useMemo,
  useRef,
  useState,
} from "react";

import type { AddressOption } from "./AddressAutocomplete";
import CourseRow, {
  COURSE_COLUMNS,
  type CourseRowData,
} from "./CourseRow";
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

    containerNumber: "",
    waitingMinutes: "",

    price: "",
    tollFee: "",
    portFee: "",

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

  const visibleRows = useMemo(
    () =>
      rows.filter((row) => {
        /*
         * Новите незаписани редове винаги остават
         * видими, за да може да се въвежда курс.
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

  const visibleSavedCoursesCount =
    visibleRows.filter(
      (row) => row.databaseId !== null,
    ).length;

  function handleAddRow(): void {
    const newRowId = nextRowId.current;

    nextRowId.current += 1;

    setRows((currentRows) => [
      ...currentRows,
      createEmptyCourseRow(newRowId),
    ]);
  }

  function handleSaveRow(
    savedRow: CourseRowData,
  ): void {
    setRows((currentRows) =>
      currentRows.map((row) =>
        row.id === savedRow.id
          ? savedRow
          : row,
      ),
    );
  }

  function handleDeleteRow(
    rowId: number,
  ): void {
    setRows((currentRows) =>
      currentRows.filter(
        (row) => row.id !== rowId,
      ),
    );
  }

  function handleClearFilters(): void {
    setDateFrom("");
    setDateTo("");
  }

  return (
    <section className="min-w-0 space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Courses
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Add and manage transport courses.
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
              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
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
              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />
          </label>

          <button
            type="button"
            onClick={handleClearFilters}
            disabled={
              dateFrom === "" &&
              dateTo === ""
            }
            className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Изчисти филтъра
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

        {(dateFrom !== "" ||
          dateTo !== "") && (
          <span className="font-medium text-sky-700">
            Активен филтър по дата
          </span>
        )}
      </div>

      <div className="w-full min-w-0 overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-[3480px] table-fixed border-collapse text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="sticky left-0 z-20 w-14 min-w-14 border-b border-r border-slate-200 bg-slate-100 px-3 py-3 text-center font-semibold text-slate-700">
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
                    className="whitespace-nowrap border-b border-r border-slate-200 px-3 py-3 text-left font-semibold text-slate-700"
                  >
                    {column.label}
                  </th>
                ),
              )}

              <th className="sticky right-[120px] z-20 w-[130px] min-w-[130px] whitespace-nowrap border-b border-r border-slate-200 bg-slate-100 px-3 py-3 text-left font-semibold text-slate-700">
                Запази
              </th>

              <th className="sticky right-0 z-20 w-[120px] min-w-[120px] whitespace-nowrap border-b border-slate-200 bg-slate-100 px-3 py-3 text-left font-semibold text-slate-700">
                Детайли
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
                  customerOptions={
                    customers
                  }
                  addressOptions={
                    addresses
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
        Използвай хоризонталния скрол, за да видиш всички
        колони. Филтърът използва планираната дата, а когато
        тя липсва — датата на създаване на курса.
      </p>
    </section>
  );
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