import { describe, expect, it } from "vitest";

import { buildAiRequestPayload, resolveWorkingText } from "@/lib/workspace";
import { getToolCardByKey } from "@/lib/tool-catalog";

const sampleDocument = {
  fileName: "report.pdf",
  kind: "pdf" as const,
  mimeType: "application/pdf",
  byteSize: 1024,
  pageCount: 4,
  sourceText: "Original uploaded text",
  convertedText: "Converted text from the latest upload",
};

describe("workspace helpers", () => {
  it("prefers the active editor text over the original converted text", () => {
    expect(resolveWorkingText(sampleDocument, "Updated working copy")).toBe("Updated working copy");
    expect(resolveWorkingText(sampleDocument, "")).toBe("Converted text from the latest upload");
  });

  it("builds AI payloads from the active converted file", () => {
    const payload = buildAiRequestPayload(sampleDocument, "New active draft", "rewrite", "Translate this");

    expect(payload.fileName).toBe("report.pdf");
    expect(payload.kind).toBe("pdf");
    expect(payload.text).toBe("New active draft");
    expect(payload.mode).toBe("rewrite");
    expect(payload.instruction).toBe("Translate this");
  });

  it("includes the requested tool cards", () => {
    expect(getToolCardByKey("merge-pdf")?.label).toBe("Merge PDF");
    expect(getToolCardByKey("compress-images")?.category).toBe("Image");
  });
});
