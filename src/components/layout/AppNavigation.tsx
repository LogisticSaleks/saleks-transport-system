"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavigationItem = {
  href: string;
  label: string;
};

const NAVIGATION_ITEMS: readonly NavigationItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
  },
  {
    href: "/courses",
    label: "Courses",
  },
  {
    href: "/customers",
    label: "Customers",
  },
  {
    href: "/trucks",
    label: "Trucks",
  },
  {
    href: "/reports",
    label: "Reports",
  },
  {
    href: "/settings",
    label: "Settings",
  },
];

export default function AppNavigation() {
  const pathname = usePathname();

  if (pathname === "/login") {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-700 bg-slate-950 shadow-lg">
      <div className="mx-auto flex min-h-16 w-full max-w-[1800px] flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-6">
        <Link
          href="/dashboard"
          className="group inline-flex items-center gap-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-300"
          aria-label="Saleks Transport System dashboard"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500 text-sm font-black tracking-tight text-white shadow-md transition group-hover:bg-sky-400">
            SX
          </span>

          <span className="flex flex-col leading-tight">
            <span className="text-sm font-bold uppercase tracking-wide text-white">
              Saleks
            </span>
            <span className="text-xs font-medium text-slate-300">
              Transport System
            </span>
          </span>
        </Link>

        <nav
          aria-label="Main navigation"
          className="flex gap-2 overflow-x-auto pb-1 lg:pb-0"
        >
          {NAVIGATION_ITEMS.map((item) => {
            const isActive = isActiveNavigationItem(
              pathname,
              item.href,
            );

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={[
                  "inline-flex h-10 shrink-0 items-center justify-center rounded-lg border px-4 text-sm font-semibold shadow-sm transition focus:outline-none focus:ring-2 focus:ring-sky-300",
                  isActive
                    ? "border-sky-400 bg-sky-500 text-white"
                    : "border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-500 hover:bg-slate-800 hover:text-white",
                ].join(" ")}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

function isActiveNavigationItem(
  pathname: string,
  href: string,
): boolean {
  if (href === "/dashboard") {
    return pathname === "/" || pathname === "/dashboard";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}