import Link from "next/link";

import { AppShell } from "@/components/layout/AppShell";
import CalculationSettingsForm from "@/components/settings/CalculationSettingsForm";
import {
  roleHasPermission,
} from "@/lib/auth/permissions";
import { loadCurrentUserAccess } from "@/lib/auth/currentUser";
import { calculationSettings } from "@/lib/settings/calculationSettings";
import { loadCalculationSettingsFromDb } from "@/lib/settings/calculationSettingsDb";

export const dynamic = "force-dynamic";

export default async function CalculationSettingsPage() {
  const access = await loadCurrentUserAccess();

  if (
    access.status !== "AUTHORIZED" ||
    !access.profile ||
    !roleHasPermission(access.profile.role, "settings:read")
  ) {
    return (
      <AppShell title="Calculation settings">
        <SettingsAccessDeniedPanel
          title="Calculation settings access blocked"
          description="Your current role does not allow access to calculation settings."
        />
      </AppShell>
    );
  }

  const settings =
    await loadCalculationSettingsFromDb();

  return (
    <AppShell title="Calculation settings">
      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Calculation settings
              </h2>

              <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
                Default values used by the calculation engine. Truck-specific
                fuel consumption and customer-specific tariffs can still
                override these defaults inside courses.
              </p>
            </div>

            <Link
              href="/settings"
              className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              Back to Settings
            </Link>
          </div>
        </section>

        <CalculationSettingsForm
          initialSettings={settings}
          defaultSettings={calculationSettings}
        />
      </div>
    </AppShell>
  );
}

function SettingsAccessDeniedPanel({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">
            {title}
          </h2>

          <p className="mt-2 leading-6">
            {description}
          </p>
        </div>

        <Link
          href="/settings"
          className="inline-flex h-10 items-center justify-center rounded-md border border-red-300 bg-white px-4 text-sm font-semibold text-red-700 transition hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-300"
        >
          Back to Settings
        </Link>
      </div>
    </section>
  );
}