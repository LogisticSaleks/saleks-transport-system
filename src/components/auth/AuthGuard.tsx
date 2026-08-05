"use client";

import {
  ReactNode,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import {
  AuthProvider,
  type CurrentUserProfileForClient,
} from "@/components/auth/AuthContext";
import {
  isUserRole,
  isUserStatus,
} from "@/lib/auth/clientPermissions";

type AuthGuardProps = {
  children: ReactNode;
};

type CurrentUserApiResponse = {
  status?:
    | "AUTHORIZED"
    | "UNAUTHENTICATED"
    | "PROFILE_REQUIRED"
    | "INACTIVE";
  profile?: {
    email: string;
    fullName: string;
    role: string;
    status: string;
  } | null;
  message?: string | null;
  error?: string | null;
};

type AuthGuardState =
  | "checking"
  | "authorized"
  | "blocked";

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();

  const [authState, setAuthState] =
    useState<AuthGuardState>("checking");
  const [blockedMessage, setBlockedMessage] =
    useState<string | null>(null);
  const [profile, setProfile] =
    useState<CurrentUserProfileForClient | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function checkUserAccess(): Promise<void> {
      try {
        const response = await fetch(
          "/api/auth/current-user",
          {
            cache: "no-store",
          },
        );

        const responseData =
          (await response
            .json()
            .catch(() => null)) as
            | CurrentUserApiResponse
            | null;

        if (!isMounted) {
          return;
        }

        if (response.status === 401) {
          router.replace("/login");
          return;
        }

        const normalizedProfile =
          normalizeCurrentUserProfile(
            responseData?.profile ?? null,
          );

        if (!response.ok) {
          setBlockedMessage(
            responseData?.message ??
              responseData?.error ??
              "Your account is not authorized to use Saleks Transport System.",
          );
          setProfile(normalizedProfile);
          setAuthState("blocked");
          return;
        }

        if (
          responseData?.status !== "AUTHORIZED" ||
          !normalizedProfile
        ) {
          setBlockedMessage(
            responseData?.message ??
              "Your account is not authorized to use Saleks Transport System.",
          );
          setProfile(normalizedProfile);
          setAuthState("blocked");
          return;
        }

        setBlockedMessage(null);
        setProfile(normalizedProfile);
        setAuthState("authorized");
      } catch {
        if (!isMounted) {
          return;
        }

        setBlockedMessage(
          "Authentication could not be checked. Please refresh the page.",
        );
        setProfile(null);
        setAuthState("blocked");
      }
    }

    checkUserAccess();

    return () => {
      isMounted = false;
    };
  }, [router]);

  async function handleLogout(): Promise<void> {
    await fetch("/api/auth/logout", {
      method: "POST",
    }).catch(() => null);

    router.replace("/login");
    router.refresh();
  }

  if (authState === "checking") {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <div className="mx-auto max-w-5xl rounded-2xl bg-white p-8 shadow">
          <p className="text-slate-600">
            Checking authentication and user role...
          </p>
        </div>
      </main>
    );
  }

  if (authState === "blocked") {
    return (
      <AuthProvider status="blocked" profile={profile}>
        <main className="min-h-screen bg-slate-100 p-8">
          <div className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-white p-8 shadow">
            <div className="rounded-xl bg-red-50 p-5">
              <p className="text-sm font-semibold uppercase tracking-wide text-red-700">
                Access blocked
              </p>

              <h1 className="mt-2 text-2xl font-bold text-slate-950">
                Your account is not active in Saleks Transport System.
              </h1>

              <p className="mt-3 text-sm leading-6 text-slate-700">
                {blockedMessage ??
                  "Ask an owner or admin to activate your user profile."}
              </p>

              {profile ? (
                <div className="mt-4 rounded-lg border border-red-100 bg-white p-4 text-sm text-slate-700">
                  <div>
                    Email:{" "}
                    <span className="font-semibold text-slate-950">
                      {profile.email}
                    </span>
                  </div>

                  <div className="mt-1">
                    Role:{" "}
                    <span className="font-semibold text-slate-950">
                      {profile.role}
                    </span>
                  </div>

                  <div className="mt-1">
                    Status:{" "}
                    <span className="font-semibold text-slate-950">
                      {profile.status}
                    </span>
                  </div>
                </div>
              ) : null}

              <button
                type="button"
                onClick={handleLogout}
                className="mt-5 inline-flex h-10 items-center justify-center rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                Logout
              </button>
            </div>
          </div>
        </main>
      </AuthProvider>
    );
  }

  return (
    <AuthProvider status="authorized" profile={profile}>
      {children}
    </AuthProvider>
  );
}

function normalizeCurrentUserProfile(
  profile:
    | CurrentUserApiResponse["profile"]
    | null,
): CurrentUserProfileForClient | null {
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