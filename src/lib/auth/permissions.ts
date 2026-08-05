import "server-only";

import { NextResponse } from "next/server";

import {
  loadCurrentUserAccess,
  type CurrentUserAccess,
} from "@/lib/auth/currentUser";
import type {
  UserProfileSettings,
  UserRoleValue,
} from "@/lib/settings/userProfiles";

export type Permission =
  | "settings:read"
  | "settings:manage"
  | "users:read"
  | "users:manage"
  | "courses:read"
  | "courses:write"
  | "customers:read"
  | "customers:write"
  | "trucks:read"
  | "trucks:write"
  | "addresses:read"
  | "addresses:write"
  | "routes:calculate"
  | "dashboard:read"
  | "reports:read"
  | "reports:write"
  | "settlements:read"
  | "settlements:write";

type ApiPermissionSuccess = {
  ok: true;
  access: CurrentUserAccess;
  profile: UserProfileSettings;
};

type ApiPermissionFailure = {
  ok: false;
  response: NextResponse;
};

export type ApiPermissionResult =
  | ApiPermissionSuccess
  | ApiPermissionFailure;

export type RolePermissionSummary = {
  role: UserRoleValue;
  permissions: readonly Permission[];
};

const ALL_PERMISSIONS: readonly Permission[] = [
  "settings:read",
  "settings:manage",
  "users:read",
  "users:manage",
  "courses:read",
  "courses:write",
  "customers:read",
  "customers:write",
  "trucks:read",
  "trucks:write",
  "addresses:read",
  "addresses:write",
  "routes:calculate",
  "dashboard:read",
  "reports:read",
  "reports:write",
  "settlements:read",
  "settlements:write",
];

const ADMIN_PERMISSIONS: readonly Permission[] =
  ALL_PERMISSIONS.filter(
    (permission) =>
      permission !== "users:manage",
  );

const ROLE_PERMISSIONS: Record<
  UserRoleValue,
  readonly Permission[]
> = {
  OWNER: ALL_PERMISSIONS,

  ADMIN: ADMIN_PERMISSIONS,

  DISPATCHER: [
    "courses:read",
    "courses:write",
    "customers:read",
    "trucks:read",
    "addresses:read",
    "addresses:write",
    "routes:calculate",
  ],

  FINANCE: [
    "dashboard:read",
    "courses:read",
    "customers:read",
    "trucks:read",
    "reports:read",
    "reports:write",
    "settlements:read",
    "settlements:write",
  ],

  VIEWER: [
    "dashboard:read",
    "courses:read",
    "customers:read",
    "trucks:read",
    "settlements:read",
  ],
};

export async function requireApiPermission(
  permission: Permission,
): Promise<ApiPermissionResult> {
  const access = await loadCurrentUserAccess();

  if (access.status === "UNAUTHENTICATED") {
    return buildPermissionFailure({
      status: 401,
      code: "UNAUTHENTICATED",
      message:
        access.message ??
        "You must be logged in to use this API route.",
      permission,
    });
  }

  if (access.status === "PROFILE_REQUIRED") {
    return buildPermissionFailure({
      status: 403,
      code: "PROFILE_REQUIRED",
      message:
        access.message ??
        "Your account is not connected to a Saleks user profile.",
      permission,
    });
  }

  if (access.status === "PENDING") {
    return buildPermissionFailure({
      status: 403,
      code: "PENDING_PROFILE",
      message:
        access.message ??
        "Your Saleks account is waiting for owner approval.",
      permission,
    });
  }

  if (access.status === "INACTIVE") {
    return buildPermissionFailure({
      status: 403,
      code: "INACTIVE_PROFILE",
      message:
        access.message ??
        "Your Saleks user profile is inactive.",
      permission,
    });
  }

  const profile = access.profile;

  if (!profile) {
    return buildPermissionFailure({
      status: 403,
      code: "PROFILE_REQUIRED",
      message:
        "Your account is not connected to a Saleks user profile.",
      permission,
    });
  }

  if (!roleHasPermission(profile.role, permission)) {
    return buildPermissionFailure({
      status: 403,
      code: "MISSING_PERMISSION",
      message:
        "Your Saleks role does not allow this action.",
      permission,
      role: profile.role,
    });
  }

  return {
    ok: true,
    access,
    profile,
  };
}

export function roleHasPermission(
  role: UserRoleValue,
  permission: Permission,
): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function getPermissionsForRole(
  role: UserRoleValue,
): readonly Permission[] {
  return ROLE_PERMISSIONS[role];
}

export function getRolePermissionSummary(): RolePermissionSummary[] {
  return Object.entries(ROLE_PERMISSIONS).map(
    ([role, permissions]) => ({
      role: role as UserRoleValue,
      permissions,
    }),
  );
}

function buildPermissionFailure({
  status,
  code,
  message,
  permission,
  role,
}: {
  status: 401 | 403;
  code:
    | "UNAUTHENTICATED"
    | "PROFILE_REQUIRED"
    | "PENDING_PROFILE"
    | "INACTIVE_PROFILE"
    | "MISSING_PERMISSION";
  message: string;
  permission: Permission;
  role?: UserRoleValue;
}): ApiPermissionFailure {
  return {
    ok: false,
    response: NextResponse.json(
      {
        error: message,
        code,
        requiredPermission: permission,
        role: role ?? null,
      },
      {
        status,
      },
    ),
  };
}