import Link from "next/link";

import CompanySettingsForm from "@/components/settings/CompanySettingsForm";
import { AppShell } from "@/components/layout/AppShell";
import { loadCompanySettingsFromDb } from "@/lib/settings/companySettings";

export const dynamic = "force-dynamic";

export default async function CompanySettingsPage() {
  const company = await loadCompanySettingsFromDb();

  return (
    <AppShell title="Company settings">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link
              href="/settings"
              className="text-sm font-medium text-sky-700 hover:text-sky-900"
            >
              ← Back to Settings
            </Link>

            <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">
              Company master data used by the Saleks Transport System.
              These details are kept separately from customer, truck and
              course data.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <div className="font-semibold text-slate-900">
              Current profile
            </div>

            <div className="mt-1">
              {company.name || "No company configured"}
            </div>
          </div>
        </div>

        <CompanySettingsForm initialCompany={company} />

        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-sm font-semibold text-slate-900">
            Notes
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Currency and document numbering are not changed here yet.
            For the MVP the system continues to use EUR in course,
            dashboard and report calculations.
          </p>
        </section>
      </div>
    </AppShell>
  );
}