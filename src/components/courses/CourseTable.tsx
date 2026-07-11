"use client";

import { useRef, useState } from "react";

import CourseRow, {
  COURSE_COLUMNS,
  type CourseRowData,
} from "./CourseRow";

function createEmptyCourseRow(id: number): CourseRowData {
  return {
    id,
    truck: "",
    pickup: "",
    loadingUnloading: "",
    extraAddress: "",
    returnAddress: "",
    kilometers: "",
    containerNumber: "",
    waitingMinutes: "",
    price: "",
    tollFee: "",
    portFee: "",
  };
}

export default function CourseTable() {
  const nextRowId = useRef(2);

  const [rows, setRows] = useState<CourseRowData[]>([
    createEmptyCourseRow(1),
  ]);

  function handleAddRow(): void {
    const newRowId = nextRowId.current;
    nextRowId.current += 1;

    setRows((currentRows) => [
      ...currentRows,
      createEmptyCourseRow(newRowId),
    ]);
  }

  function handleSaveRow(savedRow: CourseRowData): void {
    setRows((currentRows) =>
      currentRows.map((row) =>
        row.id === savedRow.id ? savedRow : row,
      ),
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Courses
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Add and manage transport courses.
          </p>
        </div>

        <button
          type="button"
          onClick={handleAddRow}
          className="inline-flex h-10 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          Add Row
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-[2050px] table-fixed border-collapse text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="w-14 border-b border-r border-slate-200 px-3 py-3 text-center font-semibold text-slate-700">
                #
              </th>

              {COURSE_COLUMNS.map((column) => (
                <th
                  key={column.key}
                  className="w-40 border-b border-r border-slate-200 px-3 py-3 text-left font-semibold text-slate-700"
                >
                  {column.label}
                </th>
              ))}

              <th className="w-32 border-b border-slate-200 px-3 py-3 text-left font-semibold text-slate-700">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row, rowIndex) => (
              <CourseRow
                key={row.id}
                rowNumber={rowIndex + 1}
                initialRow={row}
                onSave={handleSaveRow}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}