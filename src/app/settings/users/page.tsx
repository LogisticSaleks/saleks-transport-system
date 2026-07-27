import { AppShell } from "@/components/layout/AppShell";
import UserProfilesManagement from "@/components/settings/UserProfilesManagement";
import { loadUserProfilesFromDb } from "@/lib/settings/userProfiles";

export const dynamic = "force-dynamic";

export default async function UserProfilesSettingsPage() {
  const usersResult = await loadUserProfilesFromDb();

  return (
    <AppShell title="Users & roles">
      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="text-lg font-semibold text-slate-950">
            User access control
          </h2>

          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
            Manage Saleks user profiles, roles and active/inactive access
            status. Supabase still handles login credentials. This page
            manages the internal role used by the Saleks Transport System.
          </p>
        </section>

        <UserProfilesManagement initialResult={usersResult} />
      </div>
    </AppShell>
  );
}