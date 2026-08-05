import "server-only";

import { prisma } from "@/lib/prisma";

export type UserRoleValue =
  | "OWNER"
  | "ADMIN"
  | "DISPATCHER"
  | "FINANCE"
  | "VIEWER";

export type UserStatusValue =
  | "ACTIVE"
  | "PENDING"
  | "INACTIVE";

export type UserProfileSettings = {
  id: string | null;
  authUserId: string;
  email: string;
  fullName: string;
  role: UserRoleValue;
  status: UserStatusValue;
  notes: string;
  lastSeenAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type UserProfileSummary = {
  total: number;
  active: number;
  pending: number;
  inactive: number;
  owners: number;
  admins: number;
  dispatchers: number;
  finance: number;
  viewers: number;
};

export type UserProfilesResult = {
  users: UserProfileSettings[];
  summary: UserProfileSummary;
};

type UserProfileWriteData = {
  authUserId: string;
  email: string;
  fullName: string | null;
  role: UserRoleValue;
  status: UserStatusValue;
  notes: string | null;
};

const DEFAULT_USER_ROLE: UserRoleValue = "VIEWER";
const DEFAULT_USER_STATUS: UserStatusValue = "PENDING";

export async function loadUserProfilesFromDb(): Promise<UserProfilesResult> {
  const users = await prisma.userProfile.findMany({
    orderBy: [
      {
        status: "asc",
      },
      {
        role: "asc",
      },
      {
        email: "asc",
      },
    ],
  });

  const serializedUsers = users.map(serializeUserProfile);

  return {
    users: serializedUsers,
    summary: buildUserProfileSummary(serializedUsers),
  };
}

export async function createUserProfileInDb(
  payload: unknown,
): Promise<UserProfileSettings> {
  const parsedPayload = parseUserProfilePayload(payload, {
    requireId: false,
  });

  const writeData = buildUserProfileWriteData(parsedPayload);

  try {
    const user = await prisma.userProfile.create({
      data: writeData,
    });

    return serializeUserProfile(user);
  } catch (error) {
    throw normalizeUserProfileDatabaseError(error);
  }
}

export async function updateUserProfileInDb(
  payload: unknown,
): Promise<UserProfileSettings> {
  const parsedPayload = parseUserProfilePayload(payload, {
    requireId: true,
  });

  if (!parsedPayload.id) {
    throw new Error("User profile id is required.");
  }

  const writeData = buildUserProfileWriteData(parsedPayload);

  try {
    const user = await prisma.userProfile.update({
      where: {
        id: parsedPayload.id,
      },
      data: writeData,
    });

    return serializeUserProfile(user);
  } catch (error) {
    throw normalizeUserProfileDatabaseError(error);
  }
}

export async function deleteUserProfileInDb(
  payload: unknown,
  currentUserProfileId: string,
): Promise<UserProfileSettings> {
  const userProfileId = parseUserProfileDeletePayload(payload);
  const normalizedCurrentUserProfileId = normalizeText(currentUserProfileId);

  if (normalizedCurrentUserProfileId === "") {
    throw new Error("Current user profile id is required.");
  }

  if (userProfileId === normalizedCurrentUserProfileId) {
    throw new Error("You cannot delete your own user account.");
  }

  try {
    return await prisma.$transaction(async (transaction) => {
      const existingUser = await transaction.userProfile.findUnique({
        where: {
          id: userProfileId,
        },
      });

      if (!existingUser) {
        throw new Error("User profile was not found.");
      }

      if (existingUser.role === "OWNER") {
        const ownerCount = await transaction.userProfile.count({
          where: {
            role: "OWNER",
          },
        });

        if (ownerCount <= 1) {
          throw new Error("You cannot delete the last OWNER account.");
        }
      }

      await transaction.userSession.deleteMany({
        where: {
          userProfileId: existingUser.id,
        },
      });

      await transaction.userProfile.delete({
        where: {
          id: existingUser.id,
        },
      });

      return serializeUserProfile(existingUser);
    });
  } catch (error) {
    throw normalizeUserProfileDatabaseError(error);
  }
}

export function parseUserProfilePayload(
  payload: unknown,
  options: {
    requireId: boolean;
  },
): UserProfileSettings {
  if (!isObjectRecord(payload)) {
    throw new Error("User profile payload must be an object.");
  }

  const id = readOptionalText(payload.id);

  if (options.requireId && id === "") {
    throw new Error("User profile id is required.");
  }

  return normalizeUserProfile({
    id,
    authUserId: readRequiredText(payload.authUserId, "authUserId"),
    email: readRequiredText(payload.email, "email"),
    fullName: readOptionalText(payload.fullName),
    role: readUserRole(payload.role),
    status: readUserStatus(payload.status),
    notes: readOptionalText(payload.notes),
    lastSeenAt: null,
    createdAt: null,
    updatedAt: null,
  });
}

function parseUserProfileDeletePayload(payload: unknown): string {
  if (!isObjectRecord(payload)) {
    throw new Error("User profile delete payload must be an object.");
  }

  const id = readRequiredText(payload.id, "id");

  return id;
}

function normalizeUserProfile(
  profile: UserProfileSettings,
): UserProfileSettings {
  const normalizedEmail = normalizeEmail(profile.email);

  if (!isValidEmail(normalizedEmail)) {
    throw new Error("A valid email address is required.");
  }

  return {
    id: normalizeNullableText(profile.id),
    authUserId: normalizeRequiredText(profile.authUserId, "authUserId"),
    email: normalizedEmail,
    fullName: normalizeText(profile.fullName),
    role: isUserRole(profile.role) ? profile.role : DEFAULT_USER_ROLE,
    status: isUserStatus(profile.status)
      ? profile.status
      : DEFAULT_USER_STATUS,
    notes: normalizeText(profile.notes),
    lastSeenAt: profile.lastSeenAt,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

function buildUserProfileWriteData(
  profile: UserProfileSettings,
): UserProfileWriteData {
  return {
    authUserId: profile.authUserId,
    email: profile.email,
    fullName: toNullableText(profile.fullName),
    role: profile.role,
    status: profile.status,
    notes: toNullableText(profile.notes),
  };
}

function serializeUserProfile(user: {
  id: string;
  authUserId: string;
  email: string;
  fullName: string | null;
  role: UserRoleValue;
  status: UserStatusValue;
  notes: string | null;
  lastSeenAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): UserProfileSettings {
  return {
    id: user.id,
    authUserId: user.authUserId,
    email: user.email,
    fullName: user.fullName ?? "",
    role: user.role,
    status: user.status,
    notes: user.notes ?? "",
    lastSeenAt: user.lastSeenAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

function buildUserProfileSummary(
  users: readonly UserProfileSettings[],
): UserProfileSummary {
  const summary: UserProfileSummary = {
    total: users.length,
    active: 0,
    pending: 0,
    inactive: 0,
    owners: 0,
    admins: 0,
    dispatchers: 0,
    finance: 0,
    viewers: 0,
  };

  for (const user of users) {
    if (user.status === "ACTIVE") {
      summary.active += 1;
    } else if (user.status === "PENDING") {
      summary.pending += 1;
    } else {
      summary.inactive += 1;
    }

    switch (user.role) {
      case "OWNER":
        summary.owners += 1;
        break;

      case "ADMIN":
        summary.admins += 1;
        break;

      case "DISPATCHER":
        summary.dispatchers += 1;
        break;

      case "FINANCE":
        summary.finance += 1;
        break;

      case "VIEWER":
        summary.viewers += 1;
        break;

      default:
        break;
    }
  }

  return summary;
}

function readRequiredText(
  value: unknown,
  fieldName: string,
): string {
  const normalizedValue = normalizeTextValue(value);

  if (normalizedValue === "") {
    throw new Error(`${fieldName} is required.`);
  }

  return normalizedValue;
}

function readOptionalText(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  return normalizeTextValue(value);
}

function readUserRole(value: unknown): UserRoleValue {
  if (value === null || value === undefined || value === "") {
    return DEFAULT_USER_ROLE;
  }

  if (typeof value !== "string") {
    throw new Error(
      "User role must be OWNER, ADMIN, DISPATCHER, FINANCE or VIEWER.",
    );
  }

  const normalizedValue = value.trim().toUpperCase();

  if (!isUserRole(normalizedValue)) {
    throw new Error(
      "User role must be OWNER, ADMIN, DISPATCHER, FINANCE or VIEWER.",
    );
  }

  return normalizedValue;
}

function readUserStatus(value: unknown): UserStatusValue {
  if (value === null || value === undefined || value === "") {
    return DEFAULT_USER_STATUS;
  }

  if (typeof value !== "string") {
    throw new Error("User status must be ACTIVE, PENDING or INACTIVE.");
  }

  const normalizedValue = value.trim().toUpperCase();

  if (!isUserStatus(normalizedValue)) {
    throw new Error("User status must be ACTIVE, PENDING or INACTIVE.");
  }

  return normalizedValue;
}

function normalizeRequiredText(
  value: string,
  fieldName: string,
): string {
  const normalizedValue = normalizeText(value);

  if (normalizedValue === "") {
    throw new Error(`${fieldName} is required.`);
  }

  return normalizedValue;
}

function normalizeTextValue(value: unknown): string {
  if (typeof value !== "string") {
    throw new Error("User profile text fields must be strings.");
  }

  return normalizeText(value);
}

function normalizeText(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeEmail(value: string): string {
  return normalizeRequiredText(value, "email").toLowerCase();
}

function normalizeNullableText(
  value: string | null,
): string | null {
  if (value === null) {
    return null;
  }

  const normalizedValue = normalizeText(value);

  return normalizedValue === "" ? null : normalizedValue;
}

function toNullableText(value: string): string | null {
  const normalizedValue = normalizeText(value);

  return normalizedValue === "" ? null : normalizedValue;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isUserRole(value: string): value is UserRoleValue {
  return (
    value === "OWNER" ||
    value === "ADMIN" ||
    value === "DISPATCHER" ||
    value === "FINANCE" ||
    value === "VIEWER"
  );
}

function isUserStatus(value: string): value is UserStatusValue {
  return (
    value === "ACTIVE" ||
    value === "PENDING" ||
    value === "INACTIVE"
  );
}

function isObjectRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function normalizeUserProfileDatabaseError(error: unknown): Error {
  if (isPrismaUniqueError(error)) {
    return new Error(
      "A user profile with this auth user id or email already exists.",
    );
  }

  if (isPrismaNotFoundError(error)) {
    return new Error("User profile was not found.");
  }

  return error instanceof Error
    ? error
    : new Error("User profile could not be saved.");
}

function isPrismaUniqueError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

function isPrismaNotFoundError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2025"
  );
}