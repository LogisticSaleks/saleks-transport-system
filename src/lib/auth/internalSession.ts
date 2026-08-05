import "server-only";

import { createHash, randomBytes } from "crypto";
import { cookies, headers } from "next/headers";
import type { NextResponse } from "next/server";

export const SESSION_COOKIE_NAME = "saleks_session";

const SESSION_TOKEN_BYTES = 32;
const SESSION_DURATION_DAYS = 30;
const SESSION_DURATION_MS =
  SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000;

export function createSessionToken(): string {
  return randomBytes(SESSION_TOKEN_BYTES).toString(
    "base64url",
  );
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function getSessionExpiryDate(): Date {
  return new Date(Date.now() + SESSION_DURATION_MS);
}

export async function readSessionTokenFromCookies(): Promise<
  string | null
> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  const token = sessionCookie?.value?.trim() ?? "";

  return token === "" ? null : token;
}

export function setSessionCookie({
  response,
  token,
  expiresAt,
}: {
  response: NextResponse;
  token: string;
  expiresAt: Date;
}): void {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function readRequestMetadata(): Promise<{
  userAgent: string | null;
  ipAddress: string | null;
}> {
  const headerStore = await headers();

  const forwardedFor = headerStore.get("x-forwarded-for");
  const realIp = headerStore.get("x-real-ip");

  return {
    userAgent: normalizeOptionalText(
      headerStore.get("user-agent"),
    ),
    ipAddress: normalizeOptionalText(
      forwardedFor?.split(",")[0] ?? realIp,
    ),
  };
}

function normalizeOptionalText(
  value: string | null | undefined,
): string | null {
  if (!value) {
    return null;
  }

  const normalizedValue = value.trim();

  return normalizedValue === "" ? null : normalizedValue;
}