import JSZip from "jszip";
import { PDFDocument, StandardFonts } from "pdf-lib";

import { stripFileExtension } from "@/lib/document";

export interface PdfFillBlock {
  pageNumber: number;
  text: string;
  x: number;
  y: number;
  size?: number;
}

export interface SplitPdfPage {
  fileName: string;
  bytes: Uint8Array;
}

function toUint8Array(buffer: ArrayBuffer | Uint8Array): Uint8Array {
  return buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
}

function normalizePageNumber(pageNumber: number, pageCount: number): number {
  return Math.min(Math.max(Math.trunc(pageNumber), 1), pageCount);
}

function buildPageFileName(fileName: string, pageNumber: number): string {
  return `${stripFileExtension(fileName)}-page-${String(pageNumber).padStart(2, "0")}.pdf`;
}

export async function compressPdfFile(buffer: ArrayBuffer | Uint8Array): Promise<Uint8Array> {
  const sourceDocument = await PDFDocument.load(toUint8Array(buffer));
  const compactDocument = await PDFDocument.create();
  const copiedPages = await compactDocument.copyPages(sourceDocument, sourceDocument.getPageIndices());

  copiedPages.forEach((page) => {
    compactDocument.addPage(page);
  });

  return compactDocument.save({
    useObjectStreams: true,
    addDefaultPage: false,
  });
}

export async function mergePdfFiles(buffers: ArrayBuffer[] | Uint8Array[]): Promise<Uint8Array> {
  const mergedDocument = await PDFDocument.create();

  for (const buffer of buffers) {
    const sourceDocument = await PDFDocument.load(toUint8Array(buffer));
    const pageIndices = sourceDocument.getPageIndices();
    const copiedPages = await mergedDocument.copyPages(sourceDocument, pageIndices);

    copiedPages.forEach((page) => {
      mergedDocument.addPage(page);
    });
  }

  return mergedDocument.save({
    useObjectStreams: true,
    addDefaultPage: false,
  });
}

export async function splitPdfFile(buffer: ArrayBuffer | Uint8Array, fileName: string): Promise<SplitPdfPage[]> {
  const sourceDocument = await PDFDocument.load(toUint8Array(buffer));
  const totalPages = sourceDocument.getPageCount();
  const outputs: SplitPdfPage[] = [];

  for (let pageIndex = 0; pageIndex < totalPages; pageIndex += 1) {
    const nextDocument = await PDFDocument.create();
    const [copiedPage] = await nextDocument.copyPages(sourceDocument, [pageIndex]);
    nextDocument.addPage(copiedPage);

    outputs.push({
      fileName: buildPageFileName(fileName, pageIndex + 1),
      bytes: await nextDocument.save({
        useObjectStreams: true,
        addDefaultPage: false,
      }),
    });
  }

  return outputs;
}

export async function fillPdfFile(buffer: ArrayBuffer | Uint8Array, fills: PdfFillBlock[]): Promise<Uint8Array> {
  const pdfDocument = await PDFDocument.load(toUint8Array(buffer));
  const font = await pdfDocument.embedFont(StandardFonts.Helvetica);
  const pageCount = pdfDocument.getPageCount();

  fills.forEach((fill) => {
    if (fill.text.trim().length === 0 || pageCount === 0) {
      return;
    }

    const pageNumber = normalizePageNumber(fill.pageNumber, pageCount);
    const page = pdfDocument.getPage(pageNumber - 1);

    page.drawText(fill.text, {
      x: Math.max(fill.x, 0),
      y: Math.max(fill.y, 0),
      size: fill.size ?? 12,
      font,
    });
  });

  return pdfDocument.save({
    useObjectStreams: true,
    addDefaultPage: false,
  });
}

export async function zipBinaryFiles(files: SplitPdfPage[]): Promise<Uint8Array> {
  const archive = new JSZip();

  files.forEach((file) => {
    archive.file(file.fileName, file.bytes);
  });

  return archive.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: {
      level: 9,
    },
  });
}
