"use client";

import { useState } from "react";

export type CourseRowData = {
  id: number;
  truck: string;
  customer: string;
  courseType: string;
  pickup: string;
  loadingUnloading: string;
  extraAddress: string;
  returnAddress: string;
  kilometers: string;
  billableKilometers: string;
  containerNumber: string;
  waitingMinutes: string;
  price: string;
  tollFee: string;
  portFee: string;
  profit: string;
  status: string;
};

export type EditableCourseField = Exclude<
  keyof CourseRowData,
  "id"
>;

export type CourseColumn = {
  key: EditableCourseField;
  label: string;
  type?: "text" | "number" | "select";
  placeholder?: string;
  min?: number;
  step?: number;
  options?: readonly string[];
  readOnly?: boolean;
  width: number;
};

export const COURSE_COLUMNS: readonly CourseColumn[] = [
  {
    key: "truck",
    label: "Камион",
    placeholder: "Избери камион",
    width: 150,
  },
  {
    key: "customer",
    label: "Клиент",
    placeholder: "Избери клиент",
    width: 170,
  },
  {
    key: "courseType",
    label: "Тип",
    type: "select",
    placeholder: "Избери тип",
    options: ["ROUND_TRIP", "SHUNT"],
    width: 140,
  },
  {
    key: "pickup",
    label: "Взимане",
    placeholder: "Адрес за взимане",
    width: 220,
  },
  {
    key: "loadingUnloading",
    label: "Товарене / разтоварване",
    placeholder: "Адрес на клиента",
    width: 260,
  },
  {
    key: "extraAddress",
    label: "Екстра адрес",
    placeholder: "Незадължителен адрес",
    width: 220,
  },
  {
    key: "returnAddress",
    label: "Връщане",
    placeholder: "Адрес за връщане",
    width: 220,
  },
  {
    key: "kilometers",
    label: "Км",
    type: "number",
    placeholder: "0",
    min: 0,
    step: 0.1,
    width: 110,
  },
  {
    key: "billableKilometers",
    label: "Платими км",
    type: "number",
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
    type: "number",
    placeholder: "0",
    min: 0,
    step: 1,
    width: 130,
  },
  {
    key: "price",
    label: "Цена (€)",
    type: "number",
    placeholder: "0.00",
    min: 0,
    step: 0.01,
    width: 120,
  },
  {
    key: "tollFee",
    label: "Тол (€)",
    type: "number",
    placeholder: "0.00",
    min: 0,
    step: 0.01,
    width: 110,
  },
  {
    key: "portFee",
    label: "Пристанище (€)",
    type: "number",
    placeholder: "0.00",
    min: 0,
    step: 0.01,
    width: 140,
  },
  {
    key: "profit",
    label: "Печалба (€)",
    type: "number",
    placeholder: "Автоматично",
    readOnly: true,
    width: 135,
  },
  {
    key: "status",
    label: "Статус",
    placeholder: "Автоматично",
    readOnly: true,
    width: 150,
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
          {column.type === "select" ? (
            <select
              value={draft[column.key]}
              aria-label={`${column.label}, ред ${rowNumber}`}
              onChange={(event) =>
                handleCellChange(
                  column.key,
                  event.target.value,
                )
              }
              className="h-10 w-full rounded border border-transparent bg-transparent px-2 text-slate-900 outline-none transition hover:border-slate-200 focus:border-slate-400 focus:bg-white"
            >
              <option value="">
                {column.placeholder ?? "Избери"}
              </option>

              {column.options?.map((option) => (
                <option key={option} value={option}>
                  {option === "ROUND_TRIP"
                    ? "Кръгов"
                    : option === "SHUNT"
                      ? "Шунт"
                      : option}
                </option>
              ))}
            </select>
          ) : (
            <input
              type={column.type ?? "text"}
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
                  ? "cursor-not-allowed border-transparent bg-slate-50 text-slate-500 placeholder:text-slate-400"
                  : "border-transparent bg-transparent text-slate-900 placeholder:text-slate-400 hover:border-slate-200 focus:border-slate-400 focus:bg-white",
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