import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";

import { compressPdfFile, fillPdfFile, mergePdfFiles, splitPdfFile } from "@/lib/file-operations";

async function createSamplePdf(pageCount: number, withMetadata = false): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();

  if (withMetadata) {
    pdf.setTitle("Sample export");
    pdf.setAuthor("Draftr");
    pdf.setSubject("Compression regression test");
    pdf.setCreator("Draftr test suite");
    pdf.setProducer("pdf-lib");
    pdf.setKeywords(["compression", "pdf", "draftr"]);
  }


  for (let index = 0; index < pageCount; index += 1) {
    const page = pdf.addPage([420, 595]);
    page.drawText(`Page ${index + 1}`, {
      x: 48,
      y: 540,
      size: 18,
    });
  }

  return pdf.save();
}

describe("file operations", () => {
  it("merges multiple PDFs into a single document", async () => {
    const mergedBytes = await mergePdfFiles([await createSamplePdf(1), await createSamplePdf(2)]);
    const mergedDocument = await PDFDocument.load(mergedBytes);

    expect(mergedDocument.getPageCount()).toBe(3);
  });

  it("splits a PDF into single-page outputs", async () => {
    const sourceBytes = await createSamplePdf(3);
    const outputs = await splitPdfFile(sourceBytes, "sample.pdf");

    expect(outputs).toHaveLength(3);
    expect(outputs.map((output) => output.fileName)).toEqual([
      "sample-page-01.pdf",
      "sample-page-02.pdf",
      "sample-page-03.pdf",
    ]);

    for (const output of outputs) {
      const pdf = await PDFDocument.load(output.bytes);
      expect(pdf.getPageCount()).toBe(1);
    }
  });

  it("compresses a PDF without changing its page count", async () => {
    const sourceBytes = await createSamplePdf(2, true);
    const compressedBytes = await compressPdfFile(sourceBytes);
    const compressedDocument = await PDFDocument.load(compressedBytes);

    expect(compressedDocument.getPageCount()).toBe(2);
    expect(compressedBytes.length).toBeLessThan(sourceBytes.length);
  });

  it("fills a PDF with overlay text", async () => {
    const sourceBytes = await createSamplePdf(2);
    const filledBytes = await fillPdfFile(sourceBytes, [
      {
        pageNumber: 2,
        text: "Approved",
        x: 96,
        y: 120,
        size: 14,
      },
    ]);
    const filledDocument = await PDFDocument.load(filledBytes);

    expect(filledDocument.getPageCount()).toBe(2);
  });
});
