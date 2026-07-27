import Link from "next/link";

import { AppShell } from "@/components/layout/AppShell";
import CalculationSettingsForm from "@/components/settings/CalculationSettingsForm";
import { calculationSettings } from "@/lib/settings/calculationSettings";
import { loadCalculationSettingsFromDb } from "@/lib/settings/calculationSettingsDb";

export const dynamic = "force-dynamic";

export default async function CalculationSettingsPage() {
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