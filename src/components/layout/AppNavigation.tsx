"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

type NavigationItem = {
  href: string;
  label: string;
};

type NavigationUserProfile = {
  email: string;
  fullName: string;
  role: string;
  status: string;
};

type CurrentUserApiResponse = {
  status?: string;
  profile?: NavigationUserProfile | null;
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
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [profile, setProfile] =
    useState<NavigationUserProfile | null>(null);

  useEffect(() => {
    if (pathname === "/login") {
      setProfile(null);
      return;
    }

    let isMounted = true;

    async function loadNavigationProfile(): Promise<void> {
      try {
        const response = await fetch(
          "/api/auth/current-user",
          {
            cache: "no-store",
          },
        );

        if (!response.ok) {
          if (isMounted) {
            setProfile(null);
          }

          return;
        }

        const responseData =
          (await response.json()) as CurrentUserApiResponse;

        if (!isMounted) {
          return;
        }

        if (
          responseData.status === "AUTHORIZED" &&
          responseData.profile
        ) {
          setProfile(responseData.profile);
        } else {
          setProfile(null);
        }
      } catch {
        if (isMounted) {
          setProfile(null);
        }
      }
    }

    loadNavigationProfile();

    return () => {
      isMounted = false;
    };
  }, [pathname]);

  if (pathname === "/login") {
    return null;
  }

  async function handleLogout(): Promise<void> {
    await supabase.auth.signOut();

    setProfile(null);
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-700 bg-slate-950 shadow-lg">
      <div className="mx-auto flex min-h-16 w-full max-w-[1800px] flex-col gap-3 px-4 py-3 xl:flex-row xl:items-center xl:justify-between xl:px-6">
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

        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <nav
            aria-label="Main navigation"
            className="flex gap-2 overflow-x-auto pb-1 lg:pb-0"
          >
            {NAVIGATION_ITEMS.map((item) => {
              const isActive =
                isActiveNavigationItem(
                  pathname,
                  item.href,
                );

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={
                    isActive ? "page" : undefined
                  }
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

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {profile ? (
              <div className="flex h-10 items-center gap-3 rounded-lg border border-slate-700 bg-slate-900 px-3 text-xs text-slate-200 shadow-sm">
                <span className="max-w-44 truncate font-semibold text-white">
                  {profile.fullName.trim() !== ""
                    ? profile.fullName
                    : profile.email}
                </span>

                <span className="rounded-full bg-sky-500/15 px-2 py-1 font-bold uppercase tracking-wide text-sky-200">
                  {formatRole(profile.role)}
                </span>
              </div>
            ) : null}

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg border border-red-300 bg-red-50 px-4 text-sm font-semibold text-red-700 shadow-sm transition hover:border-red-400 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-300"
            >
              Logout
            </button>
          </div>
        </div>
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

function formatRole(role: string): string {
  switch (role) {
    case "OWNER":
      return "Owner";

    case "ADMIN":
      return "Admin";

    case "DISPATCHER":
      return "Dispatcher";

    case "FINANCE":
      return "Finance";

    case "VIEWER":
      return "Viewer";

    default:
      return role;
  }
}