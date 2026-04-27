import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();
const DEFAULT_ADMIN_EMAIL = "admin@opusx.pro";
const DEFAULT_ADMIN_PASSWORD = "changeme123";
const DEFAULT_ADMIN_KEY_LABEL = "Admin default key";

async function main() {
  const adminEmail = (process.env.ADMIN_EMAIL ?? DEFAULT_ADMIN_EMAIL).trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? DEFAULT_ADMIN_PASSWORD;
  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash,
      role: "ADMIN",
    },
    create: {
      email: adminEmail,
      name: "Admin",
      passwordHash,
      role: "ADMIN",
    },
  });

  const existingDefaultKeys = await prisma.apiKey.findMany({
    where: { userId: admin.id, label: DEFAULT_ADMIN_KEY_LABEL },
    orderBy: { createdAt: "asc" },
  });

  let adminKey = existingDefaultKeys[0];
  if (!adminKey) {
    const key = `sk-ant-ox-${randomBytes(16).toString("hex")}`;
    adminKey = await prisma.apiKey.create({
      data: { key, label: DEFAULT_ADMIN_KEY_LABEL, userId: admin.id, status: "ACTIVE" },
    });
  } else if (adminKey.status !== "ACTIVE") {
    adminKey = await prisma.apiKey.update({
      where: { id: adminKey.id },
      data: { status: "ACTIVE" },
    });
  }

  if (existingDefaultKeys.length > 1) {
    const duplicateIds = existingDefaultKeys.slice(1).map((item) => item.id);
    await prisma.apiKey.updateMany({
      where: { id: { in: duplicateIds } },
      data: { status: "REVOKED" },
    });
  }

  for (const service of ["proxy", "gateway", "keys"]) {
    await prisma.systemStatus.upsert({
      where: { service },
      update: {},
      create: {
        service,
        state: "operational",
        description:
          service === "proxy"
            ? "Request routing, streaming, model mapping."
            : service === "gateway"
              ? "Authentication, rate limits, usage."
              : "Validation and budget enforcement.",
      },
    });
  }

  console.log(`✓ Admin: ${adminEmail}`);
  console.log(`✓ Password set (from ADMIN_PASSWORD or default)`);
  console.log(`✓ API Key: ${adminKey.key}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
