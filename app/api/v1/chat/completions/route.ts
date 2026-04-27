import { NextResponse } from "next/server";

type OpenAIMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type OpenAIBody = {
  model: string;
  messages: OpenAIMessage[];
  stream?: boolean;
  max_tokens?: number;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as OpenAIBody;
    const anthropicPayload = {
      model: body.model,
      max_tokens: body.max_tokens ?? 1024,
      stream: body.stream ?? false,
      messages: body.messages
        .filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role, content: m.content })),
      system: body.messages.filter((m) => m.role === "system").map((m) => m.content).join("\n"),
    };

    const proxyResponse = await fetch(new URL("/api/v1/messages", request.url), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: request.headers.get("authorization") ?? "",
        "x-api-key": request.headers.get("x-api-key") ?? "",
      },
      body: JSON.stringify(anthropicPayload),
    });

    const data = (await proxyResponse.json()) as Record<string, unknown>;
    const text = Array.isArray(data.content)
      ? (data.content as Array<{ type?: string; text?: string }>)
          .filter((part) => part.type === "text")
          .map((part) => part.text ?? "")
          .join("")
      : "";

    return NextResponse.json(
      {
        id: data.id ?? crypto.randomUUID(),
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: body.model,
        choices: [
          {
            index: 0,
            finish_reason: "stop",
            message: {
              role: "assistant",
              content: text,
            },
          },
        ],
      },
      { status: proxyResponse.status },
    );
  } catch {
    return NextResponse.json({ error: "OpenAI compatibility proxy failed" }, { status: 500 });
  }
}
