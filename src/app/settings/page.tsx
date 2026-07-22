import Link from "next/link";

import { AppShell } from "@/components/layout/AppShell";

type SettingsCard = {
  title: string;
  description: string;
  href: string;
  status: string;
};

const SETTINGS_CARDS: readonly SettingsCard[] = [
  {
    title: "Address Book",
    description:
      "Manage terminals, depots, customer sites, coordinates and active/inactive addresses.",
    href: "/settings/addresses",
    status: "Ready",
  },
];

export default function SettingsPage() {
  return (
    <AppShell title="Settings">
      <div className="space-y-6">
        <p className="text-sm text-slate-600">
          Master data and configuration for Saleks Transport System.
        </p>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {SETTINGS_CARDS.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-sky-300"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 group-hover:text-sky-700">
                    {card.title}
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {card.description}
                  </p>
                </div>

                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  {card.status}
                </span>
              </div>
            </Link>
          ))}
        </section>
      </div>
    </AppShell>
  );
}