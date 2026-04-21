import type { ConvertedDocument } from "@/lib/document";

async function readResponsePayload(response: Response): Promise<ConvertedDocument & { error?: string }> {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return (await response.json()) as ConvertedDocument & { error?: string };
  }

  const responseText = await response.text();
  return {
    error: responseText.trim().length > 0 ? responseText : `HTTP ${response.status}`,
    fileName: "",
    kind: "markdown",
    mimeType: "text/markdown",
    byteSize: 0,
    pageCount: null,
    sourceText: "",
    convertedText: "",
  };
}

export async function convertDocument(file: File): Promise<ConvertedDocument> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/convert", {
    method: "POST",
    body: formData,
  });

  const payload = await readResponsePayload(response);

  if (!response.ok) {
    throw new Error(payload.error ?? "Conversion failed.");
  }

  return payload;
}