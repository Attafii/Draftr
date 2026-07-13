"use client";

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import { buildExportFileName, normalizeMarkdownExport, stripFileExtension, type ExportStyleOptions } from "@/lib/document";

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

export function sanitizeTextForPdf(text: string): string {
  return text
    .replace(/\u0000/g, " ")
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F]/g, " ")
    .replace(/[\u0080-\u009F]/g, (character) => {
      if (character === "\u0083") {
        return " ";
      }

      return "";
    })
    // keep color tags like <color=#FFAABB>text</color> so inline color runs can be parsed
    // strip emoji / pictographic characters which the embedded PDF fonts cannot render
    .replace(/\p{Extended_Pictographic}/gu, "")
    // remove variation selectors commonly used with emoji
    .replace(/\uFE0F/g, "")
    .replace(/[\t\f\v]+/g, " ")
    .replace(/ {2,}/g, " ")
    .trim();
}

function wrapTextLine(line: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const trimmedLine = sanitizeTextForPdf(line).trimEnd();

  if (trimmedLine.length === 0) {
    return [];
  }

  const words = trimmedLine.split(/\s+/);
  const wrappedLines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const nextLine = currentLine.length > 0 ? `${currentLine} ${word}` : word;

    const encodableNext = filterEncodable(font, nextLine, fontSize);

    if (currentLine.length === 0 || font.widthOfTextAtSize(encodableNext, fontSize) <= maxWidth) {
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

export function buildStyledExportText(text: string, style: ExportStyleOptions): string {
  const title = style.title.trim() || "Untitled";
  const normalizedText = normalizeMarkdownExport(text);

  if (style.preset === "minimal") {
    return [`# ${title}`, "", normalizedText].join("\n");
  }

  if (style.preset === "studio") {
    return [`# ${title}`, "", "## Executive summary", "", normalizedText].join("\n");
  }

  return [`# ${title}`, "", normalizedText].join("\n");
}

export function downloadBlobFile(fileName: string, blob: Blob): void {
  triggerBrowserDownload(blob, fileName);
}

export function downloadMarkdownFile(fileName: string, text: string, options: MarkdownExportOptions = {}, style?: ExportStyleOptions): void {
  const exportText = options.preset === "raw" ? text : normalizeMarkdownExport(text);
  const styledText = style ? buildStyledExportText(exportText, style) : exportText;
  const htmlified = convertColorTagsToHtml(styledText);
  const normalizedText = htmlified.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trimEnd();
  const finalText = normalizedText.length > 0 ? `${normalizedText}\n` : "";

  triggerBrowserDownload(
    new Blob([finalText], { type: "text/markdown;charset=utf-8" }),
    buildExportFileName(fileName, "md"),
  );
}

export async function downloadPdfFile(fileName: string, text: string, options: PdfExportOptions = {}, style?: ExportStyleOptions): Promise<void> {
  const preset = options.preset ?? "clean";
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italicFont = await pdf.embedFont(StandardFonts.HelveticaOblique);
  const boldItalicFont = await pdf.embedFont(StandardFonts.HelveticaBoldOblique);
  const fonts = { normal: font, bold: boldFont, italic: italicFont, boldItalic: boldItalicFont };
  const pageSize: [number, number] = [595.28, 841.89];
  const pageWidth = pageSize[0];
  const pageHeight = pageSize[1];
  const margin = preset === "print" ? 56 : 48;
  const maxWidth = pageWidth - margin * 2;
  const fontSize = preset === "print" ? 12 : 11;
  const lineHeight = preset === "print" ? 18 : 16;
  const title = stripFileExtension(fileName);
  const styledText = style ? buildStyledExportText(text, style) : text;
  const sanitizedText = sanitizeTextForPdf(styledText);
  const sourceLines = (sanitizedText.length > 0 ? sanitizedText : " ").replace(/\r\n/g, "\n").split("\n");

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
    const trimmed = sourceLine.trim();

    if (trimmed.length === 0) {
      cursorY -= lineHeight * 0.55;
      continue;
    }

    // Heading detection: support H1 (# ) and H2 (## ) from the styled markdown
    let headingLevel = 0;
    let headingText = trimmed;

    if (trimmed.startsWith("# ")) {
      headingLevel = 1;
      headingText = trimmed.slice(2).trim();
    } else if (trimmed.startsWith("## ")) {
      headingLevel = 2;
      headingText = trimmed.slice(3).trim();
    }

    if (headingLevel > 0) {
      const hFontSize = headingLevel === 1 ? (preset === "print" ? 16 : 22) : (preset === "print" ? 13 : 16);
      const hLineHeight = Math.round(hFontSize * 1.25);
      const wrappedLines = wrapTextLine(headingText, boldFont, hFontSize, maxWidth);

      for (const line of wrappedLines) {
        if (cursorY - hLineHeight < margin) {
          startNewPage();
        }

        drawStyledLine(page, margin, cursorY - hFontSize, line, fonts, hFontSize);
        cursorY -= hLineHeight;
      }

      continue;
    }

    const wrappedLines = wrapTextLine(sourceLine, font, fontSize, maxWidth);

    for (const line of wrappedLines) {
      if (cursorY - lineHeight < margin) {
        startNewPage();
      }

      drawStyledLine(page, margin, cursorY - fontSize, line, fonts, fontSize);
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

function parseInlineRuns(text: string, fonts: { normal: PDFFont; bold: PDFFont; italic: PDFFont; boldItalic: PDFFont }, defaultSize: number) {
  // Supports **bold**, *italic*, and <color=#RRGGBB>...</color>
  const runs: Array<{ text: string; font: PDFFont; size: number; color?: string }> = [];

  let remaining = text;

  while (remaining.length > 0) {
    // Bold
    const boldMatch = remaining.match(/^\*\*(.+?)\*\*/s);
    if (boldMatch) {
      runs.push({ text: boldMatch[1], font: fonts.bold, size: defaultSize });
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // Italic
    const italicMatch = remaining.match(/^\*(.+?)\*/s);
    if (italicMatch) {
      runs.push({ text: italicMatch[1], font: fonts.italic, size: defaultSize });
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // Color
    const colorMatch = remaining.match(/^<color=#[0-9a-fA-F]{6}>([\s\S]*?)<\/color>/);
    if (colorMatch) {
      const colorTag = remaining.match(/^<color=#[0-9a-fA-F]{6}>/)?.[0] ?? "";
      const m = colorTag.match(/^<color=#([0-9a-fA-F]{6})>/);
      const colorHex = m ? m[1] : "000000";
      runs.push({ text: colorMatch[1], font: fonts.normal, size: defaultSize, color: `#${colorHex}` });
      remaining = remaining.slice(colorMatch[0].length);
      continue;
    }

    // Plain text up to next special token
    const nextToken = remaining.search(/\*\*|\*|<color=#[0-9a-fA-F]{6}>/);
    if (nextToken === -1) {
      runs.push({ text: remaining, font: fonts.normal, size: defaultSize });
      break;
    }

    if (nextToken > 0) {
      runs.push({ text: remaining.slice(0, nextToken), font: fonts.normal, size: defaultSize });
      remaining = remaining.slice(nextToken);
      continue;
    }

    // Fallback safety
    runs.push({ text: remaining, font: fonts.normal, size: defaultSize });
    break;
  }

  return runs;
}

function drawStyledLine(page: PDFPage, x: number, y: number, lineText: string, fonts: { normal: PDFFont; bold: PDFFont; italic: PDFFont; boldItalic: PDFFont }, defaultSize: number, defaultColor = "#000000") {
  const runs = parseInlineRuns(lineText, fonts, defaultSize);
  let cursorX = x;

  for (const run of runs) {
    const color = run.color ?? defaultColor;
    const safeText = filterEncodable(run.font, run.text, run.size);
    if (safeText.trim().length > 0) {
      page.drawText(safeText, {
        x: cursorX,
        y,
        size: run.size,
        font: run.font,
        color: rgbFromHex(color),
      });

      cursorX += run.font.widthOfTextAtSize(safeText, run.size);
    } else {
      // If nothing encodable remains, advance by a small space to preserve some layout
      const spaceWidth = run.font.widthOfTextAtSize(" ", run.size);
      cursorX += spaceWidth * Math.max(1, Math.min(3, safeText.length));
    }
  }
}

function rgbFromHex(hex: string) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return rgb(r, g, b);
}

function filterEncodable(font: PDFFont, text: string, size: number) {
  // Replace any character that the font cannot encode with a space to avoid encoding errors
  let out = "";

  for (const ch of text) {
    try {
      // Try measuring the single character; if it throws the font can't encode it
      font.widthOfTextAtSize(ch, size);
      out += ch;
    } catch {
      out += " ";
    }
  }

  return out;
}

export function convertColorTagsToHtml(text: string) {
  return text.replace(/<color=(#[0-9a-fA-F]{6})>([\s\S]*?)<\/color>/g, (_match, hex, inner) => {
    return `<span style="color:${hex}">${inner}</span>`;
  });
}