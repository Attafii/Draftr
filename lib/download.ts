"use client";

import { PDFDocument, StandardFonts, type PDFFont } from "pdf-lib";

import { buildExportFileName, normalizeMarkdownExport, stripFileExtension } from "@/lib/document";

export interface PdfExportOptions {
  preset?: "clean" | "print";
}

export interface MarkdownExportOptions {
  preset?: "normalized" | "raw";
}

function triggerBrowserDownload(blob: Blob, fileName: string) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.rel = "noreferrer";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

function wrapTextLine(line: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const trimmedLine = line.trimEnd();

  if (trimmedLine.length === 0) {
    return [];
  }

  const words = trimmedLine.split(/\s+/);
  const wrappedLines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const nextLine = currentLine.length > 0 ? `${currentLine} ${word}` : word;

    if (currentLine.length === 0 || font.widthOfTextAtSize(nextLine, fontSize) <= maxWidth) {
      currentLine = nextLine;
      continue;
    }

    wrappedLines.push(currentLine);
    currentLine = word;
  }

  if (currentLine.length > 0) {
    wrappedLines.push(currentLine);
  }

  return wrappedLines;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

export function downloadBlobFile(fileName: string, blob: Blob): void {
  triggerBrowserDownload(blob, fileName);
}

export function downloadMarkdownFile(fileName: string, text: string, options: MarkdownExportOptions = {}): void {
  const exportText = options.preset === "raw" ? text : normalizeMarkdownExport(text);
  const normalizedText = exportText.endsWith("\n") ? exportText : `${exportText}\n`;

  triggerBrowserDownload(
    new Blob([normalizedText], { type: "text/markdown;charset=utf-8" }),
    buildExportFileName(fileName, "md"),
  );
}

export async function downloadPdfFile(fileName: string, text: string, options: PdfExportOptions = {}): Promise<void> {
  const preset = options.preset ?? "clean";
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const pageSize: [number, number] = [595.28, 841.89];
  const pageWidth = pageSize[0];
  const pageHeight = pageSize[1];
  const margin = preset === "print" ? 56 : 48;
  const maxWidth = pageWidth - margin * 2;
  const fontSize = preset === "print" ? 12 : 11;
  const lineHeight = preset === "print" ? 18 : 16;
  const title = stripFileExtension(fileName);
  const sourceLines = (text.trim().length > 0 ? text : " ").replace(/\r\n/g, "\n").split("\n");

  let page = pdf.addPage(pageSize);
  let cursorY = pageHeight - margin;

  const startNewPage = () => {
    page = pdf.addPage(pageSize);
    cursorY = pageHeight - margin;

    if (preset === "print") {
      page.drawText(title, {
        x: margin,
        y: cursorY - 16,
        size: 16,
        font,
      });
      cursorY -= 28;
    }
  };

  if (preset === "print") {
    page.drawText(title, {
      x: margin,
      y: cursorY - 16,
      size: 16,
      font,
    });
    cursorY -= 28;
  }

  for (const sourceLine of sourceLines) {
    if (sourceLine.trim().length === 0) {
      cursorY -= lineHeight * 0.55;
      continue;
    }

    const wrappedLines = wrapTextLine(sourceLine, font, fontSize, maxWidth);

    for (const line of wrappedLines) {
      if (cursorY - lineHeight < margin) {
        startNewPage();
      }

      page.drawText(line, {
        x: margin,
        y: cursorY - fontSize,
        size: fontSize,
        font,
      });
      cursorY -= lineHeight;
    }
  }

  if (preset === "print") {
    const pageCount = pdf.getPageCount();

    for (let pageIndex = 1; pageIndex <= pageCount; pageIndex += 1) {
      const currentPage = pdf.getPage(pageIndex - 1);

      currentPage.drawText(`Page ${pageIndex} of ${pageCount}`, {
        x: currentPage.getWidth() - margin,
        y: 24,
        size: 9,
        font,
      });
    }
  }

  const pdfBytes = await pdf.save();
  const pdfBlob = new Blob([toArrayBuffer(pdfBytes)], { type: "application/pdf" });
  triggerBrowserDownload(pdfBlob, buildExportFileName(fileName, "pdf"));
}