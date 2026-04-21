import { NextResponse } from "next/server";

import { detectDocumentKind, normalizeDocumentText, type ConvertedDocument } from "@/lib/document";

export const runtime = "nodejs";

async function extractPdfText(fileBuffer: ArrayBuffer): Promise<{ text: string; pageCount: number }> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: Buffer.from(fileBuffer) });

  try {
    const result = await parser.getText();

    return {
      text: normalizeDocumentText(result.text),
      pageCount: result.total,
    };
  } finally {
    await parser.destroy();
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file was provided." }, { status: 400 });
    }

    const kind = detectDocumentKind(file.name, file.type);
    const buffer = await file.arrayBuffer();

    let sourceText: string;
    let pageCount: number | null = null;

    if (kind === "pdf") {
      const extracted = await extractPdfText(buffer);
      sourceText = extracted.text;
      pageCount = extracted.pageCount;
    } else {
      sourceText = normalizeDocumentText(await file.text());
    }

    const document: ConvertedDocument = {
      fileName: file.name,
      kind,
      mimeType: file.type || (kind === "pdf" ? "application/pdf" : "text/markdown"),
      byteSize: file.size,
      pageCount,
      sourceText,
      convertedText: sourceText,
    };

    return NextResponse.json(document);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown conversion error.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}