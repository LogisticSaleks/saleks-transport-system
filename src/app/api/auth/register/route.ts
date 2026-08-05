import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  hashPassword,
  PasswordValidationError,
} from "@/lib/auth/password";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RegisterRequestBody = {
  email?: unknown;
  fullName?: unknown;
  password?: unknown;
  confirmPassword?: unknown;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as
      | RegisterRequestBody
      | null;

    const email = normalizeEmail(body?.email);
    const fullName = normalizeOptionalText(body?.fullName);
    const password = readPassword(body?.password);
    const confirmPassword = readPassword(body?.confirmPassword);

    if (!email) {
      return validationErrorResponse(
        "A valid email address is required.",
      );
    }

    if (!password || !confirmPassword) {
      return validationErrorResponse(
        "Password and password confirmation are required.",
      );
    }

    if (password !== confirmPassword) {
      return validationErrorResponse(
        "Password confirmation does not match.",
      );
    }

    const passwordHash = await hashPassword(password);
    const userCount = await prisma.userProfile.count();
    const isFirstUser = userCount === 0;

    const existingUser = await prisma.userProfile.findUnique({
      where: {
        email,
      },
    });

    if (existingUser?.passwordHash) {
      return NextResponse.json(
        {
          error: "An account with this email already exists.",
        },
        {
          status: 409,
        },
      );
    }

    const role = isFirstUser ? "OWNER" : existingUser?.role ?? "VIEWER";
    const status = isFirstUser ? "ACTIVE" : "PENDING";
    const now = new Date();

    const user = existingUser
      ? await prisma.userProfile.update({
          where: {
            id: existingUser.id,
          },
          data: {
            fullName:
              fullName !== ""
                ? fullName
                : existingUser.fullName,
            status,
            passwordHash,
            passwordChangedAt: now,
            notes: appendRegistrationNote(
              existingUser.notes,
              isFirstUser,
            ),
          },
        })
      : await prisma.userProfile.create({
          data: {
            authUserId: `internal:${email}`,
            email,
            fullName: fullName !== "" ? fullName : null,
            role,
            status,
            passwordHash,
            passwordChangedAt: now,
            notes: isFirstUser
              ? "Registered as first internal OWNER user."
              : "Self-registered account waiting for owner approval.",
          },
        });

    return NextResponse.json(
      {
        status: user.status,
        role: user.role,
        message:
          user.status === "ACTIVE"
            ? "Account created. You can now log in."
            : "Account created. It is waiting for owner approval.",
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    if (error instanceof PasswordValidationError) {
      return validationErrorResponse(error.message);
    }

    if (isPrismaUniqueError(error)) {
      return NextResponse.json(
        {
          error: "An account with this email already exists.",
        },
        {
          status: 409,
        },
      );
    }

    console.error("Internal registration API error:", error);

    return NextResponse.json(
      {
        error: "Registration failed.",
      },
      {
        status: 500,
      },
    );
  }
}

function validationErrorResponse(message: string) {
  return NextResponse.json(
    {
      error: message,
    },
    {
      status: 400,
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

  if (!isValidEmail(normalizedValue)) {
    return null;
  }

  return normalizedValue;
}

function normalizeOptionalText(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value !== "string") {
    return "";
  }

  return value
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ");
}

function readPassword(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  return value === "" ? null : value;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function appendRegistrationNote(
  currentNotes: string | null,
  isFirstUser: boolean,
): string {
  const registrationNote = isFirstUser
    ? "Registered as first internal OWNER user."
    : "Self-registered account waiting for owner approval.";

  const normalizedCurrentNotes = currentNotes?.trim() ?? "";

  if (normalizedCurrentNotes === "") {
    return registrationNote;
  }

  if (normalizedCurrentNotes.includes(registrationNote)) {
    return normalizedCurrentNotes;
  }

  return `${normalizedCurrentNotes}\n${registrationNote}`;
}

function isPrismaUniqueError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}