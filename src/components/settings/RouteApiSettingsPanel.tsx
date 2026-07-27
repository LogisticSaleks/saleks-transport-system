"use client";

import { useMemo, useState } from "react";

type RouteApiCheckStatus =
  | "OK"
  | "WARNING"
  | "ERROR";

type RouteApiHealthCheck = {
  key: string;
  label: string;
  status: RouteApiCheckStatus;
  message: string;
};

type RouteApiSettingsStatus = {
  generatedAt: string;
  providers: {
    registeredProviderIds: string[];
    serviceDefaultProviderId: string;
    courseDefaultProviderId: string;
    ptvProviderRegistered: boolean;
    ptvApiKeyConfigured: boolean;
  };
  cache: {
    ttlSeconds: number;
    ttlHours: number;
    totalEntries: number;
    activeEntries: number;
    expiredEntries: number;
    latestCreatedAt: string | null;
    latestExpiresAt: string | null;
  };
  defaults: {
    currency: "EUR";
    includeCountryBreakdown: boolean;
    vehicle: {
      grossWeightKg: number;
      axleCount: number;
      euroClass: string;
    };
  };
  checks: RouteApiHealthCheck[];
};

type RouteApiSettingsPanelProps = {
  initialStatus: RouteApiSettingsStatus;
};

type RouteApiSettingsResponse = {
  status?: RouteApiSettingsStatus;
  error?: string;
};

export default function RouteApiSettingsPanel({
  initialStatus,
}: RouteApiSettingsPanelProps) {
  const [status, setStatus] =
    useState<RouteApiSettingsStatus>(initialStatus);

  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const [refreshError, setRefreshError] =
    useState<string | null>(null);

  const overallStatus = useMemo(
    () => getOverallStatus(status.checks),
    [status.checks],
  );

  async function handleRefresh(): Promise<void> {
    setIsRefreshing(true);
    setRefreshError(null);

    try {
      const response = await fetch(
        "/api/settings/route-api",
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        },
      );

      const responseData =
        (await response
          .json()
          .catch(() => null)) as
          | RouteApiSettingsResponse
          | null;

      if (!response.ok || !responseData?.status) {
        throw new Error(
          responseData?.error ??
            "Route/API status could not be refreshed.",
        );
      }

      setStatus(responseData.status);
    } catch (error) {
      setRefreshError(
        error instanceof Error
          ? error.message
          : "Route/API status could not be refreshed.",
      );
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-slate-950">
                Route/API status
              </h2>

              <StatusBadge status={overallStatus} />
            </div>

            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
              This page checks the route provider setup, myPTV configuration,
              route cache and the default truck profile used by course route
              calculation. API keys are never displayed.
            </p>

            <p className="mt-2 text-xs text-slate-500">
              Last checked: {formatDateTime(status.generatedAt)}
            </p>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            aria-busy={isRefreshing}
            className="inline-flex h-10 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRefreshing ? "Checking..." : "Run health check"}
          </button>
        </div>

        {refreshError && (
          <p
            role="alert"
            className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700"
          >
            {refreshError}
          </p>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <InfoCard
          title="myPTV key"
          value={
            status.providers.ptvApiKeyConfigured
              ? "Configured"
              : "Missing"
          }
          description="Uses MYPTV_API_KEY from the environment. The value is hidden."
          status={
            status.providers.ptvApiKeyConfigured
              ? "OK"
              : "WARNING"
          }
        />

        <InfoCard
          title="Course provider"
          value={status.providers.courseDefaultProviderId.toUpperCase()}
          description="Provider used by the Courses route calculation button."
          status={
            status.providers.ptvProviderRegistered
              ? "OK"
              : "ERROR"
          }
        />

        <InfoCard
          title="Cache TTL"
          value={`${status.cache.ttlHours}h`}
          description="Current route cache lifetime before results expire."
          status="OK"
        />

        <InfoCard
          title="Active cache"
          value={String(status.cache.activeEntries)}
          description="Non-expired route calculation cache entries."
          status="OK"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Panel title="Providers">
          <dl className="space-y-3 text-sm">
            <DetailsRow
              label="Registered providers"
              value={
                status.providers.registeredProviderIds.join(", ") || "—"
              }
            />
            <DetailsRow
              label="RouteService default"
              value={status.providers.serviceDefaultProviderId}
            />
            <DetailsRow
              label="Courses default"
              value={status.providers.courseDefaultProviderId}
            />
            <DetailsRow
              label="PTV provider registered"
              value={
                status.providers.ptvProviderRegistered ? "Yes" : "No"
              }
            />
          </dl>
        </Panel>

        <Panel title="Default vehicle profile">
          <dl className="space-y-3 text-sm">
            <DetailsRow
              label="Gross weight"
              value={`${formatNumber(status.defaults.vehicle.grossWeightKg)} kg`}
            />
            <DetailsRow
              label="Axles"
              value={String(status.defaults.vehicle.axleCount)}
            />
            <DetailsRow
              label="Euro class"
              value={status.defaults.vehicle.euroClass}
            />
            <DetailsRow
              label="Currency"
              value={status.defaults.currency}
            />
            <DetailsRow
              label="Country breakdown"
              value={
                status.defaults.includeCountryBreakdown ? "Enabled" : "Disabled"
              }
            />
          </dl>
        </Panel>

        <Panel title="Route cache">
          <dl className="space-y-3 text-sm">
            <DetailsRow
              label="Total entries"
              value={String(status.cache.totalEntries)}
            />
            <DetailsRow
              label="Active entries"
              value={String(status.cache.activeEntries)}
            />
            <DetailsRow
              label="Expired entries"
              value={String(status.cache.expiredEntries)}
            />
            <DetailsRow
              label="Latest created"
              value={formatDateTime(status.cache.latestCreatedAt)}
            />
            <DetailsRow
              label="Latest expiry"
              value={formatDateTime(status.cache.latestExpiresAt)}
            />
          </dl>
        </Panel>

        <Panel title="Health checks">
          <div className="space-y-3">
            {status.checks.map((check) => (
              <div
                key={check.key}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="font-semibold text-slate-900">
                    {check.label}
                  </h3>

                  <StatusBadge status={check.status} />
                </div>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {check.message}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      </section>
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-950">
        {title}
      </h2>

      <div className="mt-4">{children}</div>
    </section>
  );
}

function InfoCard({
  title,
  value,
  description,
  status,
}: {
  title: string;
  value: string;
  description: string;
  status: RouteApiCheckStatus;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-950">
            {value}
          </p>
        </div>

        <StatusBadge status={status} />
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-600">
        {description}
      </p>
    </article>
  );
}

function DetailsRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2 last:border-b-0 last:pb-0">
      <dt className="text-slate-500">{label}</dt>
      <dd className="max-w-[60%] text-right font-semibold text-slate-900">
        {value}
      </dd>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: RouteApiCheckStatus;
}) {
  const className =
    status === "OK"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "WARNING"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-red-200 bg-red-50 text-red-700";

  return (
    <span
      className={[
        "inline-flex shrink-0 rounded-full border px-3 py-1 text-xs font-semibold",
        className,
      ].join(" ")}
    >
      {status}
    </span>
  );
}

function getOverallStatus(
  checks: readonly RouteApiHealthCheck[],
): RouteApiCheckStatus {
  if (checks.some((check) => check.status === "ERROR")) {
    return "ERROR";
  }

  if (checks.some((check) => check.status === "WARNING")) {
    return "WARNING";
  }

  return "OK";
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("bg-BG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("bg-BG").format(value);
}