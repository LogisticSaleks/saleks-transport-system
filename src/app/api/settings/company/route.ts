import { NextResponse } from "next/server";

import {
  loadCompanySettingsFromDb,
  saveCompanySettingsToDb,
} from "@/lib/settings/companySettings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const company =
      await loadCompanySettingsFromDb();

    return NextResponse.json({
      company,
    });
  } catch (error) {
    console.error(
      "Company settings GET error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Company settings could not be loaded.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const payload =
      await request.json();

    const company =
      await saveCompanySettingsToDb(payload);

    return NextResponse.json({
      company,
    });
  } catch (error) {
    console.error(
      "Company settings PUT error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Company settings could not be saved.",
      },
      {
        status: 400,
      },
    );
  }
}