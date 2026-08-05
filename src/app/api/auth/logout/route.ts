import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  clearSessionCookie,
  hashSessionToken,
  readSessionTokenFromCookies,
} from "@/lib/auth/internalSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const response = NextResponse.json({
    ok: true,
  });

  try {
    const sessionToken = await readSessionTokenFromCookies();

    if (sessionToken) {
      await prisma.userSession.updateMany({
        where: {
          tokenHash: hashSessionToken(sessionToken),
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });
    }
  } catch (error) {
    console.error("Internal logout API error:", error);
  }

  clearSessionCookie(response);

  return response;
}