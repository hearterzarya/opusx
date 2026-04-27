import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

const CONFIG_KEYS = {
  anthropicKeyEncrypted: "ANTHROPIC_API_KEY_ENC",
  anthropicKeyRotationPrefix: "ANTHROPIC_API_KEY_ROTATED_AT:",
  allowUserKeyCreation: "ALLOW_USER_KEY_CREATION",
  defaultTokenBudget: "DEFAULT_TOKEN_BUDGET",
  defaultRequestsPerMinute: "DEFAULT_REQUESTS_PER_MINUTE",
  defaultRollingWindowLimit: "DEFAULT_ROLLING_WINDOW_LIMIT",
  allowPublicRegistration: "ALLOW_PUBLIC_REGISTRATION",
} as const;

const DEFAULT_ANTHROPIC_BASE_URL = "https://api.anthropic.com";

function secretMaterial(): Buffer {
  const secret = process.env.NEXTAUTH_SECRET ?? "opusx-local-secret";
  return createHash("sha256").update(secret).digest();
}

function encrypt(value: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-cbc", secretMaterial(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

function decrypt(payload: string): string {
  const [ivHex, encryptedHex] = payload.split(":");
  if (!ivHex || !encryptedHex) return "";
  const iv = Buffer.from(ivHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const decipher = createDecipheriv("aes-256-cbc", secretMaterial(), iv);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

export async function getAnthropicApiKey(): Promise<string | null> {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  const row = await prisma.systemConfig.findUnique({
    where: { key: CONFIG_KEYS.anthropicKeyEncrypted },
  });
  if (!row?.value) return null;
  try {
    return decrypt(row.value);
  } catch {
    return null;
  }
}

export function getAnthropicBaseUrl(): string {
  const raw = process.env.ANTHROPIC_BASE_URL?.trim();
  if (!raw) return DEFAULT_ANTHROPIC_BASE_URL;
  return raw.replace(/\/+$/, "");
}

export async function setAnthropicApiKey(value: string): Promise<void> {
  const encrypted = encrypt(value);
  const rotationKey = `${CONFIG_KEYS.anthropicKeyRotationPrefix}${new Date().toISOString()}`;

  await prisma.$transaction([
    prisma.systemConfig.upsert({
      where: { key: CONFIG_KEYS.anthropicKeyEncrypted },
      create: {
        key: CONFIG_KEYS.anthropicKeyEncrypted,
        value: encrypted,
      },
      update: {
        value: encrypted,
      },
    }),
    prisma.systemConfig.create({
      data: {
        key: rotationKey,
        value: encrypted,
      },
    }),
  ]);
}

export async function getAnthropicKeyRotationEvents(limit = 5): Promise<string[]> {
  const rows = await prisma.systemConfig.findMany({
    where: {
      key: { startsWith: CONFIG_KEYS.anthropicKeyRotationPrefix },
    },
    select: { key: true },
    orderBy: { key: "desc" },
    take: limit,
  });
  return rows
    .map((row) => row.key.replace(CONFIG_KEYS.anthropicKeyRotationPrefix, ""))
    .filter(Boolean);
}

async function getConfigValue(key: string): Promise<string | null> {
  const row = await prisma.systemConfig.findUnique({ where: { key } });
  return row?.value ?? null;
}

export async function getAllowUserKeyCreation(): Promise<boolean> {
  const raw = await getConfigValue(CONFIG_KEYS.allowUserKeyCreation);
  if (raw === null) return true;
  return raw === "true";
}

export async function setAllowUserKeyCreation(value: boolean): Promise<void> {
  await prisma.systemConfig.upsert({
    where: { key: CONFIG_KEYS.allowUserKeyCreation },
    create: { key: CONFIG_KEYS.allowUserKeyCreation, value: String(value) },
    update: { value: String(value) },
  });
}

export async function getDefaultTokenBudget(): Promise<number> {
  const raw = await getConfigValue(CONFIG_KEYS.defaultTokenBudget);
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1000000;
}

export async function setDefaultTokenBudget(value: number): Promise<void> {
  await prisma.systemConfig.upsert({
    where: { key: CONFIG_KEYS.defaultTokenBudget },
    create: { key: CONFIG_KEYS.defaultTokenBudget, value: String(value) },
    update: { value: String(value) },
  });
}

export async function getDefaultRequestsPerMinute(): Promise<number> {
  const raw = await getConfigValue(CONFIG_KEYS.defaultRequestsPerMinute);
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 10;
}

export async function setDefaultRequestsPerMinute(value: number): Promise<void> {
  await prisma.systemConfig.upsert({
    where: { key: CONFIG_KEYS.defaultRequestsPerMinute },
    create: { key: CONFIG_KEYS.defaultRequestsPerMinute, value: String(value) },
    update: { value: String(value) },
  });
}

export async function getDefaultRollingWindowLimit(): Promise<number> {
  const raw = await getConfigValue(CONFIG_KEYS.defaultRollingWindowLimit);
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 500000;
}

export async function setDefaultRollingWindowLimit(value: number): Promise<void> {
  await prisma.systemConfig.upsert({
    where: { key: CONFIG_KEYS.defaultRollingWindowLimit },
    create: { key: CONFIG_KEYS.defaultRollingWindowLimit, value: String(value) },
    update: { value: String(value) },
  });
}

export async function getAllowPublicRegistration(): Promise<boolean> {
  const raw = await getConfigValue(CONFIG_KEYS.allowPublicRegistration);
  if (raw === null) return true;
  return raw === "true";
}

export async function setAllowPublicRegistration(value: boolean): Promise<void> {
  await prisma.systemConfig.upsert({
    where: { key: CONFIG_KEYS.allowPublicRegistration },
    create: { key: CONFIG_KEYS.allowPublicRegistration, value: String(value) },
    update: { value: String(value) },
  });
}

export async function setSystemStatus(service: "proxy" | "gateway" | "keys", state: string, description: string): Promise<void> {
  await prisma.systemStatus.upsert({
    where: { service },
    update: { state, description },
    create: { service, state, description },
  });
}

export async function getPlatformSettings() {
  const [allowUserKeyCreation, allowPublicRegistration, defaultTokenBudget, defaultRequestsPerMinute, defaultRollingWindowLimit, fallback, keyRotationEvents, statuses] = await Promise.all([
    getAllowUserKeyCreation(),
    getAllowPublicRegistration(),
    getDefaultTokenBudget(),
    getDefaultRequestsPerMinute(),
    getDefaultRollingWindowLimit(),
    getConfigValue(CONFIG_KEYS.anthropicKeyEncrypted),
    getAnthropicKeyRotationEvents(),
    prisma.systemStatus.findMany(),
  ]);

  return {
    allowUserKeyCreation,
    allowPublicRegistration,
    defaultTokenBudget,
    defaultRequestsPerMinute,
    defaultRollingWindowLimit,
    hasAnthropicApiKey: Boolean(process.env.ANTHROPIC_API_KEY || fallback),
    keyRotationEvents,
    statuses,
  };
}
