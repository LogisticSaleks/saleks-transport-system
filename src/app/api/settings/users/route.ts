import { NextResponse } from "next/server";

import { loadCurrentUserAccess } from "@/lib/auth/currentUser";
import { requireApiPermission } from "@/lib/auth/permissions";
import {
  createUserProfileInDb,
  deleteUserProfileInDb,
  loadUserProfilesFromDb,
  updateUserProfileInDb,
} from "@/lib/settings/userProfiles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const permission = await requireApiPermission("users:read");

  if (!permission.ok) {
    return permission.response;
  }

  try {
    const result = await loadUserProfilesFromDb();

    return NextResponse.json(result);
  } catch (error) {
    console.error("User profiles GET error:", error);

    return NextResponse.json(
      {
        error: "User profiles could not be loaded.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(request: Request) {
  const permission = await requireApiPermission("users:manage");

  if (!permission.ok) {
    return permission.response;
  }

  try {
    const payload = await request.json();
    const user = await createUserProfileInDb(payload);
    const result = await loadUserProfilesFromDb();

    return NextResponse.json({
      user,
      ...result,
    });
  } catch (error) {
    console.error("User profiles POST error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "User profile could not be created.",
      },
      {
        status: 400,
      },
    );
  }
}

export async function PATCH(request: Request) {
  const permission = await requireApiPermission("users:manage");

  if (!permission.ok) {
    return permission.response;
  }

  try {
    const payload = await request.json();
    const user = await updateUserProfileInDb(payload);
    const result = await loadUserProfilesFromDb();

    return NextResponse.json({
      user,
      ...result,
    });
  } catch (error) {
    console.error("User profiles PATCH error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "User profile could not be updated.",
      },
      {
        status: 400,
      },
    );
  }
}

export async function DELETE(request: Request) {
  const permission = await requireApiPermission("users:manage");

  if (!permission.ok) {
    return permission.response;
  }

  try {
    const currentUserAccess = await loadCurrentUserAccess();

    if (
      currentUserAccess.status !== "AUTHORIZED" ||
      !currentUserAccess.profile?.id
    ) {
      return NextResponse.json(
        {
          error: "Current user could not be verified.",
        },
        {
          status: 401,
        },
      );
    }

    const payload = await request.json();
    const user = await deleteUserProfileInDb(
      payload,
      currentUserAccess.profile.id,
    );
    const result = await loadUserProfilesFromDb();

    return NextResponse.json({
      user,
      ...result,
    });
  } catch (error) {
    console.error("User profiles DELETE error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "User profile could not be deleted.",
      },
      {
        status: 400,
      },
    );
  }
}