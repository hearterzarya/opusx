import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { generateApiKey, maskApiKey } from "@/lib/keygen";
import {
  getDefaultRequestsPerMinute,
  getDefaultRollingWindowLimit,
  getDefaultTokenBudget,
} from "@/lib/system-config";

const createKeySchema = z.object({
  userId: z.string().cuid(),
  label: z.string().min(2),
  tokenBudget: z.number().int().positive().optional(),
  requestsPerMinute: z.number().int().positive().optional(),
  rollingWindowLimit: z.number().int().positive().optional(),
  expiresAt: z.string().datetime().optional(),
});

export async function GET() {
  const result = await requireAdmin();
  if ("error" in result) return result.error;

  const keys = await prisma.apiKey.findMany({
    include: { user: { select: { email: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    keys.map((key) => ({
      ...key,
      tokenBudget: Number(key.tokenBudget),
      tokensUsed: Number(key.tokensUsed),
      rollingWindowLimit: Number(key.rollingWindowLimit),
      key: maskApiKey(key.key),
      userEmail: key.user.email,
      userName: key.user.name,
    })),
  );
}

export async function POST(request: Request) {
  const result = await requireAdmin();
  if ("error" in result) return result.error;

  try {
    const body = createKeySchema.parse(await request.json());
    const [defaultTokenBudget, defaultRequestsPerMinute, defaultRollingWindowLimit] = await Promise.all([
      getDefaultTokenBudget(),
      getDefaultRequestsPerMinute(),
      getDefaultRollingWindowLimit(),
    ]);
    const key = generateApiKey();
    const created = await prisma.apiKey.create({
      data: {
        key,
        userId: body.userId,
        label: body.label,
        tokenBudget: BigInt(body.tokenBudget ?? defaultTokenBudget),
        requestsPerMinute: body.requestsPerMinute ?? defaultRequestsPerMinute,
        rollingWindowLimit: BigInt(body.rollingWindowLimit ?? defaultRollingWindowLimit),
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      },
    });
    return NextResponse.json(
      {
        ...created,
        tokenBudget: Number(created.tokenBudget),
        tokensUsed: Number(created.tokensUsed),
        rollingWindowLimit: Number(created.rollingWindowLimit),
        plainKey: key,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create key" }, { status: 500 });
  }
}
