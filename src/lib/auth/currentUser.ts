import "server-only";

import type { User } from "@supabase/supabase-js";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import type {
  UserProfileSettings,
  UserRoleValue,
  UserStatusValue,
} from "@/lib/settings/userProfiles";

export type CurrentUserAccessStatus =
  | "AUTHORIZED"
  | "UNAUTHENTICATED"
  | "PROFILE_REQUIRED"
  | "INACTIVE";

export type CurrentAuthUser = {
  id: string;
  email: string;
  createdAt: string | null;
  lastSignInAt: string | null;
};

export type CurrentUserAccess = {
  status: CurrentUserAccessStatus;
  authUser: CurrentAuthUser | null;
  profile: UserProfileSettings | null;
  profileCreated: boolean;
  message: string | null;
};

type ResolvedProfile = {
  profile: UserProfileRecord;
  created: boolean;
};

type UserProfileRecord = {
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
};

export async function loadCurrentUserAccess(): Promise<CurrentUserAccess> {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      status: "UNAUTHENTICATED",
      authUser: null,
      profile: null,
      profileCreated: false,
      message: "You must be logged in to use Saleks Transport System.",
    };
  }

  const authUser = serializeAuthUser(user);
  const resolvedProfile = await resolveProfileForAuthUser(user);

  if (!resolvedProfile) {
    return {
      status: "PROFILE_REQUIRED",
      authUser,
      profile: null,
      profileCreated: false,
      message:
        "Your Supabase account is not connected to an active Saleks user profile.",
    };
  }

  if (resolvedProfile.profile.status !== "ACTIVE") {
    return {
      status: "INACTIVE",
      authUser,
      profile: serializeUserProfile(resolvedProfile.profile),
      profileCreated: resolvedProfile.created,
      message:
        "Your Saleks user profile is inactive. Ask an owner or admin to activate it.",
    };
  }

  const touchedProfile = await prisma.userProfile.update({
    where: {
      id: resolvedProfile.profile.id,
    },
    data: {
      lastSeenAt: new Date(),
    },
  });

  return {
    status: "AUTHORIZED",
    authUser,
    profile: serializeUserProfile(touchedProfile),
    profileCreated: resolvedProfile.created,
    message: null,
  };
}

async function resolveProfileForAuthUser(
  user: User,
): Promise<ResolvedProfile | null> {
  const existingProfileByAuthUserId = await prisma.userProfile.findUnique({
    where: {
      authUserId: user.id,
    },
  });

  if (existingProfileByAuthUserId) {
    return {
      profile: existingProfileByAuthUserId,
      created: false,
    };
  }

  const normalizedEmail = normalizeEmail(user.email ?? "");

  if (normalizedEmail !== "") {
    const existingProfileByEmail = await prisma.userProfile.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (existingProfileByEmail) {
      const linkedProfile = await prisma.userProfile.update({
        where: {
          id: existingProfileByEmail.id,
        },
        data: {
          authUserId: user.id,
        },
      });

      return {
        profile: linkedProfile,
        created: false,
      };
    }
  }

  const profileCount = await prisma.userProfile.count();

  if (profileCount > 0 || normalizedEmail === "") {
    return null;
  }

  const ownerProfile = await prisma.userProfile.create({
    data: {
      authUserId: user.id,
      email: normalizedEmail,
      fullName: extractFullNameFromAuthUser(user),
      role: "OWNER",
      status: "ACTIVE",
      notes:
        "Automatically created as OWNER because this was the first Saleks user profile.",
      lastSeenAt: new Date(),
    },
  });

  return {
    profile: ownerProfile,
    created: true,
  };
}

function serializeAuthUser(user: User): CurrentAuthUser {
  return {
    id: user.id,
    email: user.email ?? "",
    createdAt: user.created_at ?? null,
    lastSignInAt: user.last_sign_in_at ?? null,
  };
}

function serializeUserProfile(user: UserProfileRecord): UserProfileSettings {
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

function extractFullNameFromAuthUser(user: User): string | null {
  const metadata = user.user_metadata as Record<string, unknown>;

  const metadataFullName = readOptionalMetadataText(metadata.full_name);
  const metadataName = readOptionalMetadataText(metadata.name);

  if (metadataFullName) {
    return metadataFullName;
  }

  if (metadataName) {
    return metadataName;
  }

  const email = normalizeEmail(user.email ?? "");

  if (email.includes("@")) {
    return email.split("@")[0] ?? null;
  }

  return null;
}

function readOptionalMetadataText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ");

  return normalizedValue === "" ? null : normalizedValue;
}

function normalizeEmail(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .toLowerCase();
}