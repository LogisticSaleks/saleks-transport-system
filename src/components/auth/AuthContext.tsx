"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  isUserRole,
  isUserStatus,
  roleHasClientPermission,
  type Permission,
  type UserRoleValue,
  type UserStatusValue,
} from "@/lib/auth/clientPermissions";

export type CurrentUserProfileForClient = {
  email: string;
  fullName: string;
  role: UserRoleValue;
  status: UserStatusValue;
};

export type AuthContextStatus =
  | "checking"
  | "authorized"
  | "blocked";

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
};

type AuthContextValue = {
  status: AuthContextStatus;
  profile: CurrentUserProfileForClient | null;
  hasPermission: (permission: Permission) => boolean;
  hasProvider: boolean;
};

type LocalAccessState = {
  status: AuthContextStatus;
  profile: CurrentUserProfileForClient | null;
};

const DEFAULT_AUTH_CONTEXT: AuthContextValue = {
  status: "checking",
  profile: null,
  hasPermission: () => false,
  hasProvider: false,
};

const AuthContext = createContext<AuthContextValue>(
  DEFAULT_AUTH_CONTEXT,
);

export function AuthProvider({
  status,
  profile,
  children,
}: {
  status: AuthContextStatus;
  profile: CurrentUserProfileForClient | null;
  children: ReactNode;
}) {
  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      profile,
      hasProvider: true,
      hasPermission: (permission) =>
        roleHasClientPermission(
          profile?.role,
          permission,
        ),
    }),
    [status, profile],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useCurrentUserAccess(): AuthContextValue {
  const context = useContext(AuthContext);

  const [localAccess, setLocalAccess] =
    useState<LocalAccessState>({
      status: "checking",
      profile: null,
    });

  useEffect(() => {
    if (context.profile) {
      return;
    }

    let isMounted = true;

    async function loadCurrentUser(): Promise<void> {
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

        const normalizedProfile =
          normalizeCurrentUserProfile(
            responseData?.profile ?? null,
          );

        if (
          response.ok &&
          responseData?.status === "AUTHORIZED" &&
          normalizedProfile
        ) {
          setLocalAccess({
            status: "authorized",
            profile: normalizedProfile,
          });

          return;
        }

        setLocalAccess({
          status: "blocked",
          profile: normalizedProfile,
        });
      } catch {
        if (!isMounted) {
          return;
        }

        setLocalAccess({
          status: "blocked",
          profile: null,
        });
      }
    }

    loadCurrentUser();

    return () => {
      isMounted = false;
    };
  }, [context.profile]);

  const effectiveProfile =
    context.profile ?? localAccess.profile;

  const effectiveStatus = context.profile
    ? context.status
    : localAccess.status;

  return useMemo<AuthContextValue>(
    () => ({
      status: effectiveStatus,
      profile: effectiveProfile,
      hasProvider: context.hasProvider,
      hasPermission: (permission) =>
        roleHasClientPermission(
          effectiveProfile?.role,
          permission,
        ),
    }),
    [
      context.hasProvider,
      effectiveProfile,
      effectiveStatus,
    ],
  );
}

export function useCan(permission: Permission): boolean {
  const access = useCurrentUserAccess();

  return access.hasPermission(permission);
}

function normalizeCurrentUserProfile(
  profile:
    | CurrentUserApiResponse["profile"]
    | null,
): CurrentUserProfileForClient | null {
  if (!profile) {
    return null;
  }

  const role = profile.role
    .normalize("NFKC")
    .trim()
    .toUpperCase();

  const status = profile.status
    .normalize("NFKC")
    .trim()
    .toUpperCase();

  if (!isUserRole(role) || !isUserStatus(status)) {
    return null;
  }

  return {
    email: profile.email,
    fullName: profile.fullName,
    role,
    status,
  };
}