"use client";

import { useRef, useState } from "react";

type CourseRow = {
  id: number;
  truck: string;
  pickup: string;
  loadingUnloading: string;
  extraAddress: string;
  returnAddress: string;
  kilometers: string;
  containerNumber: string;
  waitingMinutes: string;
  price: string;
  tollFee: string;
  portFee: string;
};

type EditableCourseField = Exclude<keyof CourseRow, "id">;

type CourseColumn = {
  key: EditableCourseField;
  label: string;
  type?: "text" | "number";
  placeholder?: string;
  min?: number;
  step?: number;
};

const COURSE_COLUMNS: readonly CourseColumn[] = [
  {
    key: "truck",
    label: "Truck",
    placeholder: "Select truck",
  },
  {
    key: "pickup",
    label: "Pickup",
    placeholder: "Pickup address",
  },
  {
    key: "loadingUnloading",
    label: "Loading / Unloading",
    placeholder: "Customer address",
  },
  {
    key: "extraAddress",
    label: "Extra Address",
    placeholder: "Optional address",
  },
  {
    key: "returnAddress",
    label: "Return",
    placeholder: "Return / drop-off",
  },
  {
    key: "kilometers",
    label: "Kilometers",
    type: "number",
    placeholder: "0",
    min: 0,
    step: 0.1,
  },
  {
    key: "containerNumber",
    label: "Container Number",
    placeholder: "ABCD 123456-7",
  },
  {
    key: "waitingMinutes",
    label: "Waiting (min)",
    type: "number",
    placeholder: "0",
    min: 0,
    step: 1,
  },
  {
    key: "price",
    label: "Price (€)",
    type: "number",
    placeholder: "0.00",
    min: 0,
    step: 0.01,
  },
  {
    key: "tollFee",
    label: "Toll Fee (€)",
    type: "number",
    placeholder: "0.00",
    min: 0,
    step: 0.01,
  },
  {
    key: "portFee",
    label: "Port Fee (€)",
    type: "number",
    placeholder: "0.00",
    min: 0,
    step: 0.01,
  },
];

function createEmptyCourseRow(id: number): CourseRow {
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

  const [rows, setRows] = useState<CourseRow[]>([
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

  function handleCellChange(
    rowId: number,
    field: EditableCourseField,
    value: string,
  ): void {
    setRows((currentRows) =>
      currentRows.map((row) =>
        row.id === rowId
          ? {
              ...row,
              [field]: value,
            }
          : row,
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
        <table className="min-w-[1900px] table-fixed border-collapse text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="w-14 border-b border-r border-slate-200 px-3 py-3 text-center font-semibold text-slate-700">
                #
              </th>

              {COURSE_COLUMNS.map((column) => (
                <th
                  key={column.key}
                  className="w-40 border-b border-r border-slate-200 px-3 py-3 text-left font-semibold text-slate-700 last:border-r-0"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((row, rowIndex) => (
              <tr
                key={row.id}
                className="hover:bg-slate-50"
              >
                <td className="border-b border-r border-slate-200 px-3 py-2 text-center text-slate-500">
                  {rowIndex + 1}
                </td>

                {COURSE_COLUMNS.map((column) => (
                  <td
                    key={column.key}
                    className="border-b border-r border-slate-200 p-1 last:border-r-0"
                  >
                    <input
                      type={column.type ?? "text"}
                      value={row[column.key]}
                      min={column.min}
                      step={column.step}
                      placeholder={column.placeholder}
                      aria-label={`${column.label}, row ${rowIndex + 1}`}
                      onChange={(event) =>
                        handleCellChange(
                          row.id,
                          column.key,
                          event.target.value,
                        )
                      }
                      className="h-10 w-full rounded border border-transparent bg-transparent px-2 text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-200 focus:border-slate-400 focus:bg-white"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}