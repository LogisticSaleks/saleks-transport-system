"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

export type DashboardTruckOption = {
  id: string;
  name: string;
  licensePlate: string;
  status: string;
};

export type WeeklyTruckRevenueReportCourseRow = {
  id: string;
  courseId: string | null;
  courseDate: string;
  customerNameAtReport: string;
  courseTypeAtReport: "ROUND_TRIP" | "SHUNT";
  containerNumber: string | null;
  routeLabel: string;
  tariffNameAtBooking: string | null;
  agreedPrice: number;
  waitingAmount: number;
  expectedRevenue: number;
  settlementAmount: number | null;
  settlementDifference: number | null;
  settlementStatus:
    | "NOT_CHECKED"
    | "OK"
    | "UNDERPAID"
    | "OVERPAID"
    | "DISPUTED";
  settlementReference: string | null;
  settlementNotes: string | null;
  totalRevenue: number;
};

export type WeeklyTruckRevenueReportRow = {
  id: string;
  year: number;
  weekNumber: number;
  weekStartDate: string;
  weekEndDate: string;
  truckId: string | null;
  truckNameAtReport: string;
  truckLicensePlateAtReport: string;
  courseCount: number;
  expectedRevenue: number;
  settlementAmount: number;
  settlementDifference: number;
  settlementCheckedCount: number;
  notCheckedCount: number;
  underpaidCount: number;
  totalRevenue: number;
  generatedAt: string;
  isLocked: boolean;
  courses: WeeklyTruckRevenueReportCourseRow[];
};

type WeeklyReportsApiResponse = {
  reports?: WeeklyTruckRevenueReportRow[];
  report?: WeeklyTruckRevenueReportRow;
  error?: string;
};

type CourseSettlementApiResponse = {
  course?: {
    id?: string;
    settlementAmount?: number | string | null;
    settlementStatus?: string | null;
  };
  error?: string;
};

type SaveSettlementInput = {
  reportId: string;
  course: WeeklyTruckRevenueReportCourseRow;
  value: string;
};

type DashboardWeeklyReportsProps = {
  initialYear: number;
  initialWeekNumber: number;
  trucks: readonly DashboardTruckOption[];
  initialReports: readonly WeeklyTruckRevenueReportRow[];
};

export default function DashboardWeeklyReports({
  initialYear,
  initialWeekNumber,
  trucks,
  initialReports,
}: DashboardWeeklyReportsProps) {
  const [year, setYear] = useState(String(initialYear));
  const [weekNumber, setWeekNumber] = useState(
    String(initialWeekNumber),
  );
  const [reports, setReports] = useState<
    WeeklyTruckRevenueReportRow[]
  >([...initialReports]);
  const [expandedReportId, setExpandedReportId] =
    useState<string | null>(null);
  const [isLoadingReports, setIsLoadingReports] =
    useState(false);
  const [isGeneratingReports, setIsGeneratingReports] =
    useState(false);
  const [isUpdatingLock, setIsUpdatingLock] =
    useState<string | null>(null);
  const [
    savingSettlementCourseId,
    setSavingSettlementCourseId,
  ] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);
  const [successMessage, setSuccessMessage] =
    useState<string | null>(null);

  const parsedYear = parsePositiveInteger(year);
  const parsedWeekNumber = parsePositiveInteger(weekNumber);

  const hasValidWeekSelection =
    parsedYear !== null &&
    parsedWeekNumber !== null &&
    parsedWeekNumber >= 1 &&
    parsedWeekNumber <= 53;

  const sortedReports = useMemo(
    () =>
      [...reports].sort((firstReport, secondReport) =>
        `${firstReport.truckNameAtReport} ${firstReport.truckLicensePlateAtReport}`.localeCompare(
          `${secondReport.truckNameAtReport} ${secondReport.truckLicensePlateAtReport}`,
          "bg-BG",
        ),
      ),
    [reports],
  );

  const dashboardTotals = useMemo(
    () => ({
      reportsCount: sortedReports.length,
      courseCount: sortedReports.reduce(
        (sum, report) => sum + report.courseCount,
        0,
      ),
      expectedRevenue: sortedReports.reduce(
        (sum, report) => sum + report.expectedRevenue,
        0,
      ),
      settlementAmount: sortedReports.reduce(
        (sum, report) => sum + report.settlementAmount,
        0,
      ),
      settlementDifference: sortedReports.reduce(
        (sum, report) => sum + report.settlementDifference,
        0,
      ),
      totalRevenue: sortedReports.reduce(
        (sum, report) => sum + report.totalRevenue,
        0,
      ),
      underpaidCount: sortedReports.reduce(
        (sum, report) => sum + report.underpaidCount,
        0,
      ),
      notCheckedCount: sortedReports.reduce(
        (sum, report) => sum + report.notCheckedCount,
        0,
      ),
      lockedCount: sortedReports.filter(
        (report) => report.isLocked,
      ).length,
    }),
    [sortedReports],
  );

  async function handleLoadReports(): Promise<void> {
    if (!hasValidWeekSelection) {
      setErrorMessage(
        "Въведи валидна година и седмица между 1 и 53.",
      );
      return;
    }

    setIsLoadingReports(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(
        `/api/weekly-truck-revenue-reports?year=${parsedYear}&weekNumber=${parsedWeekNumber}`,
      );

      const responseData =
        (await response.json().catch(() => null)) as
          | WeeklyReportsApiResponse
          | null;

      if (!response.ok) {
        throw new Error(
          responseData?.error ??
            "Седмичните отчети не можаха да бъдат заредени.",
        );
      }

      setReports(responseData?.reports ?? []);
      setExpandedReportId(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Седмичните отчети не можаха да бъдат заредени.",
      );
    } finally {
      setIsLoadingReports(false);
    }
  }

  async function handleGenerateReports(
    forceRefresh: boolean,
  ): Promise<void> {
    if (!hasValidWeekSelection) {
      setErrorMessage(
        "Въведи валидна година и седмица между 1 и 53.",
      );
      return;
    }

    if (trucks.length === 0) {
      setErrorMessage(
        "Няма активни камиони, за които да се генерира отчет.",
      );
      return;
    }

    setIsGeneratingReports(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const generatedReports: WeeklyTruckRevenueReportRow[] = [];

      for (const truck of trucks) {
        const response = await fetch(
          "/api/weekly-truck-revenue-reports",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              year: parsedYear,
              weekNumber: parsedWeekNumber,
              truckId: truck.id,
              forceRefresh,
            }),
          },
        );

        const responseData =
          (await response.json().catch(() => null)) as
            | WeeklyReportsApiResponse
            | null;

        if (!response.ok || !responseData?.report) {
          throw new Error(
            responseData?.error ??
              `Отчетът за ${truck.name} не можа да бъде генериран.`,
          );
        }

        generatedReports.push(responseData.report);
      }

      setReports(generatedReports);
      setExpandedReportId(null);
      setSuccessMessage(
        forceRefresh
          ? "Седмичните отчети са обновени."
          : "Седмичните отчети са генерирани.",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Седмичните отчети не можаха да бъдат генерирани.",
      );
    } finally {
      setIsGeneratingReports(false);
    }
  }

  async function handleToggleLock(
    report: WeeklyTruckRevenueReportRow,
  ): Promise<void> {
    setIsUpdatingLock(report.id);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(
        "/api/weekly-truck-revenue-reports",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: report.id,
            isLocked: !report.isLocked,
          }),
        },
      );

      const responseData =
        (await response.json().catch(() => null)) as
          | WeeklyReportsApiResponse
          | null;

      if (!response.ok || !responseData?.report) {
        throw new Error(
          responseData?.error ??
            "Статусът на отчета не можа да бъде обновен.",
        );
      }

      setReports((currentReports) =>
        currentReports.map((currentReport) =>
          currentReport.id === report.id
            ? responseData.report!
            : currentReport,
        ),
      );

      setSuccessMessage(
        responseData.report.isLocked
          ? "Отчетът е заключен."
          : "Отчетът е отключен.",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Статусът на отчета не можа да бъде обновен.",
      );
    } finally {
      setIsUpdatingLock(null);
    }
  }

  async function handleSaveSettlementAmount({
    reportId,
    course,
    value,
  }: SaveSettlementInput): Promise<void> {
    if (!course.courseId) {
      setErrorMessage(
        "Този ред няма връзка към оригиналния курс.",
      );
      return;
    }

    const parsedSettlementAmount =
      parseSettlementAmountInput(value);

    if (parsedSettlementAmount === "INVALID") {
      setErrorMessage(
        "Признатата сума трябва да бъде валидно неотрицателно число.",
      );
      return;
    }

    setSavingSettlementCourseId(course.courseId);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/courses", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: course.courseId,
          settlementAmount:
            parsedSettlementAmount,
        }),
      });

      const responseData =
        (await response.json().catch(() => null)) as
          | CourseSettlementApiResponse
          | null;

      if (!response.ok) {
        throw new Error(
          responseData?.error ??
            "Признатата сума не можа да бъде записана.",
        );
      }

      const apiSettlementAmount =
        hasOwn(
          responseData?.course ?? {},
          "settlementAmount",
        )
          ? parseApiNullableNumber(
              responseData?.course?.settlementAmount,
            )
          : parsedSettlementAmount;

      const fallbackDifference =
        apiSettlementAmount === null
          ? null
          : roundMoney(
              apiSettlementAmount -
                course.expectedRevenue,
            );

      const apiSettlementStatus =
        normalizeSettlementStatusFromUnknown(
          responseData?.course?.settlementStatus,
        );

      const nextSettlementStatus =
        apiSettlementStatus ??
        calculateSettlementStatus({
          settlementAmount:
            apiSettlementAmount,
          settlementDifference:
            fallbackDifference,
        });

      setReports((currentReports) =>
        updateReportsWithSettlementAmount(
          currentReports,
          {
            reportId,
            courseRowId: course.id,
            settlementAmount:
              apiSettlementAmount,
            settlementStatus:
              nextSettlementStatus,
          },
        ),
      );

      setSuccessMessage(
        "Признатата сума е записана.",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Признатата сума не можа да бъде записана.",
      );
    } finally {
      setSavingSettlementCourseId(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-400 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950">
              Седмични приходи по камион
            </h2>

            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
              Избери година и седмица, генерирай отчетите за
              активните камиони и ги отвори по всяко време.
              Тук се показват приходи по камион. Ако има призната
              сума от клиента, тя коригира реалния приход спрямо
              очакваната цена на курса.
            </p>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <label className="flex flex-col gap-1 text-sm font-semibold text-slate-800">
              Година
              <input
                type="number"
                min="2020"
                max="2100"
                value={year}
                onChange={(event) => {
                  setYear(event.target.value);
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className="h-10 w-32 rounded-md border border-slate-400 bg-white px-3 text-slate-950 shadow-sm outline-none transition hover:border-slate-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm font-semibold text-slate-800">
              Седмица
              <input
                type="number"
                min="1"
                max="53"
                value={weekNumber}
                onChange={(event) => {
                  setWeekNumber(event.target.value);
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className="h-10 w-28 rounded-md border border-slate-400 bg-white px-3 text-slate-950 shadow-sm outline-none transition hover:border-slate-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
              />
            </label>

            <button
              type="button"
              onClick={handleLoadReports}
              disabled={isLoadingReports || isGeneratingReports}
              className="inline-flex h-10 items-center justify-center rounded-md border border-slate-500 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoadingReports ? "Зарежда..." : "Зареди"}
            </button>

            <button
              type="button"
              onClick={() => handleGenerateReports(false)}
              disabled={isLoadingReports || isGeneratingReports}
              className="inline-flex h-10 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isGeneratingReports
                ? "Генерира..."
                : "Генерирай"}
            </button>

            <button
              type="button"
              onClick={() => handleGenerateReports(true)}
              disabled={isLoadingReports || isGeneratingReports}
              className="inline-flex h-10 items-center justify-center rounded-md border border-sky-300 bg-sky-50 px-4 text-sm font-semibold text-sky-800 shadow-sm transition hover:border-sky-400 hover:bg-sky-100 focus:outline-none focus:ring-2 focus:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Refresh
            </button>
          </div>
        </div>

        {(errorMessage || successMessage) && (
          <div className="mt-4">
            {errorMessage && (
              <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                {errorMessage}
              </p>
            )}

            {successMessage && (
              <p className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                {successMessage}
              </p>
            )}
          </div>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <MetricCard
          label="Отчети"
          value={String(dashboardTotals.reportsCount)}
        />

        <MetricCard
          label="Курсове"
          value={String(dashboardTotals.courseCount)}
        />

        <MetricCard
          label="Очакван приход"
          value={formatMoney(dashboardTotals.expectedRevenue)}
        />

        <MetricCard
          label="Реален приход"
          value={formatMoney(dashboardTotals.totalRevenue)}
        />

        <MetricCard
          label="Разлика"
          value={formatMoneyWithSign(
            dashboardTotals.settlementDifference,
          )}
          tone={getMoneyTone(
            dashboardTotals.settlementDifference,
          )}
        />

        <MetricCard
          label="Underpaid / Not checked"
          value={`${dashboardTotals.underpaidCount}/${dashboardTotals.notCheckedCount}`}
          tone={
            dashboardTotals.underpaidCount > 0
              ? "negative"
              : "default"
          }
        />
      </section>

      <section className="rounded-2xl border border-slate-400 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-300 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-950">
              Week {weekNumber} / {year}
            </h2>

            <p className="mt-1 text-sm text-slate-600">
              Запазени седмични отчети по камион.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/courses"
              className="inline-flex h-9 items-center justify-center rounded-md border border-slate-400 bg-white px-3 text-sm font-semibold text-slate-800 transition hover:border-slate-500 hover:bg-slate-100"
            >
              Към Courses
            </Link>

            <Link
              href="/trucks"
              className="inline-flex h-9 items-center justify-center rounded-md border border-slate-400 bg-white px-3 text-sm font-semibold text-slate-800 transition hover:border-slate-500 hover:bg-slate-100"
            >
              Към Trucks
            </Link>
          </div>
        </div>

        {sortedReports.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm font-medium text-slate-700">
              Няма запазени отчети за тази седмица.
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Натисни “Генерирай”, за да създадеш отчети за
              активните камиони.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="border-b border-slate-300 px-4 py-3">
                    Камион
                  </th>
                  <th className="border-b border-slate-300 px-4 py-3">
                    Седмица
                  </th>
                  <th className="border-b border-slate-300 px-4 py-3 text-right">
                    Курсове
                  </th>
                  <th className="border-b border-slate-300 px-4 py-3 text-right">
                    Общ приход
                  </th>
                  <th className="border-b border-slate-300 px-4 py-3">
                    Статус
                  </th>
                  <th className="border-b border-slate-300 px-4 py-3">
                    Генериран
                  </th>
                  <th className="border-b border-slate-300 px-4 py-3 text-right">
                    Действия
                  </th>
                </tr>
              </thead>

              <tbody>
                {sortedReports.map((report) => (
                  <ReportRows
                    key={report.id}
                    report={report}
                    isExpanded={expandedReportId === report.id}
                    isUpdatingLock={isUpdatingLock === report.id}
                    savingSettlementCourseId={
                      savingSettlementCourseId
                    }
                    onSaveSettlementAmount={
                      handleSaveSettlementAmount
                    }
                    onToggleDetails={() =>
                      setExpandedReportId((currentReportId) =>
                        currentReportId === report.id
                          ? null
                          : report.id,
                      )
                    }
                    onToggleLock={() => handleToggleLock(report)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function ReportRows({
  report,
  isExpanded,
  isUpdatingLock,
  savingSettlementCourseId,
  onSaveSettlementAmount,
  onToggleDetails,
  onToggleLock,
}: {
  report: WeeklyTruckRevenueReportRow;
  isExpanded: boolean;
  isUpdatingLock: boolean;
  savingSettlementCourseId: string | null;
  onSaveSettlementAmount: (
    input: SaveSettlementInput,
  ) => Promise<void>;
  onToggleDetails: () => void;
  onToggleLock: () => void;
}) {
  return (
    <>
      <tr className="align-top hover:bg-slate-50">
        <td className="border-b border-slate-200 px-4 py-3">
          <div className="font-semibold text-slate-950">
            {report.truckNameAtReport}
          </div>

          <div className="text-xs text-slate-500">
            {report.truckLicensePlateAtReport}
          </div>
        </td>

        <td className="border-b border-slate-200 px-4 py-3">
          <div className="font-medium text-slate-900">
            Week {report.weekNumber} / {report.year}
          </div>

          <div className="text-xs text-slate-500">
            {formatDate(report.weekStartDate)} –{" "}
            {formatDate(report.weekEndDate)}
          </div>
        </td>

        <td className="border-b border-slate-200 px-4 py-3 text-right font-semibold text-slate-950">
          {report.courseCount}
        </td>

        <td className="border-b border-slate-200 px-4 py-3 text-right">
          <div className="font-bold text-emerald-700">
            {formatMoney(report.totalRevenue)}
          </div>

          <div className="mt-1 space-y-0.5 text-xs text-slate-500">
            <div>
              Очакван: {formatMoney(report.expectedRevenue)}
            </div>
            <div>
              Признат: {formatMoney(report.settlementAmount)}
            </div>
            <div
              className={getMoneyTextClass(
                report.settlementDifference,
              )}
            >
              Разлика:{" "}
              {formatMoneyWithSign(report.settlementDifference)}
            </div>
          </div>
        </td>

        <td className="border-b border-slate-200 px-4 py-3">
          <span
            className={[
              "inline-flex rounded-full px-2 py-1 text-xs font-semibold",
              report.isLocked
                ? "bg-slate-200 text-slate-700"
                : "bg-emerald-100 text-emerald-800",
            ].join(" ")}
          >
            {report.isLocked ? "Заключен" : "Отворен"}
          </span>

          <div className="mt-1 space-y-0.5 text-xs text-slate-500">
            <div>
              Checked: {report.settlementCheckedCount}/{report.courseCount}
            </div>
            {report.underpaidCount > 0 && (
              <div className="font-semibold text-red-700">
                Underpaid: {report.underpaidCount}
              </div>
            )}
            {report.notCheckedCount > 0 && (
              <div className="font-semibold text-amber-700">
                Not checked: {report.notCheckedCount}
              </div>
            )}
          </div>
        </td>

        <td className="border-b border-slate-200 px-4 py-3 text-xs text-slate-600">
          {formatDateTime(report.generatedAt)}
        </td>

        <td className="border-b border-slate-200 px-4 py-3">
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onToggleDetails}
              className="inline-flex h-8 items-center justify-center rounded-md border border-slate-400 bg-white px-3 text-xs font-semibold text-slate-800 transition hover:border-slate-500 hover:bg-slate-100"
            >
              {isExpanded ? "Скрий" : "Детайли"}
            </button>

            <button
              type="button"
              onClick={onToggleLock}
              disabled={isUpdatingLock}
              className="inline-flex h-8 items-center justify-center rounded-md border border-sky-300 bg-sky-50 px-3 text-xs font-semibold text-sky-800 transition hover:border-sky-400 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isUpdatingLock
                ? "..."
                : report.isLocked
                  ? "Отключи"
                  : "Заключи"}
            </button>
          </div>
        </td>
      </tr>

      {isExpanded && (
        <tr>
          <td
            colSpan={7}
            className="border-b border-slate-300 bg-slate-50 px-4 py-4"
          >
            <ReportCoursesTable
              report={report}
              savingSettlementCourseId={
                savingSettlementCourseId
              }
              onSaveSettlementAmount={
                onSaveSettlementAmount
              }
            />
          </td>
        </tr>
      )}
    </>
  );
}

function ReportCoursesTable({
  report,
  savingSettlementCourseId,
  onSaveSettlementAmount,
}: {
  report: WeeklyTruckRevenueReportRow;
  savingSettlementCourseId: string | null;
  onSaveSettlementAmount: (
    input: SaveSettlementInput,
  ) => Promise<void>;
}) {
  if (report.courses.length === 0) {
    return (
      <p className="rounded-md border border-slate-300 bg-white px-3 py-3 text-sm text-slate-600">
        Няма курсове в този отчет.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-300 bg-white">
      <table className="w-full min-w-[1150px] border-collapse text-left text-xs">
        <thead className="bg-slate-100 uppercase tracking-wide text-slate-600">
          <tr>
            <th className="border-b border-slate-300 px-3 py-2">
              Дата
            </th>
            <th className="border-b border-slate-300 px-3 py-2">
              Клиент
            </th>
            <th className="border-b border-slate-300 px-3 py-2">
              Контейнер
            </th>
            <th className="border-b border-slate-300 px-3 py-2">
              Маршрут
            </th>
            <th className="border-b border-slate-300 px-3 py-2">
              Тарифа
            </th>
            <th className="border-b border-slate-300 px-3 py-2 text-right">
              Цена
            </th>
            <th className="border-b border-slate-300 px-3 py-2 text-right">
              Престой
            </th>
            <th className="border-b border-slate-300 px-3 py-2 text-right">
              Очакван
            </th>
            <th className="border-b border-slate-300 px-3 py-2 text-right">
              Призната
            </th>
            <th className="border-b border-slate-300 px-3 py-2 text-right">
              Разлика
            </th>
            <th className="border-b border-slate-300 px-3 py-2">
              Settlement
            </th>
            <th className="border-b border-slate-300 px-3 py-2 text-right">
              Приход
            </th>
          </tr>
        </thead>

        <tbody>
          {report.courses.map((course) => (
            <tr
              key={course.id}
              className="hover:bg-slate-50"
            >
              <td className="border-b border-slate-200 px-3 py-2 text-slate-700">
                {formatDate(course.courseDate)}
              </td>

              <td className="border-b border-slate-200 px-3 py-2 font-medium text-slate-900">
                {course.customerNameAtReport}
              </td>

              <td className="border-b border-slate-200 px-3 py-2 text-slate-700">
                {course.containerNumber ?? "—"}
              </td>

              <td className="border-b border-slate-200 px-3 py-2 text-slate-700">
                {course.routeLabel}
              </td>

              <td className="border-b border-slate-200 px-3 py-2 text-slate-700">
                {course.tariffNameAtBooking ?? "—"}
              </td>

              <td className="border-b border-slate-200 px-3 py-2 text-right text-slate-700">
                {formatMoney(course.agreedPrice)}
              </td>

              <td className="border-b border-slate-200 px-3 py-2 text-right text-slate-700">
                {formatMoney(course.waitingAmount)}
              </td>

              <td className="border-b border-slate-200 px-3 py-2 text-right text-slate-700">
                {formatMoney(course.expectedRevenue)}
              </td>

              <td className="border-b border-slate-200 px-3 py-2">
                <CourseSettlementInput
                  course={course}
                  isSaving={
                    savingSettlementCourseId ===
                    course.courseId
                  }
                  onSave={(value) =>
                    onSaveSettlementAmount({
                      reportId: report.id,
                      course,
                      value,
                    })
                  }
                />
              </td>

              <td
                className={[
                  "border-b border-slate-200 px-3 py-2 text-right font-semibold",
                  getMoneyTextClass(
                    course.settlementDifference,
                  ),
                ].join(" ")}
              >
                {formatNullableMoneyWithSign(
                  course.settlementDifference,
                )}
              </td>

              <td className="border-b border-slate-200 px-3 py-2">
                <SettlementStatusBadge
                  status={course.settlementStatus}
                />

                {course.settlementReference && (
                  <div className="mt-1 text-[11px] text-slate-500">
                    {course.settlementReference}
                  </div>
                )}
              </td>

              <td className="border-b border-slate-200 px-3 py-2 text-right font-semibold text-emerald-700">
                {formatMoney(course.totalRevenue)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CourseSettlementInput({
  course,
  isSaving,
  onSave,
}: {
  course: WeeklyTruckRevenueReportCourseRow;
  isSaving: boolean;
  onSave: (value: string) => Promise<void>;
}) {
  const initialValue =
    course.settlementAmount === null
      ? ""
      : formatNumberInputValue(
          course.settlementAmount,
        );

  const [value, setValue] =
    useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const isDirty =
    value.trim() !== initialValue.trim();

  const canSave =
    Boolean(course.courseId) &&
    isDirty &&
    !isSaving;

  async function handleSubmit(): Promise<void> {
    if (!canSave) {
      return;
    }

    await onSave(value);
  }

  return (
    <div className="flex min-w-[160px] items-center justify-end gap-1">
      <input
        type="number"
        min="0"
        step="0.01"
        value={value}
        placeholder="—"
        disabled={isSaving || !course.courseId}
        aria-label={`Призната сума за ${course.containerNumber ?? course.customerNameAtReport}`}
        onChange={(event) =>
          setValue(event.target.value)
        }
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            void handleSubmit();
          }
        }}
        className="h-8 w-24 rounded-md border border-slate-300 bg-white px-2 text-right text-xs text-slate-950 outline-none transition hover:border-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
      />

      <button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={!canSave}
        className="inline-flex h-8 items-center justify-center rounded-md border border-sky-300 bg-sky-50 px-2 text-xs font-semibold text-sky-800 transition hover:border-sky-400 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSaving ? "..." : "OK"}
      </button>
    </div>
  );
}

function SettlementStatusBadge({
  status,
}: {
  status: WeeklyTruckRevenueReportCourseRow["settlementStatus"];
}) {
  return (
    <span
      className={[
        "inline-flex rounded-full border px-2 py-1 text-[11px] font-semibold",
        getSettlementStatusClassName(status),
      ].join(" ")}
    >
      {formatSettlementStatus(status)}
    </span>
  );
}

function formatSettlementStatus(
  status: WeeklyTruckRevenueReportCourseRow["settlementStatus"],
): string {
  switch (status) {
    case "OK":
      return "OK";

    case "UNDERPAID":
      return "Underpaid";

    case "OVERPAID":
      return "Overpaid";

    case "DISPUTED":
      return "Disputed";

    case "NOT_CHECKED":
    default:
      return "Not checked";
  }
}

function getSettlementStatusClassName(
  status: WeeklyTruckRevenueReportCourseRow["settlementStatus"],
): string {
  switch (status) {
    case "OK":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "UNDERPAID":
      return "border-red-200 bg-red-50 text-red-700";

    case "OVERPAID":
      return "border-sky-200 bg-sky-50 text-sky-700";

    case "DISPUTED":
      return "border-purple-200 bg-purple-50 text-purple-700";

    case "NOT_CHECKED":
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

function updateReportsWithSettlementAmount(
  reports: readonly WeeklyTruckRevenueReportRow[],
  {
    reportId,
    courseRowId,
    settlementAmount,
    settlementStatus,
  }: {
    reportId: string;
    courseRowId: string;
    settlementAmount: number | null;
    settlementStatus: WeeklyTruckRevenueReportCourseRow["settlementStatus"];
  },
): WeeklyTruckRevenueReportRow[] {
  return reports.map((report) => {
    if (report.id !== reportId) {
      return report;
    }

    const courses = report.courses.map((course) => {
      if (course.id !== courseRowId) {
        return course;
      }

      const settlementDifference =
        settlementAmount === null
          ? null
          : roundMoney(
              settlementAmount -
                course.expectedRevenue,
            );

      return {
        ...course,
        settlementAmount,
        settlementDifference,
        settlementStatus:
          settlementStatus === "DISPUTED"
            ? "DISPUTED"
            : calculateSettlementStatus({
                settlementAmount,
                settlementDifference,
              }),
        totalRevenue:
          settlementAmount ??
          course.expectedRevenue,
      };
    });

    return recalculateReportTotals({
      ...report,
      courses,
    });
  });
}

function recalculateReportTotals(
  report: WeeklyTruckRevenueReportRow,
): WeeklyTruckRevenueReportRow {
  const expectedRevenue = roundMoney(
    report.courses.reduce(
      (sum, course) =>
        sum + course.expectedRevenue,
      0,
    ),
  );

  const totalRevenue = roundMoney(
    report.courses.reduce(
      (sum, course) => sum + course.totalRevenue,
      0,
    ),
  );

  const settlementAmount = roundMoney(
    report.courses.reduce(
      (sum, course) =>
        sum + (course.settlementAmount ?? 0),
      0,
    ),
  );

  const settlementCheckedCount =
    report.courses.filter(
      (course) =>
        course.settlementAmount !== null,
    ).length;

  return {
    ...report,
    courseCount: report.courses.length,
    expectedRevenue,
    settlementAmount,
    settlementDifference: roundMoney(
      totalRevenue - expectedRevenue,
    ),
    settlementCheckedCount,
    notCheckedCount:
      report.courses.length -
      settlementCheckedCount,
    underpaidCount:
      report.courses.filter(
        (course) =>
          course.settlementStatus === "UNDERPAID",
      ).length,
    totalRevenue,
  };
}

function calculateSettlementStatus({
  settlementAmount,
  settlementDifference,
}: {
  settlementAmount: number | null;
  settlementDifference: number | null;
}): WeeklyTruckRevenueReportCourseRow["settlementStatus"] {
  if (settlementAmount === null) {
    return "NOT_CHECKED";
  }

  if (
    settlementDifference === null ||
    Math.abs(settlementDifference) < 0.01
  ) {
    return "OK";
  }

  return settlementDifference < 0
    ? "UNDERPAID"
    : "OVERPAID";
}

function normalizeSettlementStatusFromUnknown(
  value: unknown,
): WeeklyTruckRevenueReportCourseRow["settlementStatus"] | null {
  if (
    value === "NOT_CHECKED" ||
    value === "OK" ||
    value === "UNDERPAID" ||
    value === "OVERPAID" ||
    value === "DISPUTED"
  ) {
    return value;
  }

  return null;
}

function parseSettlementAmountInput(
  value: string,
): number | null | "INVALID" {
  const trimmedValue = value.trim();

  if (trimmedValue === "") {
    return null;
  }

  const parsedValue = Number(trimmedValue);

  if (
    !Number.isFinite(parsedValue) ||
    parsedValue < 0
  ) {
    return "INVALID";
  }

  return roundMoney(parsedValue);
}

function parseApiNullableNumber(
  value: unknown,
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const parsedValue = Number(value);

  return Number.isFinite(parsedValue)
    ? roundMoney(parsedValue)
    : null;
}

function hasOwn(
  object: object,
  property: PropertyKey,
): boolean {
  return Object.prototype.hasOwnProperty.call(
    object,
    property,
  );
}

function MetricCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "positive" | "negative";
}) {
  return (
    <div className="rounded-2xl border border-slate-400 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p
        className={[
          "mt-2 text-2xl font-bold",
          tone === "positive"
            ? "text-emerald-700"
            : tone === "negative"
              ? "text-red-700"
              : "text-slate-950",
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  );
}

function parsePositiveInteger(value: string): number | null {
  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue < 1) {
    return null;
  }

  return parsedValue;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function formatMoney(value: number): string {
  return `€${value.toFixed(2)}`;
}

function formatNumberInputValue(value: number): string {
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(2);
}

function formatMoneyWithSign(value: number): string {
  if (value > 0) {
    return `+${formatMoney(value)}`;
  }

  if (value < 0) {
    return `-${formatMoney(Math.abs(value))}`;
  }

  return formatMoney(0);
}

function formatNullableMoneyWithSign(
  value: number | null,
): string {
  return value === null
    ? "—"
    : formatMoneyWithSign(value);
}

function getMoneyTone(
  value: number,
): "default" | "positive" | "negative" {
  if (value > 0.005) {
    return "positive";
  }

  if (value < -0.005) {
    return "negative";
  }

  return "default";
}

function getMoneyTextClass(
  value: number | null,
): string {
  if (value === null || Math.abs(value) < 0.005) {
    return "text-slate-700";
  }

  return value > 0
    ? "text-emerald-700"
    : "text-red-700";
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("bg-BG", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("bg-BG", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}