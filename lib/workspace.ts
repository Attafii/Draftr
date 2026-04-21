import { type AiMode, type AiRequestPayload, type ConvertedDocument } from "@/lib/document";

export function resolveWorkingText(document: ConvertedDocument | null, editorText: string): string {
  if (editorText.trim().length > 0) {
    return editorText;
  }

  return document?.convertedText ?? "";
}

export function buildAiRequestPayload(
  document: ConvertedDocument,
  editorText: string,
  mode: AiMode,
  instruction?: string,
): AiRequestPayload {
  return {
    fileName: document.fileName,
    kind: document.kind,
    text: resolveWorkingText(document, editorText),
    mode,
    instruction,
  };
}
