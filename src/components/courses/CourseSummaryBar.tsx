"use client";

export type CourseSummaryValues = {
  courseCount: number;
  totalKm: number;
  billableKm: number;
  revenue: number;
  cost: number;
  profit: number;
  averageMargin: number;
};

type CourseSummaryBarProps = {
  summary: CourseSummaryValues;
};

type SummaryItem = {
  label: string;
  value: string;
  emphasis?: "positive" | "negative" | "neutral";
};

const numberFormatter = new Intl.NumberFormat(
  "bg-BG",
  {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  },
);

const currencyFormatter = new Intl.NumberFormat(
  "bg-BG",
  {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  },
);

export default function CourseSummaryBar({
  summary,
}: CourseSummaryBarProps) {
  const items: SummaryItem[] = [
    {
      label: "Курсове",
      value: String(summary.courseCount),
    },
    {
      label: "Общо км",
      value: `${numberFormatter.format(
        summary.totalKm,
      )} km`,
    },
    {
      label: "Платими км",
      value: `${numberFormatter.format(
        summary.billableKm,
      )} km`,
    },
    {
      label: "Приход",
      value: currencyFormatter.format(
        summary.revenue,
      ),
    },
    {
      label: "Разход",
      value: currencyFormatter.format(
        summary.cost,
      ),
    },
    {
      label: "Печалба",
      value: currencyFormatter.format(
        summary.profit,
      ),
      emphasis:
        summary.profit > 0
          ? "positive"
          : summary.profit < 0
            ? "negative"
            : "neutral",
    },
    {
      label: "Среден марж",
      value: `${numberFormatter.format(
        summary.averageMargin,
      )}%`,
      emphasis:
        summary.averageMargin > 0
          ? "positive"
          : summary.averageMargin < 0
            ? "negative"
            : "neutral",
    },
  ];

  return (
    <section
      aria-label="Financial summary"
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7"
    >
      {items.map((item) => (
        <article
          key={item.label}
          className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {item.label}
          </p>

          <p
            className={[
              "mt-1 text-xl font-semibold",
              item.emphasis === "positive"
                ? "text-emerald-700"
                : item.emphasis === "negative"
                  ? "text-red-700"
                  : "text-slate-900",
            ].join(" ")}
          >
            {item.value}
          </p>
        </article>
      ))}
    </section>
  );
}