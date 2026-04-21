import { NextResponse } from "next/server";

import {
  createFallbackInsight,
  normalizeDocumentText,
  type AiInsight,
  type AiMode,
  type AiRequestPayload,
} from "@/lib/document";

export const runtime = "nodejs";

const DEFAULT_MODEL = process.env.NVIDIA_MODEL ?? "meta/llama-3.1-405b-instruct";
const NVIDIA_ENDPOINT = "https://integrate.api.nvidia.com/v1/chat/completions";

function cleanList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0)
    .slice(0, 6);
}

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseInsight(content: string, model: string, mode: AiMode): Omit<AiInsight, "usedFallback"> {
  const trimmed = content.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    throw new Error("AI response did not contain JSON.");
  }

  const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;

  return {
    model: cleanString(parsed.model) || model,
    mode,
    summary: cleanString(parsed.summary) || "The model returned an empty summary.",
    keyTakeaways: cleanList(parsed.keyTakeaways),
    structuralFixes: cleanList(parsed.structuralFixes),
    toneNotes: cleanList(parsed.toneNotes),
    nextSteps: cleanList(parsed.nextSteps),
    revisedText: cleanString(parsed.revisedText),
  };
}

function buildPrompt(payload: AiRequestPayload): string {
  const trimmedText = normalizeDocumentText(payload.text).slice(0, 16000);
  const trimmedInstruction = normalizeDocumentText(payload.instruction ?? "");
  const isRewrite = payload.mode === "rewrite" || trimmedInstruction.length > 0;

  return [
    `You are Draftr's elite document editor for a ${payload.kind} file named "${payload.fileName}".`,
    isRewrite
      ? `Rewrite and enhance the document using this user request: ${trimmedInstruction || "Fix the structure, improve clarity, and polish the file."}`
      : "Analyze the document and provide concise structural guidance.",
    "Return strict JSON only with these keys: summary, keyTakeaways, structuralFixes, toneNotes, nextSteps, revisedText.",
    "If mode is rewrite, revisedText must contain the full revised document content and preserve the document type.",
    "If mode is analyze, revisedText must be an empty string.",
    payload.kind === "markdown"
      ? "Preserve valid markdown syntax and improve hierarchy, readability, and flow."
      : "Improve plain-text structure so the result exports cleanly to PDF.",
    "Keep each list concise and specific. Avoid markdown fences. Avoid commentary outside the JSON object.",
    "Document text:",
    trimmedText,
  ].join("\n\n");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<AiRequestPayload>;

    if (!body.fileName || !body.kind || !body.text) {
      return NextResponse.json({ error: "Missing document context." }, { status: 400 });
    }

    const mode: AiMode = body.mode ?? (normalizeDocumentText(body.instruction ?? "").length > 0 ? "rewrite" : "analyze");
    const apiKey = process.env.NVIDIA_API_KEY;
    const fallbackInsight = createFallbackInsight(body.text, body.fileName, DEFAULT_MODEL, mode, body.instruction);

    if (!apiKey) {
      return NextResponse.json(fallbackInsight);
    }

    const response = await fetch(NVIDIA_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        temperature: mode === "rewrite" ? 0.25 : 0.2,
        max_tokens: mode === "rewrite" ? 1200 : 800,
        messages: [
          {
            role: "system",
            content: [
              "You are Draftr's document intelligence engine.",
              "Return strict JSON only and never wrap the response in markdown.",
              "If the user requests a rewrite, improve structure and clarity while preserving meaning.",
            ].join(" "),
          },
          {
            role: "user",
            content: buildPrompt({
              fileName: body.fileName,
              kind: body.kind,
              text: body.text,
              mode,
              instruction: body.instruction,
            }),
          },
        ],
      }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { ...fallbackInsight, usedFallback: true },
        { status: 200 },
      );
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json({ ...fallbackInsight, usedFallback: true });
    }

    const insight = parseInsight(content, DEFAULT_MODEL, mode);

    return NextResponse.json({
      ...insight,
      usedFallback: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown AI error.";
    return NextResponse.json(
      {
        ...createFallbackInsight("", "Document", DEFAULT_MODEL, "analyze"),
        usedFallback: true,
        error: message,
      },
      { status: 200 },
    );
  }
}