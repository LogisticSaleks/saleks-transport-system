import { config } from "dotenv";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/auth/password";

config({ path: ".env.local" });
config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is missing.");
}

const pool = new Pool({
  connectionString: databaseUrl,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = normalizeEmail(process.argv[2] ?? "");
  const password = process.argv[3] ?? "";

  if (!email) {
    throw new Error(
      "Usage: npm.cmd exec -- tsx prisma/set-internal-user-password.ts user@example.com NewPassword123!",
    );
  }

  if (password.length < 8) {
    throw new Error(
      "Password must be provided as the second argument and must be at least 8 characters.",
    );
  }

  const passwordHash = await hashPassword(password);

  const existingUser = await prisma.userProfile.findUnique({
    where: {
      email,
    },
  });

  if (existingUser) {
    const updatedUser = await prisma.userProfile.update({
      where: {
        id: existingUser.id,
      },
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
        status: "ACTIVE",
      },
    });

    console.log(
      `Password updated for ${updatedUser.email} (${updatedUser.role}).`,
    );
    return;
  }

  const userCount = await prisma.userProfile.count();
  const role = userCount === 0 ? "OWNER" : "VIEWER";

  const createdUser = await prisma.userProfile.create({
    data: {
      authUserId: `internal:${email}`,
      email,
      fullName: email.split("@")[0] ?? "",
      role,
      status: "ACTIVE",
      passwordHash,
      passwordChangedAt: new Date(),
      notes:
        role === "OWNER"
          ? "Created as first internal OWNER user."
          : "Created as internal user by password setup script.",
    },
  });

  console.log(
    `User created for ${createdUser.email} (${createdUser.role}).`,
  );
}

function normalizeEmail(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .toLowerCase();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });