import { AppShell } from "@/components/layout/AppShell";
import { loadCurrentUserAccess } from "@/lib/auth/currentUser";
import { roleHasPermission } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

export default async function FuelPage() {
  const currentUserAccess = await loadCurrentUserAccess();

  const canReadFuel =
    currentUserAccess.status === "AUTHORIZED" &&
    currentUserAccess.profile !== null &&
    roleHasPermission(currentUserAccess.profile.role, "fuel:read");

  if (!canReadFuel) {
    return (
      <AppShell title="Fuel">
        <FuelAccessDeniedPanel />
      </AppShell>
    );
  }

  return (
    <AppShell title="Fuel">
      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-400 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">
            Fuel log
          </h2>

          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
            Тук ще следим зарежданията на дизел и AdBlue по камион:
            километри, литри, цена на литър, общо платена сума и
            разход L/100 km.
          </p>

          <p className="mt-3 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-800">
            Fuel модулът ще бъде отделна справка и няма да променя
            разходите, печалбата или settlement логиката в Courses,
            Dashboard и Reports.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <InfoCard
            title="Следваща стъпка"
            text="Ще добавим таблица със зарежданията, филтри по камион и период, и summary карти."
          />

          <InfoCard
            title="Добавяне на зареждане"
            text="Ще можеш да въвеждаш дата, километри, литри дизел, сума дизел, AdBlue литри и сума."
          />

          <InfoCard
            title="Добавяне на камион"
            text="От Fuel страницата ще може да се добавя камион, който после ще се вижда и в Trucks."
          />
        </section>
      </div>
    </AppShell>
  );
}

function FuelAccessDeniedPanel() {
  return (
    <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5 shadow-sm">
      <h2 className="text-lg font-bold text-slate-950">
        Fuel access blocked
      </h2>

      <p className="mt-2 text-sm font-medium leading-6 text-amber-800">
        Твоята роля няма право да вижда Fuel страницата.
      </p>
    </section>
  );
}

function InfoCard({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-bold text-slate-950">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-slate-600">
        {text}
      </p>
    </div>
  );
}
