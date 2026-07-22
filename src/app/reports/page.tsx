import type { ReactNode } from "react";
import type { Prisma } from "@/generated/prisma/client";

import { AppShell } from "@/components/layout/AppShell";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type ReportsPageProps = {
  searchParams?: Promise<{
    dateFrom?: string | string[];
    dateTo?: string | string[];
  }>;
};

type ReportDateFilters = {
  dateFrom: string;
  dateTo: string;
  dateFromDate: Date | null;
  dateToExclusiveDate: Date | null;
  hasActiveFilter: boolean;
};

type DatePreset = {
  label: string;
  href: string;
};

type CourseReportRow = {
  id: string;
  courseLabel: string;
  courseDate: Date;
  customerId: string;
  customerName: string;
  truckId: string | null;
  truckLabel: string;
  totalKm: number;
  billableKm: number;
  nonBillableKm: number;
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
  revenue: number;
  cost: number;
  profit: number;
  margin: number | null;
};

type SummaryCardProps = {
  label: string;
  value: string;
  tone?: "default" | "positive" | "negative";
};

const currencyFormatter = new Intl.NumberFormat(
  "bg-BG",
  {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  },
);

const numberFormatter = new Intl.NumberFormat(
  "bg-BG",
  {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  },
);

const percentFormatter = new Intl.NumberFormat(
  "bg-BG",
  {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  },
);

const dateFormatter = new Intl.DateTimeFormat(
  "bg-BG",
  {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  },
);

export default async function ReportsPage({
  searchParams,
}: ReportsPageProps) {
  const resolvedSearchParams =
    (await searchParams) ?? {};

  const filters = buildReportDateFilters(
    resolvedSearchParams,
  );

  const presets = buildDatePresets();

  const rawCourses =
    await prisma.course.findMany({
      where: buildCourseDateWhere(filters),

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
    });

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

      const revenue =
        toNumber(course.agreedPrice) +
        toNumber(course.waitingAmount);

      const cost = course.costs.reduce(
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

        truckLabel: course.truck
          ? `${course.truck.name} — ${course.truck.licensePlate}`
          : "Без избран камион",

        totalKm,
        billableKm,
        nonBillableKm,
        revenue,
        cost,
        profit,
        margin,
      };
    });

  const totals = calculateAggregateTotals(
    courses,
  );

  const profitByCustomer =
    aggregateCourses(
      courses,
      (course) => ({
        id: course.customerId,
        label: course.customerName,
      }),
    );

  const profitByTruck = aggregateCourses(
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

  return (
    <AppShell title="Reports">
      <div className="space-y-6">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Financial overview
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {formatReportPeriodDescription(filters)}
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Отчетът използва записаните course cost records. Ако курс е
                преизчислен в /courses, натисни Обнови на курса, за да влезе
                новата стойност и в reports.
              </p>
            </div>

            <form
              action="/reports"
              className="grid gap-3 sm:grid-cols-[minmax(150px,1fr)_minmax(150px,1fr)_auto_auto]"
            >
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                От дата
                <input
                  type="date"
                  name="dateFrom"
                  defaultValue={filters.dateFrom}
                  max={filters.dateTo || undefined}
                  className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                До дата
                <input
                  type="date"
                  name="dateTo"
                  defaultValue={filters.dateTo}
                  min={filters.dateFrom || undefined}
                  className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                />
              </label>

              <button
                type="submit"
                className="inline-flex h-10 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 sm:self-end"
              >
                Зареди
              </button>

              <a
                href="/reports"
                className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300 sm:self-end"
              >
                Всички
              </a>
            </form>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {presets.map((preset) => (
              <a
                key={preset.label}
                href={preset.href}
                className="inline-flex h-8 items-center rounded-full border border-slate-300 bg-slate-50 px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
              >
                {preset.label}
              </a>
            ))}
          </div>
        </section>

        <section
          aria-label="Reports summary"
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8"
        >
          <SummaryCard
            label="Курсове"
            value={String(courses.length)}
          />

          <SummaryCard
            label="Общо км"
            value={`${formatNumber(
              totals.totalKm,
            )} km`}
          />

          <SummaryCard
            label="Платими км"
            value={`${formatNumber(
              totals.billableKm,
            )} km`}
          />

          <SummaryCard
            label="Неплатими км"
            value={`${formatNumber(
              totals.nonBillableKm,
            )} km`}
          />

          <SummaryCard
            label="Общ приход"
            value={formatCurrency(
              totals.revenue,
            )}
          />

          <SummaryCard
            label="Общ разход"
            value={formatCurrency(
              totals.cost,
            )}
          />

          <SummaryCard
            label="Обща печалба"
            value={formatCurrency(
              totals.profit,
            )}
            tone={
              totals.profit > 0
                ? "positive"
                : totals.profit < 0
                  ? "negative"
                  : "default"
            }
          />

          <SummaryCard
            label="Курсове на загуба"
            value={String(
              lossCourses.length,
            )}
            tone={
              lossCourses.length > 0
                ? "negative"
                : "default"
            }
          />
        </section>

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Печалба по клиент
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Приход, разход и печалба за всеки клиент.
            </p>
          </div>

          <ReportAggregateTable
            rows={profitByCustomer}
            emptyMessage="Няма записани курсове за отчет по клиент в избрания период."
          />
        </section>

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Печалба по камион
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Финансов резултат и километри за всеки камион.
            </p>
          </div>

          <ReportAggregateTable
            rows={profitByTruck}
            emptyMessage="Няма записани курсове за отчет по камион в избрания период."
          />
        </section>

        <section className="rounded-lg border border-red-200 bg-white shadow-sm">
          <div className="border-b border-red-100 px-5 py-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Курсове на загуба
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Курсове, при които общият разход е по-висок от прихода.
            </p>
          </div>

          <LossCoursesTable
            courses={lossCourses}
          />
        </section>
      </div>
    </AppShell>
  );
}

function SummaryCard({
  label,
  value,
  tone = "default",
}: SummaryCardProps) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p
        className={[
          "mt-1 text-xl font-semibold",
          tone === "positive"
            ? "text-emerald-700"
            : tone === "negative"
              ? "text-red-700"
              : "text-slate-900",
        ].join(" ")}
      >
        {value}
      </p>
    </article>
  );
}

function ReportAggregateTable({
  rows,
  emptyMessage,
}: {
  rows: readonly AggregateReportRow[];
  emptyMessage: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="px-5 py-8 text-sm text-slate-500">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1100px] border-collapse text-sm">
        <thead className="bg-slate-50">
          <tr>
            <ReportHeaderCell>
              Име
            </ReportHeaderCell>

            <ReportHeaderCell align="right">
              Курсове
            </ReportHeaderCell>

            <ReportHeaderCell align="right">
              Общо км
            </ReportHeaderCell>

            <ReportHeaderCell align="right">
              Платими км
            </ReportHeaderCell>

            <ReportHeaderCell align="right">
              Неплатими км
            </ReportHeaderCell>

            <ReportHeaderCell align="right">
              Приход
            </ReportHeaderCell>

            <ReportHeaderCell align="right">
              Разход
            </ReportHeaderCell>

            <ReportHeaderCell align="right">
              Печалба
            </ReportHeaderCell>

            <ReportHeaderCell align="right">
              Марж
            </ReportHeaderCell>
          </tr>
        </thead>

        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="border-t border-slate-100 hover:bg-slate-50"
            >
              <ReportDataCell>
                <span className="font-medium text-slate-900">
                  {row.label}
                </span>
              </ReportDataCell>

              <ReportDataCell align="right">
                {row.courseCount}
              </ReportDataCell>

              <ReportDataCell align="right">
                {formatNumber(row.totalKm)}
              </ReportDataCell>

              <ReportDataCell align="right">
                {formatNumber(
                  row.billableKm,
                )}
              </ReportDataCell>

              <ReportDataCell align="right">
                {formatNumber(
                  row.nonBillableKm,
                )}
              </ReportDataCell>

              <ReportDataCell align="right">
                {formatCurrency(
                  row.revenue,
                )}
              </ReportDataCell>

              <ReportDataCell align="right">
                {formatCurrency(
                  row.cost,
                )}
              </ReportDataCell>

              <ReportDataCell
                align="right"
                tone={
                  row.profit > 0
                    ? "positive"
                    : row.profit < 0
                      ? "negative"
                      : "default"
                }
              >
                {formatCurrency(
                  row.profit,
                )}
              </ReportDataCell>

              <ReportDataCell
                align="right"
                tone={
                  row.margin !== null &&
                  row.margin > 0
                    ? "positive"
                    : row.margin !== null &&
                        row.margin < 0
                      ? "negative"
                      : "default"
                }
              >
                {formatPercent(
                  row.margin,
                )}
              </ReportDataCell>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LossCoursesTable({
  courses,
}: {
  courses: readonly CourseReportRow[];
}) {
  if (courses.length === 0) {
    return (
      <div className="px-5 py-8">
        <p className="text-sm font-medium text-emerald-700">
          Няма записани курсове на загуба в избрания период.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1000px] border-collapse text-sm">
        <thead className="bg-red-50">
          <tr>
            <ReportHeaderCell>
              Курс
            </ReportHeaderCell>

            <ReportHeaderCell>
              Дата
            </ReportHeaderCell>

            <ReportHeaderCell>
              Клиент
            </ReportHeaderCell>

            <ReportHeaderCell>
              Камион
            </ReportHeaderCell>

            <ReportHeaderCell align="right">
              Общо км
            </ReportHeaderCell>

            <ReportHeaderCell align="right">
              Приход
            </ReportHeaderCell>

            <ReportHeaderCell align="right">
              Разход
            </ReportHeaderCell>

            <ReportHeaderCell align="right">
              Загуба
            </ReportHeaderCell>
          </tr>
        </thead>

        <tbody>
          {courses.map((course) => (
            <tr
              key={course.id}
              className="border-t border-red-100 hover:bg-red-50/50"
            >
              <ReportDataCell>
                <span className="font-medium text-slate-900">
                  {course.courseLabel}
                </span>
              </ReportDataCell>

              <ReportDataCell>
                {dateFormatter.format(
                  course.courseDate,
                )}
              </ReportDataCell>

              <ReportDataCell>
                {course.customerName}
              </ReportDataCell>

              <ReportDataCell>
                {course.truckLabel}
              </ReportDataCell>

              <ReportDataCell align="right">
                {formatNumber(
                  course.totalKm,
                )}
              </ReportDataCell>

              <ReportDataCell align="right">
                {formatCurrency(
                  course.revenue,
                )}
              </ReportDataCell>

              <ReportDataCell align="right">
                {formatCurrency(
                  course.cost,
                )}
              </ReportDataCell>

              <ReportDataCell
                align="right"
                tone="negative"
              >
                {formatCurrency(
                  course.profit,
                )}
              </ReportDataCell>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReportHeaderCell({
  children,
  align = "left",
}: {
  children: ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={[
        "whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600",
        align === "right"
          ? "text-right"
          : "text-left",
      ].join(" ")}
    >
      {children}
    </th>
  );
}

function ReportDataCell({
  children,
  align = "left",
  tone = "default",
}: {
  children: ReactNode;
  align?: "left" | "right";
  tone?: "default" | "positive" | "negative";
}) {
  return (
    <td
      className={[
        "whitespace-nowrap px-4 py-3",
        align === "right"
          ? "text-right"
          : "text-left",
        tone === "positive"
          ? "font-medium text-emerald-700"
          : tone === "negative"
            ? "font-medium text-red-700"
            : "text-slate-700",
      ].join(" ")}
    >
      {children}
    </td>
  );
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

function buildReportDateFilters(
  searchParams: {
    dateFrom?: string | string[];
    dateTo?: string | string[];
  },
): ReportDateFilters {
  const rawDateFrom = normalizeDateParam(
    readSingleSearchParam(searchParams.dateFrom),
  );

  const rawDateTo = normalizeDateParam(
    readSingleSearchParam(searchParams.dateTo),
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

  return {
    dateFrom,
    dateTo,
    dateFromDate,
    dateToExclusiveDate,
    hasActiveFilter:
      dateFrom !== "" || dateTo !== "",
  };
}

function buildCourseDateWhere(
  filters: ReportDateFilters,
): Prisma.CourseWhereInput | undefined {
  if (!filters.hasActiveFilter) {
    return undefined;
  }

  const plannedDateFilter: Prisma.DateTimeNullableFilter = {
    not: null,
  };

  const createdAtFilter: Prisma.DateTimeFilter = {};

  if (filters.dateFromDate) {
    plannedDateFilter.gte = filters.dateFromDate;
    createdAtFilter.gte = filters.dateFromDate;
  }

  if (filters.dateToExclusiveDate) {
    plannedDateFilter.lt = filters.dateToExclusiveDate;
    createdAtFilter.lt = filters.dateToExclusiveDate;
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

function formatReportPeriodDescription(
  filters: ReportDateFilters,
): string {
  if (!filters.hasActiveFilter) {
    return "Financial overview based on all saved courses.";
  }

  if (filters.dateFrom !== "" && filters.dateTo !== "") {
    return `Financial overview for courses from ${formatDateInputForDisplay(
      filters.dateFrom,
    )} to ${formatDateInputForDisplay(filters.dateTo)}.`;
  }

  if (filters.dateFrom !== "") {
    return `Financial overview for courses from ${formatDateInputForDisplay(
      filters.dateFrom,
    )} onward.`;
  }

  return `Financial overview for courses until ${formatDateInputForDisplay(
    filters.dateTo,
  )}.`;
}

function buildDatePresets(): DatePreset[] {
  const today = startOfDay(new Date());

  const currentWeekStart =
    startOfIsoWeek(today);

  const currentMonthStart =
    new Date(
      today.getFullYear(),
      today.getMonth(),
      1,
    );

  const previousMonthStart =
    new Date(
      today.getFullYear(),
      today.getMonth() - 1,
      1,
    );

  const previousMonthEnd =
    new Date(
      today.getFullYear(),
      today.getMonth(),
      0,
    );

  const last30DaysStart = new Date(today);
  last30DaysStart.setDate(
    today.getDate() - 29,
  );

  return [
    {
      label: "Тази седмица",
      href: buildReportsHref({
        dateFrom: formatDateInput(
          currentWeekStart,
        ),
        dateTo: formatDateInput(today),
      }),
    },
    {
      label: "Този месец",
      href: buildReportsHref({
        dateFrom: formatDateInput(
          currentMonthStart,
        ),
        dateTo: formatDateInput(today),
      }),
    },
    {
      label: "Минал месец",
      href: buildReportsHref({
        dateFrom: formatDateInput(
          previousMonthStart,
        ),
        dateTo: formatDateInput(
          previousMonthEnd,
        ),
      }),
    },
    {
      label: "Последни 30 дни",
      href: buildReportsHref({
        dateFrom: formatDateInput(
          last30DaysStart,
        ),
        dateTo: formatDateInput(today),
      }),
    },
  ];
}

function buildReportsHref({
  dateFrom,
  dateTo,
}: {
  dateFrom: string;
  dateTo: string;
}): string {
  const params = new URLSearchParams();

  if (dateFrom !== "") {
    params.set("dateFrom", dateFrom);
  }

  if (dateTo !== "") {
    params.set("dateTo", dateTo);
  }

  const queryString = params.toString();

  return queryString === ""
    ? "/reports"
    : `/reports?${queryString}`;
}

function readSingleSearchParam(
  value: string | string[] | undefined,
): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function normalizeDateParam(value: string): string {
  const trimmedValue = value.trim();

  return /^\d{4}-\d{2}-\d{2}$/.test(trimmedValue)
    ? trimmedValue
    : "";
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

function formatDateInputForDisplay(
  value: string,
): string {
  return dateFormatter.format(
    parseDateInputStart(value),
  );
}

function startOfDay(date: Date): Date {
  const copy = new Date(date);

  copy.setHours(0, 0, 0, 0);

  return copy;
}

function startOfIsoWeek(date: Date): Date {
  const copy = startOfDay(date);

  const dayOffset =
    (copy.getDay() + 6) % 7;

  copy.setDate(copy.getDate() - dayOffset);

  return copy;
}

function formatDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");
  const day = String(
    date.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
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

function formatCurrency(
  value: number,
): string {
  return currencyFormatter.format(
    roundValue(value),
  );
}

function formatNumber(
  value: number,
): string {
  return numberFormatter.format(
    roundValue(value),
  );
}

function formatPercent(
  value: number | null,
): string {
  if (value === null) {
    return "—";
  }

  return `${percentFormatter.format(
    roundValue(value),
  )}%`;
}

function roundValue(value: number): number {
  return Math.round(value * 100) / 100;
}