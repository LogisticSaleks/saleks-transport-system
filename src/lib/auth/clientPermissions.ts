export type UserRoleValue =
  | "OWNER"
  | "ADMIN"
  | "DISPATCHER"
  | "FINANCE"
  | "VIEWER";

export type UserStatusValue =
  | "ACTIVE"
  | "INACTIVE";

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

export function roleHasClientPermission(
  role: string | null | undefined,
  permission: Permission,
): boolean {
  if (!role || !isUserRole(role)) {
    return false;
  }

  return ROLE_PERMISSIONS[role].includes(permission);
}

export function getClientPermissionsForRole(
  role: string | null | undefined,
): readonly Permission[] {
  if (!role || !isUserRole(role)) {
    return [];
  }

  return ROLE_PERMISSIONS[role];
}

export function isUserRole(
  value: string,
): value is UserRoleValue {
  return (
    value === "OWNER" ||
    value === "ADMIN" ||
    value === "DISPATCHER" ||
    value === "FINANCE" ||
    value === "VIEWER"
  );
}

export function isUserStatus(
  value: string,
): value is UserStatusValue {
  return value === "ACTIVE" || value === "INACTIVE";
}

export function formatClientRoleLabel(role: string): string {
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