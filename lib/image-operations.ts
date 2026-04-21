import { stripFileExtension } from "@/lib/document";
import type { PDFPageProxy } from "pdfjs-dist";

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface ImageExportOptions {
  maxDimension?: number;
  quality?: number;
  mimeType?: "image/jpeg" | "image/webp";
}

function createObjectUrlImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Unable to load image: ${file.name}`));
    };

    image.src = objectUrl;
  });
}

export function calculateContainedSize(width: number, height: number, maxDimension: number): ImageDimensions {
  if (width <= 0 || height <= 0 || maxDimension <= 0) {
    return {
      width: Math.max(width, 0),
      height: Math.max(height, 0),
    };
  }

  const largestSide = Math.max(width, height);

  if (largestSide <= maxDimension) {
    return { width, height };
  }

  const scale = maxDimension / largestSide;

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export function buildImageOutputName(fileName: string, suffix: string, extension = "jpg"): string {
  return `${stripFileExtension(fileName)}-${suffix}.${extension}`;
}

async function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Unable to create image blob."));
          return;
        }

        resolve(blob);
      },
      mimeType,
      quality,
    );
  });
}

async function renderImageToCanvas(file: File, options: ImageExportOptions): Promise<HTMLCanvasElement> {
  const image = await createObjectUrlImage(file);
  const maxDimension = options.maxDimension ?? 2400;
  const dimensions = calculateContainedSize(image.naturalWidth, image.naturalHeight, maxDimension);
  const canvas = document.createElement("canvas");

  canvas.width = dimensions.width;
  canvas.height = dimensions.height;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Image canvas context is unavailable.");
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, dimensions.width, dimensions.height);

  return canvas;
}

export async function compressImageFile(file: File, options: ImageExportOptions = {}): Promise<Blob> {
  const canvas = await renderImageToCanvas(file, options);
  const mimeType = options.mimeType ?? "image/jpeg";
  const quality = options.quality ?? 0.82;

  return canvasToBlob(canvas, mimeType, quality);
}

export async function enhanceImageFile(file: File, options: ImageExportOptions = {}): Promise<Blob> {
  const image = await createObjectUrlImage(file);
  const maxDimension = options.maxDimension ?? 2800;
  const dimensions = calculateContainedSize(image.naturalWidth, image.naturalHeight, maxDimension);
  const canvas = document.createElement("canvas");

  canvas.width = dimensions.width;
  canvas.height = dimensions.height;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Image canvas context is unavailable.");
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.filter = "contrast(1.08) saturate(1.12) brightness(1.04)";
  context.drawImage(image, 0, 0, dimensions.width, dimensions.height);
  context.filter = "none";

  return canvasToBlob(canvas, options.mimeType ?? "image/jpeg", options.quality ?? 0.9);
}

function normalizeOcrText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function ocrCanvas(canvas: HTMLCanvasElement, language = "eng"): Promise<string> {
  const { recognize } = await import("tesseract.js");
  const result = await recognize(canvas, language);
  return normalizeOcrText(result.data.text ?? "");
}

export async function ocrImageFile(file: File, language = "eng"): Promise<string> {
  return ocrCanvas(await renderImageToCanvas(file, { maxDimension: 2200 }), language);
}

async function renderPdfPageToCanvas(page: PDFPageProxy, scale: number): Promise<HTMLCanvasElement> {
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("PDF canvas context is unavailable.");
  }

  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);

  await page.render({ canvasContext: context, canvas, viewport }).promise;

  return canvas;
}

export async function ocrPdfFile(file: File, language = "eng"): Promise<string> {
  const { getDocument } = await import("pdfjs-dist");
  const loadingTask = getDocument(new Uint8Array(await file.arrayBuffer()));
  const pdfDocument = await loadingTask.promise;
  const pageTexts: string[] = [];

  try {
    for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
      const page = await pdfDocument.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const directText = normalizeOcrText(
        textContent.items.map((item) => ("str" in item ? item.str ?? "" : "")).join(" "),
      );

      if (directText.length >= 40) {
        pageTexts.push(directText);
        continue;
      }

      const canvas = await renderPdfPageToCanvas(page, 2);
      pageTexts.push(await ocrCanvas(canvas, language));
    }
  } finally {
    await pdfDocument.destroy();
  }

  return normalizeOcrText(pageTexts.join("\n\n"));
}
