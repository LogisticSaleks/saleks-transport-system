import { randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

const PASSWORD_HASH_VERSION = "scrypt-v1";
const PASSWORD_SALT_BYTES = 24;
const PASSWORD_KEY_LENGTH = 64;
const MINIMUM_PASSWORD_LENGTH = 8;

export async function hashPassword(
  password: string,
): Promise<string> {
  validatePassword(password);

  const salt = randomBytes(PASSWORD_SALT_BYTES).toString(
    "base64url",
  );
  const derivedKey = (await scryptAsync(
    password,
    salt,
    PASSWORD_KEY_LENGTH,
  )) as Buffer;

  return [
    PASSWORD_HASH_VERSION,
    salt,
    derivedKey.toString("base64url"),
  ].join("$");
}

export async function verifyPassword({
  password,
  passwordHash,
}: {
  password: string;
  passwordHash: string | null | undefined;
}): Promise<boolean> {
  if (!passwordHash) {
    return false;
  }

  const parts = passwordHash.split("$");

  if (parts.length !== 3) {
    return false;
  }

  const [version, salt, expectedKey] = parts;

  if (
    version !== PASSWORD_HASH_VERSION ||
    !salt ||
    !expectedKey
  ) {
    return false;
  }

  const expectedBuffer = Buffer.from(
    expectedKey,
    "base64url",
  );

  if (expectedBuffer.length !== PASSWORD_KEY_LENGTH) {
    return false;
  }

  const actualBuffer = (await scryptAsync(
    password,
    salt,
    PASSWORD_KEY_LENGTH,
  )) as Buffer;

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualBuffer, expectedBuffer);
}

export function validatePassword(password: string): void {
  if (typeof password !== "string") {
    throw new PasswordValidationError(
      "Password must be text.",
    );
  }

  if (password.length < MINIMUM_PASSWORD_LENGTH) {
    throw new PasswordValidationError(
      `Password must be at least ${MINIMUM_PASSWORD_LENGTH} characters.`,
    );
  }
}

export class PasswordValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PasswordValidationError";
  }
}