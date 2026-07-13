import ExcelJS from "exceljs";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EXCEL_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

type JsonObject = Record<string, unknown>;

type CourseExcelExportRow = {
  courseId: string;
  date: Date | null;
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
  fuelCost: number;
  tollFee: number;
  portFee: number;
  totalCost: number;
  profit: number;
  margin: number;
  status: string;
};

export async function POST(
  request: Request,
) {
  try {
    const body =
      await readJsonObject(request);

    const rows = readExportRows(
      body.rows,
    );

    if (rows.length === 0) {
      return errorResponse(
        "Няма курсове за export.",
        400,
      );
    }

    const workbook =
      createCoursesWorkbook(rows);

    const outputBuffer =
      await workbook.xlsx.writeBuffer();

    const responseBody =
      new Uint8Array(outputBuffer);

    const fileName =
      createExportFileName(
        readOptionalDateText(
          body.dateFrom,
        ),
        readOptionalDateText(
          body.dateTo,
        ),
      );

    return new NextResponse(
      responseBody,
      {
        status: 200,
        headers: {
          "Content-Type":
            EXCEL_MIME_TYPE,
          "Content-Disposition":
            `attachment; filename="${fileName}"`,
          "Cache-Control":
            "no-store",
        },
      },
    );
  } catch (error) {
    if (
      error instanceof
      ExportValidationError
    ) {
      return errorResponse(
        error.message,
        400,
      );
    }

    console.error(
      "Courses Excel export error:",
      error,
    );

    return errorResponse(
      "Excel файлът не можа да бъде създаден.",
      500,
    );
  }
}

function createCoursesWorkbook(
  rows: readonly CourseExcelExportRow[],
): ExcelJS.Workbook {
  const workbook =
    new ExcelJS.Workbook();

  workbook.creator =
    "Saleks Transport System";

  workbook.lastModifiedBy =
    "Saleks Transport System";

  workbook.created = new Date();
  workbook.modified = new Date();

  workbook.title =
    "Saleks Courses Export";

  workbook.subject =
    "Current filtered transport courses";

  const worksheet =
    workbook.addWorksheet(
      "Courses",
      {
        properties: {
          defaultRowHeight: 20,
        },
        views: [
          {
            state: "frozen",
            ySplit: 1,
          },
        ],
      },
    );

  worksheet.columns = [
    {
      header: "Дата",
      key: "date",
      width: 13,
    },
    {
      header: "Клиент",
      key: "customer",
      width: 24,
    },
    {
      header: "Камион",
      key: "truck",
      width: 18,
    },
    {
      header: "Рег. номер",
      key: "licensePlate",
      width: 16,
    },
    {
      header: "Тип курс",
      key: "courseType",
      width: 14,
    },
    {
      header: "Взимане",
      key: "pickupAddress",
      width: 36,
    },
    {
      header:
        "Товарене / разтоварване",
      key:
        "loadingUnloadingAddress",
      width: 42,
    },
    {
      header: "Екстра адрес",
      key: "extraAddress",
      width: 34,
    },
    {
      header: "Връщане",
      key: "returnAddress",
      width: 36,
    },
    {
      header: "Контейнер",
      key: "containerNumber",
      width: 20,
    },
    {
      header: "Общо км",
      key: "totalKm",
      width: 13,
    },
    {
      header: "Платими км",
      key: "billableKm",
      width: 14,
    },
    {
      header: "Неплатими км",
      key: "nonBillableKm",
      width: 16,
    },
    {
      header: "Престой (мин)",
      key: "waitingMinutes",
      width: 16,
    },
    {
      header: "Базова цена",
      key: "basePrice",
      width: 15,
    },
    {
      header: "Общ приход",
      key: "revenue",
      width: 15,
    },
    {
      header: "Гориво",
      key: "fuelCost",
      width: 13,
    },
    {
      header: "Тол",
      key: "tollFee",
      width: 12,
    },
    {
      header: "Пристанище",
      key: "portFee",
      width: 14,
    },
    {
      header: "Общ разход",
      key: "totalCost",
      width: 15,
    },
    {
      header: "Печалба",
      key: "profit",
      width: 15,
    },
    {
      header: "Марж",
      key: "margin",
      width: 12,
    },
    {
      header: "Статус",
      key: "status",
      width: 16,
    },
    {
      header: "ID на курса",
      key: "courseId",
      width: 28,
    },
  ];

  worksheet.addRows([...rows]);

  worksheet.autoFilter = {
    from: "A1",
    to: "X1",
  };

  worksheet.pageSetup = {
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
  };

  styleHeaderRow(worksheet);

  worksheet.getColumn(
    "date",
  ).numFmt = "dd.mm.yyyy";

  for (const columnKey of [
    "totalKm",
    "billableKm",
    "nonBillableKm",
    "waitingMinutes",
  ]) {
    worksheet.getColumn(
      columnKey,
    ).numFmt = "#,##0.00";
  }

  for (const columnKey of [
    "basePrice",
    "revenue",
    "fuelCost",
    "tollFee",
    "portFee",
    "totalCost",
    "profit",
  ]) {
    worksheet.getColumn(
      columnKey,
    ).numFmt =
      '#,##0.00 [$€-1]';
  }

  worksheet.getColumn(
    "margin",
  ).numFmt = "0.00%";

  styleDataRows(worksheet);

  return workbook;
}

function styleHeaderRow(
  worksheet: ExcelJS.Worksheet,
): void {
  const headerRow =
    worksheet.getRow(1);

  headerRow.height = 28;

  headerRow.eachCell((cell) => {
    cell.font = {
      bold: true,
      color: {
        argb: "FFFFFFFF",
      },
    };

    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: {
        argb: "FF0F172A",
      },
    };

    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };

    cell.border = {
      bottom: {
        style: "thin",
        color: {
          argb: "FF64748B",
        },
      },
    };
  });
}

function styleDataRows(
  worksheet: ExcelJS.Worksheet,
): void {
  for (
    let rowNumber = 2;
    rowNumber <= worksheet.rowCount;
    rowNumber += 1
  ) {
    const row =
      worksheet.getRow(rowNumber);

    row.alignment = {
      vertical: "top",
      wrapText: true,
    };

    if (rowNumber % 2 === 0) {
      row.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: {
            argb: "FFF8FAFC",
          },
        };
      });
    }

    row.eachCell((cell) => {
      cell.border = {
        bottom: {
          style: "hair",
          color: {
            argb: "FFE2E8F0",
          },
        },
      };
    });

    const profitCell =
      worksheet.getCell(
        `U${rowNumber}`,
      );

    const profit =
      Number(profitCell.value);

    if (
      Number.isFinite(profit) &&
      profit < 0
    ) {
      profitCell.font = {
        bold: true,
        color: {
          argb: "FFB91C1C",
        },
      };

      profitCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
          argb: "FFFEE2E2",
        },
      };
    } else if (
      Number.isFinite(profit) &&
      profit > 0
    ) {
      profitCell.font = {
        bold: true,
        color: {
          argb: "FF047857",
        },
      };
    }

    const statusCell =
      worksheet.getCell(
        `W${rowNumber}`,
      );

    if (
      String(statusCell.value) === "LOSS"
    ) {
      statusCell.font = {
        bold: true,
        color: {
          argb: "FFB91C1C",
        },
      };
    } else if (
      String(statusCell.value) ===
      "PROFITABLE"
    ) {
      statusCell.font = {
        bold: true,
        color: {
          argb: "FF047857",
        },
      };
    }
  }
}

function readExportRows(
  value: unknown,
): CourseExcelExportRow[] {
  if (!Array.isArray(value)) {
    throw new ExportValidationError(
      "rows трябва да бъде масив.",
    );
  }

  return value.map(
    (item, index) => {
      const row = readObject(
        item,
        `rows[${index}]`,
      );

      return {
        courseId: readString(
          row.courseId,
          `rows[${index}].courseId`,
        ),

        date: readDate(
          row.date,
          `rows[${index}].date`,
        ),

        customer: readString(
          row.customer,
          `rows[${index}].customer`,
        ),

        truck: readString(
          row.truck,
          `rows[${index}].truck`,
        ),

        licensePlate: readString(
          row.licensePlate,
          `rows[${index}].licensePlate`,
        ),

        courseType: readString(
          row.courseType,
          `rows[${index}].courseType`,
        ),

        pickupAddress: readString(
          row.pickupAddress,
          `rows[${index}].pickupAddress`,
        ),

        loadingUnloadingAddress:
          readString(
            row.loadingUnloadingAddress,
            `rows[${index}].loadingUnloadingAddress`,
          ),

        extraAddress: readString(
          row.extraAddress,
          `rows[${index}].extraAddress`,
        ),

        returnAddress: readString(
          row.returnAddress,
          `rows[${index}].returnAddress`,
        ),

        containerNumber: readString(
          row.containerNumber,
          `rows[${index}].containerNumber`,
        ),

        totalKm: readNumber(
          row.totalKm,
          `rows[${index}].totalKm`,
        ),

        billableKm: readNumber(
          row.billableKm,
          `rows[${index}].billableKm`,
        ),

        nonBillableKm: readNumber(
          row.nonBillableKm,
          `rows[${index}].nonBillableKm`,
        ),

        waitingMinutes: readNumber(
          row.waitingMinutes,
          `rows[${index}].waitingMinutes`,
        ),

        basePrice: readNumber(
          row.basePrice,
          `rows[${index}].basePrice`,
        ),

        revenue: readNumber(
          row.revenue,
          `rows[${index}].revenue`,
        ),

        fuelCost: readNumber(
          row.fuelCost,
          `rows[${index}].fuelCost`,
        ),

        tollFee: readNumber(
          row.tollFee,
          `rows[${index}].tollFee`,
        ),

        portFee: readNumber(
          row.portFee,
          `rows[${index}].portFee`,
        ),

        totalCost: readNumber(
          row.totalCost,
          `rows[${index}].totalCost`,
        ),

        profit: readNumber(
          row.profit,
          `rows[${index}].profit`,
          {
            allowNegative: true,
          },
        ),

        margin: readNumber(
          row.margin,
          `rows[${index}].margin`,
          {
            allowNegative: true,
          },
        ),

        status: readString(
          row.status,
          `rows[${index}].status`,
        ),
      };
    },
  );
}

async function readJsonObject(
  request: Request,
): Promise<JsonObject> {
  let value: unknown;

  try {
    value = await request.json();
  } catch {
    throw new ExportValidationError(
      "Невалиден JSON body.",
    );
  }

  return readObject(
    value,
    "JSON body",
  );
}

function readObject(
  value: unknown,
  fieldName: string,
): JsonObject {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    throw new ExportValidationError(
      `${fieldName} трябва да бъде обект.`,
    );
  }

  return value as JsonObject;
}

function readString(
  value: unknown,
  fieldName: string,
): string {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  if (typeof value !== "string") {
    throw new ExportValidationError(
      `${fieldName} трябва да бъде текст.`,
    );
  }

  return value.trim();
}

function readNumber(
  value: unknown,
  fieldName: string,
  options: {
    allowNegative?: boolean;
  } = {},
): number {
  const parsedValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(parsedValue)) {
    throw new ExportValidationError(
      `${fieldName} трябва да бъде число.`,
    );
  }

  if (
    !options.allowNegative &&
    parsedValue < 0
  ) {
    throw new ExportValidationError(
      `${fieldName} не може да бъде отрицателно.`,
    );
  }

  return parsedValue;
}

function readDate(
  value: unknown,
  fieldName: string,
): Date | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  if (typeof value !== "string") {
    throw new ExportValidationError(
      `${fieldName} трябва да бъде дата.`,
    );
  }

  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})$/,
  );

  if (!match) {
    throw new ExportValidationError(
      `${fieldName} трябва да бъде във формат YYYY-MM-DD.`,
    );
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(
    year,
    month - 1,
    day,
  );

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    throw new ExportValidationError(
      `${fieldName} съдържа невалидна дата.`,
    );
  }

  return date;
}

function readOptionalDateText(
  value: unknown,
): string | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return null;
  }

  return value;
}

function createExportFileName(
  dateFrom: string | null,
  dateTo: string | null,
): string {
  if (dateFrom && dateTo) {
    return `saleks-courses-${dateFrom}-to-${dateTo}.xlsx`;
  }

  if (dateFrom) {
    return `saleks-courses-from-${dateFrom}.xlsx`;
  }

  if (dateTo) {
    return `saleks-courses-to-${dateTo}.xlsx`;
  }

  return `saleks-courses-${formatDateForFile(
    new Date(),
  )}.xlsx`;
}

function formatDateForFile(
  date: Date,
): string {
  const year =
    date.getFullYear();

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    date.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function errorResponse(
  message: string,
  status: number,
) {
  return NextResponse.json(
    {
      error: message,
    },
    {
      status,
    },
  );
}

class ExportValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name =
      "ExportValidationError";
  }
}