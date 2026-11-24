import { getFallbackAnswer, SABI_SYSTEM_PROMPT, type ChatMessage } from "@/lib/sabi";

export const runtime = "nodejs";

const MAX_MESSAGES = 10;
const MAX_CHARS = 500;

function cleanMessages(input: unknown): ChatMessage[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter(
      (m): m is ChatMessage =>
        !!m &&
        typeof m === "object" &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string"
    )
    .slice(-MAX_MESSAGES)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));
}

async function askGemini(messages: ChatMessage[], apiKey: string): Promise<string | null> {
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  // Gemini exige que la conversación empiece con un turno del usuario
  const firstUser = messages.findIndex((m) => m.role === "user");
  const contents = messages.slice(Math.max(0, firstUser)).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SABI_SYSTEM_PROMPT }] },
        contents,
        generationConfig: { temperature: 0.7, maxOutputTokens: 400 },
      }),
      signal: AbortSignal.timeout(12000),
    }
  );
  if (!res.ok) return null;
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim();
  return text || null;
}

export async function POST(req: Request) {
  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    /* cuerpo inválido */
  }
  const messages = cleanMessages((body as { messages?: unknown } | null)?.messages);
  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && lastUser) {
    try {
      const reply = await askGemini(messages, apiKey);
      if (reply) return Response.json({ reply, source: "gemini" });
    } catch {
      /* usamos respaldo local */
    }
  }

  return Response.json({ reply: getFallbackAnswer(lastUser), source: "local" });
}
