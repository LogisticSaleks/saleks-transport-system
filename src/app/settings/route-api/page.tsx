import Link from "next/link";

import RouteApiSettingsPanel from "@/components/settings/RouteApiSettingsPanel";
import { AppShell } from "@/components/layout/AppShell";
import { roleHasPermission } from "@/lib/auth/permissions";
import { loadCurrentUserAccess } from "@/lib/auth/currentUser";
import { loadRouteApiSettingsStatus } from "@/lib/settings/routeApiSettings";

export const dynamic = "force-dynamic";

export default async function RouteApiSettingsPage() {
  const access = await loadCurrentUserAccess();

  if (
    access.status !== "AUTHORIZED" ||
    !access.profile ||
    !roleHasPermission(access.profile.role, "settings:read")
  ) {
    return (
      <AppShell title="Route / API settings">
        <SettingsAccessDeniedPanel
          title="Route / API settings access blocked"
          description="Your current role does not allow access to route provider configuration or API health checks."
        />
      </AppShell>
    );
  }

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