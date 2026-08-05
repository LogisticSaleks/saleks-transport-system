"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useEffect,
  useState,
} from "react";

import {
  formatClientRoleLabel,
  isUserRole,
  isUserStatus,
  roleHasClientPermission,
  type Permission,
  type UserRoleValue,
  type UserStatusValue,
} from "@/lib/auth/clientPermissions";

type NavigationItem = {
  href: string;
  label: string;
  permissions: readonly Permission[];
};

type NavigationUserProfile = {
  email: string;
  fullName: string;
  role: UserRoleValue;
  status: UserStatusValue;
};

type CurrentUserApiResponse = {
  status?: string;
  profile?: {
    email: string;
    fullName: string;
    role: string;
    status: string;
  } | null;
};

const PUBLIC_AUTH_PATHS = new Set(["/login", "/register"]);

const NAVIGATION_ITEMS: readonly NavigationItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    permissions: ["dashboard:read"],
  },
  {
    href: "/courses",
    label: "Courses",
    permissions: ["courses:read"],
  },
  {
    href: "/customers",
    label: "Customers",
    permissions: ["customers:read"],
  },
  {
    href: "/trucks",
    label: "Trucks",
    permissions: ["trucks:read"],
  },
  {
    href: "/reports",
    label: "Reports",
    permissions: ["reports:read"],
  },
  {
    href: "/settings",
    label: "Settings",
    permissions: ["settings:read", "addresses:read"],
  },
];

export default function AppNavigation() {
  const pathname = usePathname();
  const router = useRouter();

  const [profile, setProfile] =
    useState<NavigationUserProfile | null>(null);

  const isPublicAuthPath = PUBLIC_AUTH_PATHS.has(pathname);

  useEffect(() => {
    if (isPublicAuthPath) {
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

        const normalizedProfile =
          normalizeNavigationProfile(
            responseData.profile ?? null,
          );

        if (
          responseData.status === "AUTHORIZED" &&
          normalizedProfile
        ) {
          setProfile(normalizedProfile);
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
  }, [isPublicAuthPath, pathname]);

  if (isPublicAuthPath) {
    return null;
  }

  async function handleLogout(): Promise<void> {
    await fetch("/api/auth/logout", {
      method: "POST",
    }).catch(() => null);

    setProfile(null);
    router.push("/login");
    router.refresh();
  }

  const visibleNavigationItems = profile
    ? NAVIGATION_ITEMS.filter((item) =>
        isNavigationItemVisible(profile.role, item),
      )
    : [];

  const defaultNavigationHref =
    visibleNavigationItems[0]?.href ?? "/login";

  return (
    <header className="sticky top-0 z-40 border-b border-slate-700 bg-slate-950 shadow-lg">
      <div className="mx-auto flex min-h-16 w-full max-w-[1800px] flex-col gap-3 px-4 py-3 xl:flex-row xl:items-center xl:justify-between xl:px-6">
        <Link
          href={defaultNavigationHref}
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
            {visibleNavigationItems.map((item) => {
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
                  {formatClientRoleLabel(profile.role)}
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

function isNavigationItemVisible(
  role: UserRoleValue,
  item: NavigationItem,
): boolean {
  return item.permissions.some((permission) =>
    roleHasClientPermission(role, permission),
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

function normalizeNavigationProfile(
  profile:
    | CurrentUserApiResponse["profile"]
    | null,
): NavigationUserProfile | null {
  if (!profile) {
    return null;
  }

  if (
    !isUserRole(profile.role) ||
    !isUserStatus(profile.status)
  ) {
    return null;
  }

  return {
    email: profile.email,
    fullName: profile.fullName,
    role: profile.role,
    status: profile.status,
  };
}