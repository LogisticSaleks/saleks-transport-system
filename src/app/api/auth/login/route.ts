import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  createSessionToken,
  getSessionExpiryDate,
  hashSessionToken,
  readRequestMetadata,
  setSessionCookie,
} from "@/lib/auth/internalSession";
import { verifyPassword } from "@/lib/auth/password";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LoginRequestBody = {
  email?: unknown;
  password?: unknown;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as
      | LoginRequestBody
      | null;

    const email = normalizeEmail(body?.email);
    const password = readPassword(body?.password);

    if (!email || !password) {
      return invalidLoginResponse();
    }

    const userProfile = await prisma.userProfile.findUnique({
      where: {
        email,
      },
    });

    const isPasswordValid = await verifyPassword({
      password,
      passwordHash: userProfile?.passwordHash,
    });

    if (!userProfile || !isPasswordValid) {
      return invalidLoginResponse();
    }

    if (userProfile.status !== "ACTIVE") {
      return NextResponse.json(
        {
          error:
            "Your Saleks user profile is inactive. Ask an owner or admin to activate it.",
        },
        {
          status: 403,
        },
      );
    }

    const sessionToken = createSessionToken();
    const expiresAt = getSessionExpiryDate();
    const requestMetadata = await readRequestMetadata();

    await prisma.userSession.create({
      data: {
        userProfileId: userProfile.id,
        tokenHash: hashSessionToken(sessionToken),
        expiresAt,
        lastSeenAt: new Date(),
        userAgent: requestMetadata.userAgent,
        ipAddress: requestMetadata.ipAddress,
      },
    });

    const response = NextResponse.json({
      status: "AUTHORIZED",
      profile: {
        email: userProfile.email,
        fullName: userProfile.fullName ?? "",
        role: userProfile.role,
        status: userProfile.status,
      },
    });

    setSessionCookie({
      response,
      token: sessionToken,
      expiresAt,
    });

    return response;
  } catch (error) {
    console.error("Internal login API error:", error);

    return NextResponse.json(
      {
        error: "Login failed.",
      },
      {
        status: 500,
      },
    );
  }
}

function invalidLoginResponse() {
  return NextResponse.json(
    {
      error: "Invalid email or password.",
    },
    {
      status: 401,
    },
  );
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value
    .normalize("NFKC")
    .trim()
    .toLowerCase();

  return normalizedValue === "" ? null : normalizedValue;
}

function readPassword(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  return value === "" ? null : value;
}