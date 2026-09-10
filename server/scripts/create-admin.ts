import bcrypt from "bcryptjs";
import { prisma } from "../src/db.js";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const rl = createInterface({ input, output });

async function main() {
  console.log("");
  console.log("=================================");
  console.log(" Farm2Fork Admin Account Setup");
  console.log("=================================");
  console.log("");

  const name = (await rl.question("Admin name: ")).trim();
  const email = (await rl.question("Admin email: ")).trim().toLowerCase();
  const password = await rl.question("Admin password: ");

  if (!name || name.length < 2) {
    throw new Error("Admin name must contain at least 2 characters.");
  }

  if (!email || !email.includes("@")) {
    throw new Error("Enter a valid admin email.");
  }

  if (password.length < 8) {
    throw new Error("Admin password must contain at least 8 characters.");
  }

  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    if (existing.role !== "ADMIN") {
      throw new Error(
        "This email already belongs to a non-admin account. Choose another email."
      );
    }

    throw new Error(
      "An ADMIN account already exists with this email."
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: "ADMIN",
    },
  });

  console.log("");
  console.log("Admin account created successfully.");
  console.log(`Name: ${admin.name}`);
  console.log(`Email: ${admin.email}`);
  console.log(`Role: ${admin.role}`);
  console.log("");
  console.log("Use the Admin Portal to sign in.");
}

main()
  .catch((error) => {
    console.error("");
    console.error("Admin setup failed:");
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await rl.close();
    await prisma.$disconnect();
  });
