"use client";

import { useState } from "react";

export type CourseRowData = {
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

export type EditableCourseField = Exclude<
  keyof CourseRowData,
  "id"
>;

export type CourseColumn = {
  key: EditableCourseField;
  label: string;
  type?: "text" | "number";
  placeholder?: string;
  min?: number;
  step?: number;
};

export const COURSE_COLUMNS: readonly CourseColumn[] = [
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

type CourseRowProps = {
  rowNumber: number;
  initialRow: CourseRowData;
  onSave: (row: CourseRowData) => void;
};

export default function CourseRow({
  rowNumber,
  initialRow,
  onSave,
}: CourseRowProps) {
  const [draft, setDraft] =
    useState<CourseRowData>(initialRow);

  const [isSaved, setIsSaved] = useState(false);

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
    onSave(draft);
    setIsSaved(true);
  }

  return (
    <tr className="hover:bg-slate-50">
      <td className="border-b border-r border-slate-200 px-3 py-2 text-center text-slate-500">
        {rowNumber}
      </td>

      {COURSE_COLUMNS.map((column) => (
        <td
          key={column.key}
          className="border-b border-r border-slate-200 p-1"
        >
          <input
            type={column.type ?? "text"}
            value={draft[column.key]}
            min={column.min}
            step={column.step}
            placeholder={column.placeholder}
            aria-label={`${column.label}, row ${rowNumber}`}
            onChange={(event) =>
              handleCellChange(
                column.key,
                event.target.value,
              )
            }
            className="h-10 w-full rounded border border-transparent bg-transparent px-2 text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-200 focus:border-slate-400 focus:bg-white"
          />
        </td>
      ))}

      <td className="border-b border-slate-200 px-3 py-2">
        <div className="flex items-center gap-2">
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
    </tr>
  );
}