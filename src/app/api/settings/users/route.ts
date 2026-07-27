import { NextResponse } from "next/server";

import {
  createUserProfileInDb,
  loadUserProfilesFromDb,
  updateUserProfileInDb,
} from "@/lib/settings/userProfiles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
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