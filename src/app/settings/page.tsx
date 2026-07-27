import Link from "next/link";

import { AppShell } from "@/components/layout/AppShell";

type SettingsCardStatus =
  | "Ready"
  | "Connected"
  | "Planned";

type SettingsCard = {
  title: string;
  description: string;
  status: SettingsCardStatus;
  href?: string;
};

const SETTINGS_CARDS: readonly SettingsCard[] = [
  {
    title: "Address Book",
    description:
      "Terminals, depots, customer sites, coordinates, active/inactive addresses and route calculation locations.",
    href: "/settings/addresses",
    status: "Ready",
  },
  {
    title: "Calculation settings",
    description:
      "Default fuel price, default waiting rules, MSI default price per kilometer and profit status thresholds.",
    href: "/settings/calculation",
    status: "Ready",
  },
  {
    title: "Truck defaults",
    description:
      "Truck master data, fuel consumption, fixed monthly costs, license plates and technical status.",
    href: "/trucks",
    status: "Connected",
  },
  {
    title: "Customer tariffs",
    description:
      "Customer pricing rules, active tariffs, Vepco tariff table, MSI price per kilometer and customer-specific rates.",
    href: "/customers",
    status: "Connected",
  },
  {
    title: "Route / API settings",
    description:
      "Route provider configuration, myPTV connection, toll calculation defaults, cache behavior and API health checks.",
    status: "Planned",
  },
  {
    title: "Company settings",
    description:
      "Company profile, default currency, company name, internal contact details and document defaults.",
    status: "Planned",
  },
  {
    title: "Users & roles",
    description:
      "User accounts, viewer/editor permissions, finance access, dispatcher roles and owner/admin control.",
    status: "Planned",
  },
  {
    title: "System info",
    description:
      "Application version, database status, environment, last deployment and basic technical diagnostics.",
    status: "Planned",
  },
];

export default function SettingsPage() {
  const readyCards = SETTINGS_CARDS.filter(
    (card) => card.status !== "Planned",
  );

  const plannedCards = SETTINGS_CARDS.filter(
    (card) => card.status === "Planned",
  );

  return (
    <AppShell title="Settings">
      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                System control panel
              </h2>

              <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
                Central place for master data, calculation rules,
                integrations, users and system configuration. Ready sections
                are clickable. Planned sections show what will be added next.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <SettingsCounter
                label="Ready"
                value={readyCards.length}
                tone="positive"
              />

              <SettingsCounter
                label="Planned"
                value={plannedCards.length}
                tone="default"
              />

              <SettingsCounter
                label="Total"
                value={SETTINGS_CARDS.length}
                tone="default"
              />
            </div>
          </div>
        </section>

        <section>
          <div className="mb-3">
            <h2 className="text-base font-semibold text-slate-950">
              Active settings
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              These sections are already connected to existing parts of the
              system.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {readyCards.map((card) => (
              <SettingsCardItem
                key={card.title}
                card={card}
              />
            ))}
          </div>
        </section>

        <section>
          <div className="mb-3">
            <h2 className="text-base font-semibold text-slate-950">
              Planned settings
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              These cards are placeholders for the next configuration modules.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {plannedCards.map((card) => (
              <SettingsCardItem
                key={card.title}
                card={card}
              />
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function SettingsCardItem({
  card,
}: {
  card: SettingsCard;
}) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 group-hover:text-sky-700">
            {card.title}
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            {card.description}
          </p>
        </div>

        <StatusBadge status={card.status} />
      </div>

      <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {card.href ? "Open section" : "Coming soon"}
      </div>
    </>
  );

  if (card.href) {
    return (
      <Link
        href={card.href}
        className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-sky-300"
      >
        {content}
      </Link>
    );
  }

  return (
    <article className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 opacity-90">
      {content}
    </article>
  );
}

function StatusBadge({
  status,
}: {
  status: SettingsCardStatus;
}) {
  const className =
    status === "Ready"
      ? "bg-emerald-50 text-emerald-700"
      : status === "Connected"
        ? "bg-sky-50 text-sky-700"
        : "bg-slate-100 text-slate-600";

  return (
    <span
      className={[
        "shrink-0 rounded-full px-3 py-1 text-xs font-semibold",
        className,
      ].join(" ")}
    >
      {status}
    </span>
  );
}

function SettingsCounter({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "default" | "positive";
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p
        className={[
          "mt-1 text-xl font-bold",
          tone === "positive"
            ? "text-emerald-700"
            : "text-slate-950",
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  );
}