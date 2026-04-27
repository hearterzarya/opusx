import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    data: [
      { id: "claude-opus-4-6", object: "model", owned_by: "anthropic" },
      { id: "claude-sonnet-4-5", object: "model", owned_by: "anthropic" },
      { id: "claude-haiku-3-5", object: "model", owned_by: "anthropic" },
    ],
  });
}
