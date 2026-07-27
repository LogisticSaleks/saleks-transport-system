import { NextResponse } from "next/server";

import {
  loadCalculationSettingsFromDb,
  parseCalculationSettingsPayload,
  saveCalculationSettingsToDb,
} from "@/lib/settings/calculationSettingsDb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings =
      await loadCalculationSettingsFromDb();

    return NextResponse.json({
      settings,
    });
  } catch (error) {
    console.error(
      "Calculation settings GET error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Calculation settings could not be loaded.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const requestBody = await request.json();

    const parsedSettings =
      parseCalculationSettingsPayload(
        requestBody,
      );

    const savedSettings =
      await saveCalculationSettingsToDb(
        parsedSettings,
      );

    return NextResponse.json({
      settings: savedSettings,
    });
  } catch (error) {
    console.error(
      "Calculation settings PATCH error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Calculation settings could not be saved.",
      },
      {
        status: 400,
      },
    );
  }
}