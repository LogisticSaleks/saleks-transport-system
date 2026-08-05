import "server-only";

import { prisma } from "@/lib/prisma";
import {
  hashSessionToken,
  readSessionTokenFromCookies,
} from "@/lib/auth/internalSession";
import type {
  UserProfileSettings,
  UserRoleValue,
  UserStatusValue,
} from "@/lib/settings/userProfiles";

export type CurrentUserAccessStatus =
  | "AUTHORIZED"
  | "UNAUTHENTICATED"
  | "PROFILE_REQUIRED"
  | "PENDING"
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

type UserSessionWithProfile = {
  id: string;
  expiresAt: Date;
  revokedAt: Date | null;
  lastSeenAt: Date | null;
  userProfile: UserProfileRecord;
};

export async function loadCurrentUserAccess(): Promise<CurrentUserAccess> {
  const sessionToken = await readSessionTokenFromCookies();

  if (!sessionToken) {
    return buildUnauthenticatedAccess();
  }

  const session = await prisma.userSession.findUnique({
    where: {
      tokenHash: hashSessionToken(sessionToken),
    },
    include: {
      userProfile: true,
    },
  });

  if (!session) {
    return buildUnauthenticatedAccess();
  }

  const normalizedSession = session as UserSessionWithProfile;
  const now = new Date();

  if (
    normalizedSession.revokedAt !== null ||
    normalizedSession.expiresAt <= now
  ) {
    return buildUnauthenticatedAccess();
  }

  const profile = normalizedSession.userProfile;
  const authUser = serializeAuthUser({
    profile,
    lastSignInAt: normalizedSession.lastSeenAt,
  });

  if (profile.status === "PENDING") {
    return {
      status: "PENDING",
      authUser,
      profile: serializeUserProfile(profile),
      profileCreated: false,
      message:
        "Your Saleks account is waiting for owner approval.",
    };
  }

  if (profile.status !== "ACTIVE") {
    return {
      status: "INACTIVE",
      authUser,
      profile: serializeUserProfile(profile),
      profileCreated: false,
      message:
        "Your Saleks user profile is inactive. Ask an owner or admin to activate it.",
    };
  }

  const touchedProfile = await prisma.$transaction(
    async (transaction) => {
      await transaction.userSession.update({
        where: {
          id: normalizedSession.id,
        },
        data: {
          lastSeenAt: now,
        },
      });

      return transaction.userProfile.update({
        where: {
          id: profile.id,
        },
        data: {
          lastSeenAt: now,
        },
      });
    },
  );

  return {
    status: "AUTHORIZED",
    authUser,
    profile: serializeUserProfile(touchedProfile),
    profileCreated: false,
    message: null,
  };
}

function buildUnauthenticatedAccess(): CurrentUserAccess {
  return {
    status: "UNAUTHENTICATED",
    authUser: null,
    profile: null,
    profileCreated: false,
    message: "You must be logged in to use Saleks Transport System.",
  };
}

function serializeAuthUser({
  profile,
  lastSignInAt,
}: {
  profile: UserProfileRecord;
  lastSignInAt: Date | null;
}): CurrentAuthUser {
  return {
    id: profile.id,
    email: profile.email,
    createdAt: profile.createdAt.toISOString(),
    lastSignInAt:
      lastSignInAt?.toISOString() ??
      profile.lastSeenAt?.toISOString() ??
      null,
  };
}

function serializeUserProfile(
  user: UserProfileRecord,
): UserProfileSettings {
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