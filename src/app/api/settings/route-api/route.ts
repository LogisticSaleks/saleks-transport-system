import { NextResponse } from "next/server";

import { requireApiPermission } from "@/lib/auth/permissions";
import { loadRouteApiSettingsStatus } from "@/lib/settings/routeApiSettings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const permission = await requireApiPermission("settings:read");

  if (!permission.ok) {
    return permission.response;
  }

  try {
    const status = await loadRouteApiSettingsStatus();

    return NextResponse.json({
      status,
    });
  } catch (error) {
    console.error(
      "Route/API settings status error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Route/API settings status could not be loaded.",
      },
      {
        status: 500,
      },
    );
  }
}