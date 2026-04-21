export type DocumentKind = "pdf" | "markdown";
export type AiMode = "analyze" | "rewrite";

export interface ConvertedDocument {
  fileName: string;
  kind: DocumentKind;
  mimeType: string;
  byteSize: number;
  pageCount: number | null;
  sourceText: string;
  convertedText: string;
}

export interface AiInsight {
  model: string;
  mode: AiMode;
  summary: string;
  keyTakeaways: string[];
  structuralFixes: string[];
  toneNotes: string[];
  nextSteps: string[];
  revisedText: string;
  usedFallback: boolean;
}

export interface AiRequestPayload {
  fileName: string;
  kind: DocumentKind;
  text: string;
  mode: AiMode;
  instruction?: string;
}

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "that",
  "with",
  "from",
  "this",
  "your",
  "are",
  "was",
  "were",
  "will",
  "have",
  "has",
  "had",
  "about",
  "into",
  "onto",
  "than",
  "then",
  "them",
  "their",
  "there",
  "what",
  "when",
  "where",
  "which",
  "these",
  "those",
  "also",
  "because",
  "while",
  "into",
  "through",
  "using",
  "use",
  "can",
  "could",
  "should",
  "would",
]);

export function detectDocumentKind(fileName: string, mimeType: string): DocumentKind {
  const normalizedName = fileName.toLowerCase();
  const normalizedMime = mimeType.toLowerCase();

  if (normalizedMime.includes("pdf") || normalizedName.endsWith(".pdf")) {
    return "pdf";
  }

  return "markdown";
}

export function normalizeDocumentText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function limitText(text: string, limit = 2200): string {
  if (text.length <= limit) {
    return text;
  }

  return `${text.slice(0, limit).trim()}\n\n[Preview truncated]`;
}

export function formatFileSize(bytes: number): string {
  if (bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** unitIndex;

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export function stripFileExtension(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "");
}

export function buildExportFileName(fileName: string, extension: "md" | "pdf"): string {
  return `${stripFileExtension(fileName)}-converted.${extension}`;
}

export function extractTopKeywords(text: string, count = 4): string[] {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 3 && !STOP_WORDS.has(token));

  const frequencies = new Map<string, number>();

  for (const token of tokens) {
    frequencies.set(token, (frequencies.get(token) ?? 0) + 1);
  }

  return Array.from(frequencies.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, count)
    .map(([token]) => token);
}

export function createFallbackInsight(
  text: string,
  fileName: string,
  model: string,
  mode: AiMode = "analyze",
  instruction = "",
): AiInsight {
  const normalizedText = normalizeDocumentText(text);
  const summarySource = normalizedText
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .join(" ");
  const keywords = extractTopKeywords(normalizedText, 4);

  return {
    model,
    mode,
    summary:
      summarySource ||
      (mode === "rewrite"
        ? `The model could not rewrite ${fileName}; the current text remains available for manual editing.`
        : `No readable text was extracted from ${fileName}, so the document needs a manual pass.`),
    keyTakeaways:
      keywords.length > 0
        ? keywords.map((keyword) => `Potential focus: ${keyword}`)
        : ["Document structure looks sparse or heavily formatted."],
    structuralFixes: [
      "Verify the heading hierarchy after conversion.",
      "Break dense paragraphs into smaller semantic blocks.",
      "Check that lists, callouts, and table-like text survived extraction.",
    ],
    toneNotes: [
      "Preserve the original tone while tightening phrasing.",
      "Keep document terms consistent across sections.",
    ],
    nextSteps: [
      mode === "rewrite"
        ? "Review the rewritten draft in the editor and export a fresh file."
        : "Review the extracted text on the left panel.",
      instruction.trim().length > 0
        ? `Requested edit: ${instruction.trim()}`
        : "Regenerate AI insight after making structural edits.",
    ],
    revisedText: mode === "rewrite" ? normalizedText : "",
    usedFallback: true,
  };
}