import { AppShell } from "@/components/layout/AppShell";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const customers = await getCustomers();

  const activeCustomersCount = customers.filter(
    (customer) => customer.status === "ACTIVE",
  ).length;

  const activeTariffsCount = customers.reduce(
    (sum, customer) =>
      sum +
      customer.tariffs.filter((tariff) => tariff.isActive)
        .length,
    0,
  );

  return (
    <AppShell title="Клиенти">
      <div className="space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Клиенти
            </p>

            <h1 className="mt-1 text-2xl font-bold text-slate-950">
              Клиенти и тарифни правила
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Преглед на клиентите, тяхната логика за платими
              километри и активните тарифни правила. Тази първа
              версия е само за преглед, без редакция на данни.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[560px]">
            <SummaryCard
              label="Всички клиенти"
              value={customers.length}
            />

            <SummaryCard
              label="Активни"
              value={activeCustomersCount}
            />

            <SummaryCard
              label="Тарифи"
              value={activeTariffsCount}
            />

            <SummaryCard
              label="Курсове"
              value={customers.reduce(
                (sum, customer) =>
                  sum + customer._count.courses,
                0,
              )}
            />
          </div>
        </header>

        {customers.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-4">
            {customers.map((customer) => (
              <CustomerCard
                key={customer.id}
                customer={customer}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

async function getCustomers() {
  return prisma.customer.findMany({
    orderBy: {
      name: "asc",
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      vatNumber: true,
      status: true,
      billableKmLogic: true,
      notes: true,
      tariffs: {
        orderBy: [
          {
            isActive: "desc",
          },
          {
            minKm: "asc",
          },
          {
            maxKm: "asc",
          },
          {
            type: "asc",
          },
          {
            name: "asc",
          },
        ],
        select: {
          id: true,
          type: true,
          billableKmLogic: true,
          name: true,
          minKm: true,
          maxKm: true,
          fixedPrice: true,
          pricePerKm: true,
          waitingHourlyRate: true,
          portFeeIncluded: true,
          isActive: true,
          notes: true,
        },
      },
      _count: {
        select: {
          addresses: true,
          courses: true,
          invoices: true,
        },
      },
    },
  });
}

type CustomerWithTariffs = Awaited<
  ReturnType<typeof getCustomers>
>[number];

type CustomerTariffRow =
  CustomerWithTariffs["tariffs"][number];

function CustomerCard({
  customer,
}: {
  customer: CustomerWithTariffs;
}) {
  const activeTariffs = customer.tariffs.filter(
    (tariff) => tariff.isActive,
  );

  const inactiveTariffsCount =
    customer.tariffs.length - activeTariffs.length;

  return (
    <section className="rounded-2xl border border-slate-300 bg-slate-100 p-3 shadow-sm">
      <div className="rounded-xl border border-slate-400 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="break-words text-lg font-bold text-slate-950">
                {customer.name}
              </h2>

              <StatusPill status={customer.status} />
            </div>

            <div className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2 xl:grid-cols-4">
              <InfoLine
                label="Платими км"
                value={getBillableKmLogicLabel(
                  customer.billableKmLogic,
                )}
              />

              <InfoLine
                label="Имейл"
                value={customer.email ?? "—"}
              />

              <InfoLine
                label="Телефон"
                value={customer.phone ?? "—"}
              />

              <InfoLine
                label="VAT"
                value={customer.vatNumber ?? "—"}
              />
            </div>

            {customer.notes && (
              <p className="mt-3 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-700">
                {formatKnownNote(customer.notes)}
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 xl:min-w-[300px]">
            <SmallMetric
              label="Адреси"
              value={customer._count.addresses}
            />

            <SmallMetric
              label="Курсове"
              value={customer._count.courses}
            />

            <SmallMetric
              label="Фактури"
              value={customer._count.invoices}
            />
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-slate-300 bg-slate-50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
              Тарифни правила
            </h3>

            <p className="text-xs font-medium text-slate-500">
              {activeTariffs.length} активни
              {inactiveTariffsCount > 0
                ? ` / ${inactiveTariffsCount} неактивни`
                : ""}
            </p>
          </div>

          {customer.tariffs.length === 0 ? (
            <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Няма въведени тарифни правила за този клиент.
            </p>
          ) : (
            <div className="mt-3 max-h-80 overflow-y-auto rounded-lg border border-slate-300 bg-white">
              <table className="w-full min-w-[920px] border-collapse text-left text-sm">
                <thead className="sticky top-0 z-10 bg-slate-200 text-xs uppercase tracking-wide text-slate-700">
                  <tr>
                    <th className="border-b border-slate-400 px-3 py-2">
                      Име
                    </th>
                    <th className="border-b border-slate-400 px-3 py-2">
                      Тип
                    </th>
                    <th className="border-b border-slate-400 px-3 py-2">
                      Км логика
                    </th>
                    <th className="border-b border-slate-400 px-3 py-2">
                      Диапазон
                    </th>
                    <th className="border-b border-slate-400 px-3 py-2">
                      Цена
                    </th>
                    <th className="border-b border-slate-400 px-3 py-2">
                      Престой
                    </th>
                    <th className="border-b border-slate-400 px-3 py-2">
                      Статус
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {customer.tariffs.map((tariff) => (
                    <TariffRow
                      key={tariff.id}
                      tariff={tariff}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function TariffRow({
  tariff,
}: {
  tariff: CustomerTariffRow;
}) {
  return (
    <tr
      className={
        tariff.isActive
          ? "bg-white"
          : "bg-slate-50 text-slate-500"
      }
    >
      <td className="px-3 py-2 align-top font-medium text-slate-900">
        <div>{tariff.name}</div>

        {tariff.notes && (
          <div className="mt-1 max-w-[260px] text-xs font-normal leading-5 text-slate-500">
            {formatKnownNote(tariff.notes)}
          </div>
        )}
      </td>

      <td className="px-3 py-2 align-top text-slate-700">
        {getTariffTypeLabel(tariff.type)}
      </td>

      <td className="px-3 py-2 align-top text-slate-700">
        {getBillableKmLogicLabel(tariff.billableKmLogic)}
      </td>

      <td className="px-3 py-2 align-top text-slate-700">
        {formatKmRange(tariff.minKm, tariff.maxKm)}
      </td>

      <td className="px-3 py-2 align-top text-slate-900">
        <div className="space-y-1">
          {tariff.fixedPrice !== null && (
            <div>
              Фикс: {formatMoney(tariff.fixedPrice)}
            </div>
          )}

          {tariff.pricePerKm !== null && (
            <div>
              {formatPricePerKm(tariff.pricePerKm)}
            </div>
          )}

          {tariff.fixedPrice === null &&
            tariff.pricePerKm === null && (
              <div className="text-slate-500">—</div>
            )}
        </div>
      </td>

      <td className="px-3 py-2 align-top text-slate-700">
        {tariff.waitingHourlyRate !== null
          ? `${formatMoney(tariff.waitingHourlyRate)} / час`
          : "—"}
      </td>

      <td className="px-3 py-2 align-top">
        <div className="space-y-1">
          <span
            className={[
              "inline-flex rounded-full px-2 py-1 text-xs font-semibold",
              tariff.isActive
                ? "bg-emerald-100 text-emerald-800"
                : "bg-slate-200 text-slate-600",
            ].join(" ")}
          >
            {tariff.isActive ? "Активна" : "Неактивна"}
          </span>

          {tariff.portFeeIncluded && (
            <div className="text-xs font-medium text-sky-700">
              Пристанищна такса включена
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-slate-300 bg-white p-3 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-2xl font-bold text-slate-950">
        {value}
      </p>
    </div>
  );
}

function SmallMetric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border border-slate-300 bg-slate-50 p-3 text-center">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-lg font-bold text-slate-950">
        {value}
      </p>
    </div>
  );
}

function InfoLine({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-1 break-words font-medium text-slate-900">
        {value.trim() === "" ? "—" : value}
      </p>
    </div>
  );
}

function StatusPill({
  status,
}: {
  status: CustomerWithTariffs["status"];
}) {
  const isActive = status === "ACTIVE";

  return (
    <span
      className={[
        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
        isActive
          ? "bg-emerald-100 text-emerald-800"
          : "bg-slate-200 text-slate-700",
      ].join(" ")}
    >
      {isActive ? "Активен" : "Неактивен"}
    </span>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
      <h2 className="text-lg font-semibold text-slate-900">
        Няма въведени клиенти
      </h2>

      <p className="mt-2 text-sm text-slate-600">
        Когато добавим форма за създаване на клиенти, новите
        записи ще се показват тук.
      </p>
    </div>
  );
}

function formatKnownNote(note: string): string {
  const normalizedNote = note.trim();

  switch (normalizedNote) {
    case "Seed customer. Manual pricing until customer-specific tariff is configured.":
      return "Начален клиент. Ценообразуването е ръчно, докато се настрои клиентска тарифа.";
    case "Seed customer. Uses price per kilometer on total route kilometers.":
      return "Начален клиент. Използва цена на километър върху целия маршрут.";
    case "Seed customer. Uses fixed upper-bound tariff table and one-way billable kilometers.":
      return "Начален клиент. Използва тарифна таблица и еднопосочни платими километри.";
    case "Manual pricing placeholder.":
      return "Ръчно ценообразуване до настройване на конкретна тарифа.";
    case "MSI tariff logic: price per kilometer, total route kilometers.":
      return "Цена на километър върху целия маршрут.";
    case "Vepco upper-bound tariff. Applied to BILLABLE_KM only.":
      return "Тарифна таблица Vepco. Прилага се само към платимите километри.";
    default:
      return normalizedNote;
  }
}

function getBillableKmLogicLabel(logic: string): string {
  switch (logic) {
    case "TOTAL_ROUTE":
      return "Целият маршрут";
    case "ONE_WAY":
      return "Еднопосочно";
    case "SELECTED_LEGS":
      return "Избрани отсечки";
    case "FIXED_PRICE":
      return "Фиксирана цена";
    case "MANUAL":
      return "Ръчно";
    default:
      return logic;
  }
}

function getTariffTypeLabel(type: string): string {
  switch (type) {
    case "FIXED_TABLE_UPPER_BOUND":
      return "Тарифна таблица";
    case "DISTANCE_TABLE":
      return "Дистанционна таблица";
    case "PRICE_PER_KM":
      return "Цена / км";
    case "FIXED_PRICE":
      return "Фиксирана цена";
    case "SHUNT":
      return "Шунт";
    case "WAITING_TIME":
      return "Престой";
    case "MANUAL":
      return "Ръчно";
    default:
      return type;
  }
}

function formatKmRange(
  minKm: unknown,
  maxKm: unknown,
): string {
  const min = toNumber(minKm);
  const max = toNumber(maxKm);

  if (min === null && max === null) {
    return "—";
  }

  if (min !== null && max !== null) {
    return `${formatNumber(min)}–${formatNumber(max)} км`;
  }

  if (min !== null) {
    return `от ${formatNumber(min)} км`;
  }

  if (max !== null) {
    return `до ${formatNumber(max)} км`;
  }

  return "—";
}

function formatMoney(value: unknown): string {
  const numberValue = toNumber(value);

  if (numberValue === null) {
    return "—";
  }

  return `€${formatNumber(numberValue, 2, 2)}`;
}

function formatPricePerKm(value: unknown): string {
  const numberValue = toNumber(value);

  if (numberValue === null) {
    return "—";
  }

  return `€${formatNumber(numberValue, 2, 4)} / км`;
}

function formatNumber(
  value: number,
  minimumFractionDigits = 0,
  maximumFractionDigits = 2,
): string {
  return new Intl.NumberFormat("bg-BG", {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(value);
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const parsedValue = Number(value);

    return Number.isFinite(parsedValue)
      ? parsedValue
      : null;
  }

  if (
    typeof value === "object" &&
    "toNumber" in value &&
    typeof value.toNumber === "function"
  ) {
    const parsedValue = value.toNumber();

    return Number.isFinite(parsedValue)
      ? parsedValue
      : null;
  }

  const parsedValue = Number(value);

  return Number.isFinite(parsedValue)
    ? parsedValue
    : null;
}