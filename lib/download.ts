"use client";

import { buildExportFileName } from "@/lib/document";

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

export function downloadMarkdownFile(fileName: string, text: string): void {
  const normalizedText = text.endsWith("\n") ? text : `${text}\n`;

  triggerBrowserDownload(
    new Blob([normalizedText], { type: "text/markdown;charset=utf-8" }),
    buildExportFileName(fileName, "md"),
  );
}

export async function downloadPdfFile(fileName: string, text: string): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 48;
  const maxWidth = pageWidth - margin * 2;
  const lineHeight = 16;
  const lines = pdf.splitTextToSize(text.trim() || " ", maxWidth) as string[];

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);

  let cursorY = margin;

  for (const line of lines) {
    if (cursorY > pageHeight - margin) {
      pdf.addPage();
      cursorY = margin;
    }

    pdf.text(line, margin, cursorY);
    cursorY += lineHeight;
  }

  const pdfBlob = pdf.output("blob");
  triggerBrowserDownload(pdfBlob, buildExportFileName(fileName, "pdf"));
}