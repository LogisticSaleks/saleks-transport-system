import ExcelJS from "exceljs";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EXCEL_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

type ReportFilters = {
  dateFrom: string;
  dateTo: string;
  dateFromDate: Date | null;
  dateToExclusiveDate: Date | null;
  customerId: string;
  truckId: string;
  hasDateFilter: boolean;
  hasActiveFilter: boolean;
};

type CourseReportRow = {
  id: string;
  courseLabel: string;
  courseDate: Date;
  customerId: string;
  customerName: string;
  truckId: string | null;
  truckName: string;
  truckLicensePlate: string;
  truckLabel: string;
  totalKm: number;
  billableKm: number;
  nonBillableKm: number;
  expectedRevenue: number;
  settlementAmount: number | null;
  settlementDifference: number | null;
  settlementStatus: string;
  revenue: number;
  cost: number;
  profit: number;
  margin: number | null;
};

type AggregateReportRow = {
  id: string;
  label: string;
  courseCount: number;
  totalKm: number;
  billableKm: number;
  nonBillableKm: number;
  expectedRevenue: number;
  settlementAmount: number;
  settlementDifference: number;
  settlementCheckedCount: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number | null;
};

type WorkbookInput = {
  filters: ReportFilters;
  selectedCustomerLabel: string;
  selectedTruckLabel: string;
  courses: readonly CourseReportRow[];
  totals: AggregateReportRow;
  profitByCustomer: readonly AggregateReportRow[];
  profitByTruck: readonly AggregateReportRow[];
  lossCourses: readonly CourseReportRow[];
};

export async function GET(
  request: NextRequest,
) {
  try {
    const filters =
      buildReportFiltersFromSearchParams(
        request.nextUrl.searchParams,
      );

    const [
      rawCourses,
      selectedCustomer,
      selectedTruck,
    ] = await Promise.all([
      prisma.course.findMany({
        where: buildCourseWhere(filters),

        select: {
          id: true,
          courseNumber: true,
          containerNumber: true,
          plannedDate: true,
          createdAt: true,

          totalKm: true,
          billableKm: true,
          nonBillableKm: true,

          agreedPrice: true,
          waitingAmount: true,
          settlementAmount: true,
          settlementStatus: true,

          customer: {
            select: {
              id: true,
              name: true,
            },
          },

          truck: {
            select: {
              id: true,
              name: true,
              licensePlate: true,
            },
          },

          costs: {
            select: {
              amount: true,
            },
          },
        },

        orderBy: [
          {
            plannedDate: "desc",
          },
          {
            createdAt: "desc",
          },
        ],
      }),

      filters.customerId === ""
        ? Promise.resolve(null)
        : prisma.customer.findUnique({
            where: {
              id: filters.customerId,
            },
            select: {
              name: true,
            },
          }),

      filters.truckId === ""
        ? Promise.resolve(null)
        : prisma.truck.findUnique({
            where: {
              id: filters.truckId,
            },
            select: {
              name: true,
              licensePlate: true,
            },
          }),
    ]);

    const courses: CourseReportRow[] =
      rawCourses.map((course) => {
        const totalKm = toNumber(
          course.totalKm,
        );

        const billableKm = toNumber(
          course.billableKm,
        );

        const storedNonBillableKm =
          toNullableNumber(
            course.nonBillableKm,
          );

        const nonBillableKm =
          storedNonBillableKm ??
          Math.max(
            totalKm - billableKm,
            0,
          );

        const expectedRevenue =
          toNumber(course.agreedPrice) +
          toNumber(course.waitingAmount);

        const settlementAmount =
          toNullableNumber(
            course.settlementAmount,
          );

        const settlementDifference =
          settlementAmount === null
            ? null
            : settlementAmount - expectedRevenue;

        const revenue =
          settlementAmount ?? expectedRevenue;

        const cost =
          course.costs.reduce(
            (sum, costRecord) =>
              sum +
              toNumber(costRecord.amount),
            0,
          );

        const profit = revenue - cost;

        const margin =
          revenue > 0
            ? (profit / revenue) * 100
            : null;

        const truckName =
          course.truck?.name ?? "";

        const truckLicensePlate =
          course.truck?.licensePlate ?? "";

        return {
          id: course.id,

          courseLabel:
            course.courseNumber?.trim() ||
            course.containerNumber?.trim() ||
            `Курс ${course.id.slice(-6)}`,

          courseDate:
            course.plannedDate ??
            course.createdAt,

          customerId: course.customer.id,
          customerName: course.customer.name,

          truckId: course.truck?.id ?? null,
          truckName,
          truckLicensePlate,

          truckLabel: course.truck
            ? `${truckName} — ${truckLicensePlate}`
            : "Без избран камион",

          totalKm,
          billableKm,
          nonBillableKm,
          expectedRevenue,
          settlementAmount,
          settlementDifference,
          settlementStatus:
            course.settlementStatus ?? "NOT_CHECKED",
          revenue,
          cost,
          profit,
          margin,
        };
      });

    const totals =
      calculateAggregateTotals(courses);

    const profitByCustomer =
      aggregateCourses(
        courses,
        (course) => ({
          id: course.customerId,
          label: course.customerName,
        }),
      );

    const profitByTruck =
      aggregateCourses(
        courses,
        (course) => ({
          id:
            course.truckId ??
            "unassigned-truck",
          label: course.truckLabel,
        }),
      );

    const lossCourses = courses
      .filter((course) => course.profit < 0)
      .sort(
        (firstCourse, secondCourse) =>
          firstCourse.profit -
          secondCourse.profit,
      );

    const selectedCustomerLabel =
      selectedCustomer?.name ?? "";

    const selectedTruckLabel =
      selectedTruck
        ? `${selectedTruck.name} — ${selectedTruck.licensePlate}`
        : "";

    const workbook =
      createReportsWorkbook({
        filters,
        selectedCustomerLabel,
        selectedTruckLabel,
        courses,
        totals,
        profitByCustomer,
        profitByTruck,
        lossCourses,
      });

    const outputBuffer =
      await workbook.xlsx.writeBuffer();

    const responseBody =
      new Uint8Array(outputBuffer);

    return new NextResponse(
      responseBody,
      {
        status: 200,
        headers: {
          "Content-Type":
            EXCEL_MIME_TYPE,
          "Content-Disposition":
            `attachment; filename="${createExportFileName(filters)}"`,
          "Cache-Control":
            "no-store",
        },
      },
    );
  } catch (error) {
    console.error(
      "Reports Excel export error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Excel report file could not be created.",
      },
      {
        status: 500,
      },
    );
  }
}

function createReportsWorkbook({
  filters,
  selectedCustomerLabel,
  selectedTruckLabel,
  courses,
  totals,
  profitByCustomer,
  profitByTruck,
  lossCourses,
}: WorkbookInput): ExcelJS.Workbook {
  const workbook =
    new ExcelJS.Workbook();

  workbook.creator =
    "Saleks Transport System";

  workbook.lastModifiedBy =
    "Saleks Transport System";

  workbook.created = new Date();
  workbook.modified = new Date();

  workbook.title =
    "Saleks Profit Report";

  workbook.subject =
    "Filtered profit report";

  addSummarySheet(workbook, {
    filters,
    selectedCustomerLabel,
    selectedTruckLabel,
    totals,
  });

  addAggregateSheet(
    workbook,
    "Profit by customer",
    profitByCustomer,
  );

  addAggregateSheet(
    workbook,
    "Profit by truck",
    profitByTruck,
  );

  addCourseSheet(
    workbook,
    "Course drilldown",
    courses,
  );

  addCourseSheet(
    workbook,
    "Loss courses",
    lossCourses,
  );

  return workbook;
}

function addSummarySheet(
  workbook: ExcelJS.Workbook,
  {
    filters,
    selectedCustomerLabel,
    selectedTruckLabel,
    totals,
  }: {
    filters: ReportFilters;
    selectedCustomerLabel: string;
    selectedTruckLabel: string;
    totals: AggregateReportRow;
  },
): void {
  const worksheet =
    workbook.addWorksheet(
      "Summary",
      {
        properties: {
          defaultRowHeight: 20,
        },
      },
    );

  worksheet.columns = [
    {
      header: "Показател",
      key: "label",
      width: 32,
    },
    {
      header: "Стойност",
      key: "value",
      width: 28,
    },
  ];

  worksheet.addRows([
    {
      label: "Период",
      value: formatPeriodText(filters),
    },
    {
      label: "Клиент",
      value:
        selectedCustomerLabel ||
        "Всички клиенти",
    },
    {
      label: "Камион",
      value:
        selectedTruckLabel ||
        "Всички камиони",
    },
    {
      label: "Генериран на",
      value: new Date(),
    },
    {
      label: "Курсове",
      value: totals.courseCount,
    },
    {
      label: "Общо км",
      value: roundValue(totals.totalKm),
    },
    {
      label: "Платими км",
      value: roundValue(totals.billableKm),
    },
    {
      label: "Неплатими км",
      value: roundValue(totals.nonBillableKm),
    },
    {
      label: "Очакван приход",
      value: roundValue(totals.expectedRevenue),
    },
    {
      label: "Призната сума",
      value: roundValue(totals.settlementAmount),
    },
    {
      label: "Settlement checked",
      value: totals.settlementCheckedCount,
    },
    {
      label: "Settlement разлика",
      value: roundValue(totals.settlementDifference),
    },
    {
      label: "Реален приход",
      value: roundValue(totals.revenue),
    },
    {
      label: "Общ разход",
      value: roundValue(totals.cost),
    },
    {
      label: "Обща печалба",
      value: roundValue(totals.profit),
    },
    {
      label: "Марж",
      value:
        totals.margin === null
          ? null
          : roundValue(totals.margin) / 100,
    },
  ]);

  styleHeaderRow(worksheet);

  worksheet.getCell("B5").numFmt = "#,##0";
  worksheet.getCell("B6").numFmt = "#,##0.00";
  worksheet.getCell("B7").numFmt = "#,##0.00";
  worksheet.getCell("B8").numFmt = "#,##0.00";
  worksheet.getCell("B9").numFmt =
    '#,##0.00 [$€-1]';
  worksheet.getCell("B10").numFmt =
    '#,##0.00 [$€-1]';
  worksheet.getCell("B11").numFmt = "#,##0";
  worksheet.getCell("B12").numFmt =
    '#,##0.00 [$€-1]';
  worksheet.getCell("B13").numFmt =
    '#,##0.00 [$€-1]';
  worksheet.getCell("B14").numFmt =
    '#,##0.00 [$€-1]';
  worksheet.getCell("B15").numFmt =
    '#,##0.00 [$€-1]';
  worksheet.getCell("B16").numFmt =
    "0.00%";

  worksheet.getColumn("label").font = {
    bold: true,
  };

  worksheet.getColumn("value").alignment = {
    vertical: "middle",
    horizontal: "left",
  };

  styleProfitCell(worksheet.getCell("B15"));
}

function addAggregateSheet(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  rows: readonly AggregateReportRow[],
): void {
  const worksheet =
    workbook.addWorksheet(
      sheetName,
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
      header: "Име",
      key: "label",
      width: 32,
    },
    {
      header: "Курсове",
      key: "courseCount",
      width: 12,
    },
    {
      header: "Общо км",
      key: "totalKm",
      width: 13,
    },
    {
      header: "Платими км",
      key: "billableKm",
      width: 13,
    },
    {
      header: "Неплатими км",
      key: "nonBillableKm",
      width: 14,
    },
    {
      header: "Очакван приход",
      key: "expectedRevenue",
      width: 17,
    },
    {
      header: "Призната сума",
      key: "settlementAmount",
      width: 17,
    },
    {
      header: "Settlement checked",
      key: "settlementCheckedCount",
      width: 17,
    },
    {
      header: "Разлика",
      key: "settlementDifference",
      width: 15,
    },
    {
      header: "Реален приход",
      key: "revenue",
      width: 17,
    },
    {
      header: "Разход",
      key: "cost",
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
  ];

  worksheet.addRows(
    rows.map((row) => ({
      ...row,
      totalKm: roundValue(row.totalKm),
      billableKm: roundValue(row.billableKm),
      nonBillableKm: roundValue(row.nonBillableKm),
      expectedRevenue: roundValue(row.expectedRevenue),
      settlementAmount: roundValue(row.settlementAmount),
      settlementDifference: roundValue(row.settlementDifference),
      revenue: roundValue(row.revenue),
      cost: roundValue(row.cost),
      profit: roundValue(row.profit),
      margin:
        row.margin === null
          ? null
          : roundValue(row.margin) / 100,
    })),
  );

  applyStandardSheetSetup(worksheet, "M1");
  styleFinancialRows(worksheet);
}

function addCourseSheet(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  rows: readonly CourseReportRow[],
): void {
  const worksheet =
    workbook.addWorksheet(
      sheetName,
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
      header: "Курс",
      key: "courseLabel",
      width: 24,
    },
    {
      header: "Клиент",
      key: "customerName",
      width: 24,
    },
    {
      header: "Камион",
      key: "truckName",
      width: 18,
    },
    {
      header: "Рег. номер",
      key: "truckLicensePlate",
      width: 16,
    },
    {
      header: "Общо км",
      key: "totalKm",
      width: 13,
    },
    {
      header: "Платими км",
      key: "billableKm",
      width: 13,
    },
    {
      header: "Неплатими км",
      key: "nonBillableKm",
      width: 14,
    },
    {
      header: "Очакван приход",
      key: "expectedRevenue",
      width: 17,
    },
    {
      header: "Призната сума",
      key: "settlementAmount",
      width: 17,
    },
    {
      header: "Разлика",
      key: "settlementDifference",
      width: 15,
    },
    {
      header: "Settlement status",
      key: "settlementStatus",
      width: 18,
    },
    {
      header: "Реален приход",
      key: "revenue",
      width: 17,
    },
    {
      header: "Разход",
      key: "cost",
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
      header: "Course ID",
      key: "id",
      width: 28,
    },
  ];

  worksheet.addRows(
    rows.map((row) => ({
      id: row.id,
      date: row.courseDate,
      courseLabel: row.courseLabel,
      customerName: row.customerName,
      truckName:
        row.truckName ||
        "Без избран камион",
      truckLicensePlate:
        row.truckLicensePlate,
      totalKm: roundValue(row.totalKm),
      billableKm: roundValue(row.billableKm),
      nonBillableKm: roundValue(row.nonBillableKm),
      expectedRevenue: roundValue(row.expectedRevenue),
      settlementAmount: roundNullableValue(row.settlementAmount),
      settlementDifference: roundNullableValue(row.settlementDifference),
      settlementStatus: formatSettlementStatus(row.settlementStatus),
      revenue: roundValue(row.revenue),
      cost: roundValue(row.cost),
      profit: roundValue(row.profit),
      margin:
        row.margin === null
          ? null
          : roundValue(row.margin) / 100,
    })),
  );

  applyStandardSheetSetup(worksheet, "Q1");
  worksheet.getColumn("date").numFmt =
    "dd.mm.yyyy";
  styleFinancialRows(worksheet);
}

function applyStandardSheetSetup(
  worksheet: ExcelJS.Worksheet,
  autoFilterEndCell: string,
): void {
  worksheet.autoFilter = {
    from: "A1",
    to: autoFilterEndCell,
  };

  worksheet.pageSetup = {
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
  };

  styleHeaderRow(worksheet);

  for (const columnKey of [
    "totalKm",
    "billableKm",
    "nonBillableKm",
  ]) {
    const column =
      worksheet.getColumn(columnKey);

    if (column) {
      column.numFmt = "#,##0.00";
    }
  }

  for (const columnKey of [
    "expectedRevenue",
    "settlementAmount",
    "settlementDifference",
    "revenue",
    "cost",
    "profit",
  ]) {
    const column =
      worksheet.getColumn(columnKey);

    if (column) {
      column.numFmt =
        '#,##0.00 [$€-1]';
    }
  }

  const marginColumn =
    worksheet.getColumn("margin");

  if (marginColumn) {
    marginColumn.numFmt = "0.00%";
  }
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

function styleFinancialRows(
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
      row.getCell("profit");

    styleProfitCell(profitCell);
  }
}

function styleProfitCell(
  cell: ExcelJS.Cell,
): void {
  const profit =
    Number(cell.value);

  if (
    Number.isFinite(profit) &&
    profit < 0
  ) {
    cell.font = {
      bold: true,
      color: {
        argb: "FFB91C1C",
      },
    };

    cell.fill = {
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
    cell.font = {
      bold: true,
      color: {
        argb: "FF047857",
      },
    };
  }
}

function calculateAggregateTotals(
  courses: readonly CourseReportRow[],
): AggregateReportRow {
  const totals: AggregateReportRow = {
    id: "all-courses",
    label: "Всички курсове",
    courseCount: 0,
    totalKm: 0,
    billableKm: 0,
    nonBillableKm: 0,
    expectedRevenue: 0,
    settlementAmount: 0,
    settlementDifference: 0,
    settlementCheckedCount: 0,
    revenue: 0,
    cost: 0,
    profit: 0,
    margin: null,
  };

  for (const course of courses) {
    totals.courseCount += 1;
    totals.totalKm += course.totalKm;
    totals.billableKm +=
      course.billableKm;
    totals.nonBillableKm +=
      course.nonBillableKm;
    totals.expectedRevenue +=
      course.expectedRevenue;

    if (course.settlementAmount !== null) {
      totals.settlementAmount +=
        course.settlementAmount;
      totals.settlementCheckedCount += 1;
    }

    totals.settlementDifference +=
      course.settlementDifference ?? 0;
    totals.revenue += course.revenue;
    totals.cost += course.cost;
    totals.profit += course.profit;
  }

  totals.margin =
    totals.revenue > 0
      ? (totals.profit /
          totals.revenue) *
        100
      : null;

  return totals;
}

function aggregateCourses(
  courses: readonly CourseReportRow[],
  getGroup: (
    course: CourseReportRow,
  ) => {
    id: string;
    label: string;
  },
): AggregateReportRow[] {
  const groups = new Map<
    string,
    AggregateReportRow
  >();

  for (const course of courses) {
    const group = getGroup(course);

    const existingRow =
      groups.get(group.id) ?? {
        id: group.id,
        label: group.label,
        courseCount: 0,
        totalKm: 0,
        billableKm: 0,
        nonBillableKm: 0,
        expectedRevenue: 0,
        settlementAmount: 0,
        settlementDifference: 0,
        settlementCheckedCount: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
        margin: null,
      };

    existingRow.courseCount += 1;
    existingRow.totalKm +=
      course.totalKm;
    existingRow.billableKm +=
      course.billableKm;
    existingRow.nonBillableKm +=
      course.nonBillableKm;
    existingRow.expectedRevenue +=
      course.expectedRevenue;

    if (course.settlementAmount !== null) {
      existingRow.settlementAmount +=
        course.settlementAmount;
      existingRow.settlementCheckedCount += 1;
    }

    existingRow.settlementDifference +=
      course.settlementDifference ?? 0;
    existingRow.revenue +=
      course.revenue;
    existingRow.cost += course.cost;
    existingRow.profit += course.profit;

    groups.set(group.id, existingRow);
  }

  return Array.from(groups.values())
    .map((row) => ({
      ...row,
      margin:
        row.revenue > 0
          ? (row.profit /
              row.revenue) *
            100
          : null,
    }))
    .sort(
      (firstRow, secondRow) =>
        secondRow.profit -
        firstRow.profit,
    );
}

function buildReportFiltersFromSearchParams(
  searchParams: URLSearchParams,
): ReportFilters {
  const rawDateFrom = normalizeDateParam(
    searchParams.get("dateFrom") ?? "",
  );

  const rawDateTo = normalizeDateParam(
    searchParams.get("dateTo") ?? "",
  );

  const dateFrom =
    rawDateFrom && rawDateTo && rawDateFrom > rawDateTo
      ? rawDateTo
      : rawDateFrom;

  const dateTo =
    rawDateFrom && rawDateTo && rawDateFrom > rawDateTo
      ? rawDateFrom
      : rawDateTo;

  const dateFromDate =
    dateFrom === ""
      ? null
      : parseDateInputStart(dateFrom);

  const dateToExclusiveDate =
    dateTo === ""
      ? null
      : parseDateInputExclusiveEnd(dateTo);

  const customerId = normalizeIdParam(
    searchParams.get("customerId") ?? "",
  );

  const truckId = normalizeIdParam(
    searchParams.get("truckId") ?? "",
  );

  const hasDateFilter =
    dateFrom !== "" || dateTo !== "";

  return {
    dateFrom,
    dateTo,
    dateFromDate,
    dateToExclusiveDate,
    customerId,
    truckId,
    hasDateFilter,
    hasActiveFilter:
      hasDateFilter ||
      customerId !== "" ||
      truckId !== "",
  };
}

function buildCourseWhere(
  filters: ReportFilters,
): Prisma.CourseWhereInput | undefined {
  const conditions: Prisma.CourseWhereInput[] = [];

  const dateWhere =
    buildCourseDateWhere(filters);

  if (dateWhere) {
    conditions.push(dateWhere);
  }

  if (filters.customerId !== "") {
    conditions.push({
      customerId: filters.customerId,
    });
  }

  if (filters.truckId !== "") {
    conditions.push({
      truckId: filters.truckId,
    });
  }

  if (conditions.length === 0) {
    return undefined;
  }

  if (conditions.length === 1) {
    return conditions[0];
  }

  return {
    AND: conditions,
  };
}

function buildCourseDateWhere(
  filters: ReportFilters,
): Prisma.CourseWhereInput | undefined {
  if (!filters.hasDateFilter) {
    return undefined;
  }

  const plannedDateFilter: Prisma.DateTimeNullableFilter = {
    not: null,
  };

  const createdAtFilter: Prisma.DateTimeFilter = {};

  if (filters.dateFromDate) {
    plannedDateFilter.gte =
      filters.dateFromDate;

    createdAtFilter.gte =
      filters.dateFromDate;
  }

  if (filters.dateToExclusiveDate) {
    plannedDateFilter.lt =
      filters.dateToExclusiveDate;

    createdAtFilter.lt =
      filters.dateToExclusiveDate;
  }

  return {
    OR: [
      {
        plannedDate: plannedDateFilter,
      },
      {
        plannedDate: null,
        createdAt: createdAtFilter,
      },
    ],
  };
}

function formatPeriodText(
  filters: ReportFilters,
): string {
  if (!filters.hasDateFilter) {
    return "Всички дати";
  }

  if (
    filters.dateFrom !== "" &&
    filters.dateTo !== ""
  ) {
    return `${filters.dateFrom} - ${filters.dateTo}`;
  }

  if (filters.dateFrom !== "") {
    return `От ${filters.dateFrom}`;
  }

  return `До ${filters.dateTo}`;
}

function normalizeDateParam(
  value: string,
): string {
  const trimmedValue = value.trim();

  return /^\d{4}-\d{2}-\d{2}$/.test(trimmedValue)
    ? trimmedValue
    : "";
}

function normalizeIdParam(
  value: string,
): string {
  return value.trim();
}

function parseDateInputStart(
  value: string,
): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function parseDateInputExclusiveEnd(
  value: string,
): Date {
  const date = parseDateInputStart(value);

  date.setUTCDate(date.getUTCDate() + 1);

  return date;
}

function toNullableNumber(
  value: unknown,
): number | null {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const parsedValue = Number(value);

  return Number.isFinite(parsedValue)
    ? parsedValue
    : null;
}

function toNumber(value: unknown): number {
  return toNullableNumber(value) ?? 0;
}

function roundValue(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundNullableValue(
  value: number | null,
): number | null {
  return value === null
    ? null
    : roundValue(value);
}

function formatSettlementStatus(
  value: string,
): string {
  switch (value) {
    case "OK":
      return "OK";
    case "UNDERPAID":
      return "Underpaid";
    case "OVERPAID":
      return "Overpaid";
    case "DISPUTED":
      return "Disputed";
    case "NOT_CHECKED":
      return "Not checked";
    default:
      return value || "Not checked";
  }
}

function createExportFileName(
  filters: ReportFilters,
): string {
  if (
    filters.dateFrom !== "" &&
    filters.dateTo !== ""
  ) {
    return `saleks-profit-report-${filters.dateFrom}-to-${filters.dateTo}.xlsx`;
  }

  if (filters.dateFrom !== "") {
    return `saleks-profit-report-from-${filters.dateFrom}.xlsx`;
  }

  if (filters.dateTo !== "") {
    return `saleks-profit-report-to-${filters.dateTo}.xlsx`;
  }

  return `saleks-profit-report-${formatDateForFile(
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