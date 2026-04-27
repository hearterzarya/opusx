import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { generateApiKey, maskApiKey } from "@/lib/keygen";
import {
  getAllowUserKeyCreation,
  getDefaultRequestsPerMinute,
  getDefaultRollingWindowLimit,
  getDefaultTokenBudget,
} from "@/lib/system-config";

const createKeySchema = z.object({
  label: z.string().min(2),
});

export async function GET() {
  const result = await requireSession();
  if ("error" in result) return result.error;

  const keys = await prisma.apiKey.findMany({
    where: { userId: result.session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    keys.map((key) => ({
      ...key,
      tokenBudget: Number(key.tokenBudget),
      tokensUsed: Number(key.tokensUsed),
      rollingWindowLimit: Number(key.rollingWindowLimit),
      key: maskApiKey(key.key),
    })),
  );
}

export async function POST(request: Request) {
  const result = await requireSession();
  if ("error" in result) return result.error;

  try {
    const body = createKeySchema.parse(await request.json());
    const [allowUserKeyCreation, defaultTokenBudget, defaultRequestsPerMinute, defaultRollingWindowLimit] = await Promise.all([
      getAllowUserKeyCreation(),
      getDefaultTokenBudget(),
      getDefaultRequestsPerMinute(),
      getDefaultRollingWindowLimit(),
    ]);

    if (!allowUserKeyCreation) {
      return NextResponse.json({ error: "Self-service key creation is disabled" }, { status: 403 });
    }

    const key = generateApiKey();
    const created = await prisma.apiKey.create({
      data: {
        key,
        label: body.label,
        userId: result.session.user.id,
        tokenBudget: BigInt(defaultTokenBudget),
        requestsPerMinute: defaultRequestsPerMinute,
        rollingWindowLimit: BigInt(defaultRollingWindowLimit),
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
