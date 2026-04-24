import { expect, test } from "@playwright/test";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { readFile } from "node:fs/promises";

async function createMarkdownBuffer() {
  return Buffer.from("# Draft Title\n\n\nFirst   paragraph.\n\nSecond line.\n", "utf8");
}

async function createPdfBuffer() {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  page.drawText("Hello annotation world", {
    x: 72,
    y: 720,
    size: 24,
    font,
  });

  return Buffer.from(await pdf.save());
}

function createSvgBuffer() {
  return Buffer.from(
    `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="800" viewBox="0 0 1400 800">
  <rect width="100%" height="100%" fill="white" />
  <text x="80" y="180" font-family="Arial, sans-serif" font-size="72" fill="black">OCR browser test</text>
  <text x="80" y="320" font-family="Arial, sans-serif" font-size="72" fill="black">recognized text</text>
</svg>`,
    "utf8",
  );
}

async function uploadFile(page: Parameters<typeof test>[0]["page"], selector: string, fileName: string, mimeType: string, buffer: Buffer) {
  await page.locator(selector).setInputFiles({
    name: fileName,
    mimeType,
    buffer,
  });
}

async function waitForDownload(page: Parameters<typeof test>[0]["page"], trigger: () => Promise<void> | void) {
  const downloadPromise = page.waitForEvent("download");
  await trigger();
  return downloadPromise;
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    (window as Window & { __DRAFTR_E2E__?: { ocrText?: string } }).__DRAFTR_E2E__ = {
      ocrText: "OCR browser test\nrecognized text",
    };
  });
});

test("uploads markdown, converts it, and exports normalized markdown", async ({ page }) => {
  await page.goto("/");

  await uploadFile(
    page,
    '[data-testid="magic-upload-input"]',
    "draft.md",
    "text/markdown",
    await createMarkdownBuffer(),
  );

  await expect(page.getByText("Conversion workspace")).toBeVisible();
  await expect(page.getByTestId("workspace-header-file-name")).toHaveText("draft.md");

  const editor = page.locator('textarea[placeholder="Write or refine markdown here. The preview updates live."]');
  await expect(editor).toHaveValue("# Draft Title\n\nFirst paragraph.\n\nSecond line.");

  const download = await waitForDownload(page, () => page.getByRole("button", { name: "Normalized MD" }).click());
  expect(download.suggestedFilename()).toBe("draft-converted.md");

  const downloadPath = await download.path();

  if (!downloadPath) {
    throw new Error("Expected a download path for the markdown export.");
  }

  const exportedMarkdown = await readFile(downloadPath, "utf8");
  expect(exportedMarkdown).toBe("# Draft Title\n\nFirst paragraph.\n\nSecond line.\n");
});

test("rewrites markdown through the AI sidebar and exports a PDF", async ({ page }) => {
  await page.goto("/");

  await uploadFile(
    page,
    '[data-testid="magic-upload-input"]',
    "rewrite.md",
    "text/markdown",
    Buffer.from("# Rewrite Draft\n\n\nA  paragraph with   extra spacing.\n", "utf8"),
  );

  await page.getByRole("button", { name: "AI insight" }).click();
  await expect(page.getByTestId("ai-sidebar-title")).toHaveText("AI Insight");

  await page.getByRole("button", { name: "Enhance file" }).click();

  const editor = page.locator('textarea[placeholder="Write or refine markdown here. The preview updates live."]');
  await expect(editor).toHaveValue("# Rewrite Draft\n\nA paragraph with extra spacing.");

  await page.getByRole("button", { name: "Close" }).click();

  const download = await waitForDownload(page, () => page.getByRole("button", { name: "Clean PDF" }).click());
  expect(download.suggestedFilename()).toBe("rewrite-converted.pdf");

  const downloadPath = await download.path();

  if (!downloadPath) {
    throw new Error("Expected a download path for the PDF export.");
  }

  const pdfBytes = await readFile(downloadPath);
  expect(pdfBytes.subarray(0, 4).toString("utf8")).toBe("%PDF");
});

test("runs OCR on an image through the tool suite", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Browse tools" }).click();
  await page.getByRole("button", { name: "OCR PDF" }).click();

  await uploadFile(
    page,
    '[data-testid="tool-suite-file-input"]',
    "ocr-browser-test.svg",
    "image/svg+xml",
    createSvgBuffer(),
  );

  const download = await waitForDownload(page, () => page.getByRole("button", { name: "Run tool" }).click());
  expect(download.suggestedFilename()).toBe("ocr-browser-test-converted.md");

  const downloadPath = await download.path();

  if (!downloadPath) {
    throw new Error("Expected a download path for the OCR markdown export.");
  }

  const recognizedText = await readFile(downloadPath, "utf8");
  expect(recognizedText).toContain("OCR browser test");
  expect(recognizedText).toContain("recognized text");
  await expect(page.getByText("OCR extracted text from ocr-browser-test.svg.")).toBeVisible();
});

test("allows PDF annotations on the rendered page", async ({ page }) => {
  await page.goto("/");

  await uploadFile(
    page,
    '[data-testid="magic-upload-input"]',
    "annotate.pdf",
    "application/pdf",
    await createPdfBuffer(),
  );

  await expect(page.getByTestId("pdf-editor-title")).toHaveText("Native PDF editor");

  const pdfSurface = page.getByTestId("pdf-page-surface");
  await expect(pdfSurface.getByText("Hello annotation world")).toBeVisible();

  const selectionCreated = await pdfSurface.evaluate((container, targetText) => {
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    let currentNode = walker.nextNode();

    while (currentNode) {
      const textNode = currentNode as Text;
      const textContent = textNode.textContent ?? "";
      const matchIndex = textContent.indexOf(targetText as string);

      if (matchIndex >= 0) {
        const range = document.createRange();
        range.setStart(textNode, matchIndex);
        range.setEnd(textNode, matchIndex + (targetText as string).length);

        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        container.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true }));
        return true;
      }

      currentNode = walker.nextNode();
    }

    return false;
  }, "Hello annotation world");

  if (!selectionCreated) {
    throw new Error("Unable to create a PDF text selection.");
  }

  await expect(page.getByText("Selected text:")).toBeVisible();
  await page.getByRole("button", { name: "Highlight" }).click();
  await page.getByRole("button", { name: "Save annotation" }).click();

  await expect(page.getByText("Annotation history")).toBeVisible();
  await expect(page.getByTestId("pdf-annotation-history").getByRole("button", { name: /highlight/i })).toBeVisible();
});