"use client";

import type { PricingStatus } from "@/lib/calculations/calculatePricingStatus";

type StatusBadgeProps = {
  status: PricingStatus | null | undefined;
};

const STATUS_STYLES: Record<PricingStatus, string> = {
  PROFITABLE:
    "border-emerald-200 bg-emerald-100 text-emerald-700",
  LOW_PROFIT:
    "border-yellow-200 bg-yellow-100 text-yellow-800",
  BREAK_EVEN:
    "border-orange-200 bg-orange-100 text-orange-700",
  LOSS:
    "border-red-200 bg-red-100 text-red-700",
  NEEDS_REVIEW:
    "border-sky-200 bg-sky-100 text-sky-700",
};

export default function StatusBadge({
  status,
}: StatusBadgeProps) {
  if (!status) {
    return (
      <span className="inline-flex min-h-7 items-center justify-center rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
        —
      </span>
    );
  }

  return (
    <span
      title={status}
      className={[
        "inline-flex min-h-7 items-center justify-center whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold",
        STATUS_STYLES[status],
      ].join(" ")}
    >
      {status}
    </span>
  );
}