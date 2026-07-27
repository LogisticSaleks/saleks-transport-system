import Link from "next/link";

import RouteApiSettingsPanel from "@/components/settings/RouteApiSettingsPanel";
import { AppShell } from "@/components/layout/AppShell";
import { loadRouteApiSettingsStatus } from "@/lib/settings/routeApiSettings";

export const dynamic = "force-dynamic";

export default async function RouteApiSettingsPage() {
  const initialStatus =
    await loadRouteApiSettingsStatus();

  return (
    <AppShell title="Route / API settings">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link
              href="/settings"
              className="text-sm font-semibold text-sky-700 transition hover:text-sky-900"
            >
              ← Back to Settings
            </Link>

            <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">
              Monitor the route provider configuration, myPTV environment setup,
              route cache and the default truck profile used for course route
              calculation.
            </p>
          </div>
        </div>

        <RouteApiSettingsPanel initialStatus={initialStatus} />
      </div>
    </AppShell>
  );
}