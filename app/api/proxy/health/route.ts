import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const start = Date.now();
  await prisma.$queryRaw`SELECT 1`;
  const statuses = await prisma.systemStatus.findMany();
  const stateMap = {
    proxy: "operational",
    gateway: "operational",
    keys: "operational",
  };

  for (const status of statuses) {
    if (status.service === "proxy" || status.service === "gateway" || status.service === "keys") {
      stateMap[status.service] = status.state;
    }
  }

  return NextResponse.json({
    latencyMs: Date.now() - start,
    services: stateMap,
  });
}
