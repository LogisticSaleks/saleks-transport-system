import { NextResponse } from "next/server";

import { loadCurrentUserAccess } from "@/lib/auth/currentUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const access = await loadCurrentUserAccess();

    if (access.status === "UNAUTHENTICATED") {
      return NextResponse.json(
        {
          ...access,
          error: access.message,
        },
        {
          status: 401,
        },
      );
    }

    if (
      access.status === "PROFILE_REQUIRED" ||
      access.status === "PENDING" ||
      access.status === "INACTIVE"
    ) {
      return NextResponse.json(
        {
          ...access,
          error: access.message,
        },
        {
          status: 403,
        },
      );
    }

    return NextResponse.json(access);
  } catch (error) {
    console.error("Current user API error:", error);

    return NextResponse.json(
      {
        status: "UNAUTHENTICATED",
        authUser: null,
        profile: null,
        profileCreated: false,
        message: "Current user could not be checked.",
        error: "Current user could not be checked.",
      },
      {
        status: 500,
      },
    );
  }
}