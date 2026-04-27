import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/session";
import {
  getPlatformSettings,
  setAllowUserKeyCreation,
  setAllowPublicRegistration,
  setAnthropicApiKey,
  setDefaultRollingWindowLimit,
  setDefaultRequestsPerMinute,
  setDefaultTokenBudget,
  setSystemStatus,
} from "@/lib/system-config";

const updateSchema = z.object({
  anthropicApiKey: z.string().min(1).optional(),
  allowUserKeyCreation: z.boolean().optional(),
  allowPublicRegistration: z.boolean().optional(),
  defaultTokenBudget: z.number().int().positive().optional(),
  defaultRequestsPerMinute: z.number().int().positive().optional(),
  defaultRollingWindowLimit: z.number().int().positive().optional(),
  statuses: z
    .array(
      z.object({
        service: z.enum(["proxy", "gateway", "keys"]),
        state: z.enum(["operational", "degraded", "down"]),
        description: z.string().min(3),
      }),
    )
    .optional(),
});

export async function GET() {
  const result = await requireAdmin();
  if ("error" in result) return result.error;

  const settings = await getPlatformSettings();
  return NextResponse.json(settings);
}

export async function PATCH(request: Request) {
  const result = await requireAdmin();
  if ("error" in result) return result.error;

  try {
    const body = updateSchema.parse(await request.json());

    const tasks: Array<Promise<void>> = [];
    if (body.anthropicApiKey) tasks.push(setAnthropicApiKey(body.anthropicApiKey));
    if (body.allowUserKeyCreation !== undefined) tasks.push(setAllowUserKeyCreation(body.allowUserKeyCreation));
    if (body.allowPublicRegistration !== undefined) tasks.push(setAllowPublicRegistration(body.allowPublicRegistration));
    if (body.defaultTokenBudget !== undefined) tasks.push(setDefaultTokenBudget(body.defaultTokenBudget));
    if (body.defaultRequestsPerMinute !== undefined) tasks.push(setDefaultRequestsPerMinute(body.defaultRequestsPerMinute));
    if (body.defaultRollingWindowLimit !== undefined) tasks.push(setDefaultRollingWindowLimit(body.defaultRollingWindowLimit));
    if (body.statuses?.length) {
      for (const status of body.statuses) {
        tasks.push(setSystemStatus(status.service, status.state, status.description));
      }
    }
    await Promise.all(tasks);

    const settings = await getPlatformSettings();
    return NextResponse.json(settings);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
