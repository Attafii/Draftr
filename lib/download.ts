"use client";

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
  const { jsPDF } = await import("jspdf");
  const preset = options.preset ?? "clean";
  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = preset === "print" ? 56 : 48;
  const maxWidth = pageWidth - margin * 2;
  const lineHeight = preset === "print" ? 18 : 16;
  const lines = pdf.splitTextToSize(text.trim() || " ", maxWidth) as string[];

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(preset === "print" ? 12 : 11);
  pdf.setProperties({ title: stripFileExtension(fileName) });

  let cursorY = margin;

  if (preset === "print") {
    pdf.setFontSize(16);
    pdf.text(stripFileExtension(fileName), margin, cursorY);
    cursorY += 28;
    pdf.setFontSize(12);
  }

  for (const line of lines) {
    if (cursorY > pageHeight - margin) {
      pdf.addPage();
      cursorY = margin;

      if (preset === "print") {
        pdf.setFontSize(12);
        pdf.text(stripFileExtension(fileName), margin, cursorY);
        cursorY += 24;
      }
    }

    pdf.text(line, margin, cursorY);
    cursorY += lineHeight;
  }

  if (preset === "print") {
    const pageCount = pdf.getNumberOfPages();

    for (let pageIndex = 1; pageIndex <= pageCount; pageIndex += 1) {
      pdf.setPage(pageIndex);
      pdf.setFontSize(9);
      pdf.text(`Page ${pageIndex} of ${pageCount}`, pageWidth - margin, pageHeight - 24, { align: "right" });
    }
  }

  const pdfBlob = pdf.output("blob");
  triggerBrowserDownload(pdfBlob, buildExportFileName(fileName, "pdf"));
}