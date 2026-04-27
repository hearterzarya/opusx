import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const result = await requireSession();
  if ("error" in result) return result.error;

  const { id } = await context.params;
  try {
    const updated = await prisma.apiKey.updateMany({
      where: { id, userId: result.session.user.id },
      data: { status: "REVOKED" },
    });
    if (!updated.count) {
      return NextResponse.json({ error: "Key not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to revoke key" }, { status: 500 });
  }
}
