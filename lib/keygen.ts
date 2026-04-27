import { randomBytes } from "crypto";

export function generateKey(): string {
  return `sk-ant-ox-${randomBytes(16).toString("hex")}`;
}

export function maskKey(key: string): string {
  return `sk-ant-ox-****${key.slice(-8)}`;
}

export const generateApiKey = generateKey;
export const maskApiKey = maskKey;
