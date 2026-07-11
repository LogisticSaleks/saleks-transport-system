"use client";

import { useState } from "react";

import AddressAutocomplete, {
  type AddressOption,
} from "./AddressAutocomplete";
import CourseTypeSelect from "./CourseTypeSelect";
import CustomerSelect, {
  type CustomerOption,
} from "./CustomerSelect";
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
    key: "kilometers",
    label: "Км",
    inputType: "number",
    placeholder: "0",
    min: 0,
    step: 0.1,
    width: 110,
  },
  {
    key: "billableKilometers",
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
    width: 150,
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

function isAddressField(
  field: EditableCourseField,
): field is AddressField {
  return (
    ADDRESS_FIELDS as readonly EditableCourseField[]
  ).includes(field);
}